import type { CheckResult, Finding } from './demo'

const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

function defang(value: string) {
  return value.trim().toLowerCase().replace(/\[\.\]|\(\.\)|\s+dot\s+/gi, '.')
}

function domainOf(value: string) {
  const cleaned = defang(value).replace(/^[a-z]+:\/\//i, '').split(/[\s/?#]/, 1)[0].replace(/:\d+$/, '').replace(/\.$/, '')
  return cleaned.includes('@') ? cleaned.split('@').pop() ?? '' : cleaned
}

export function analyzeGhost(mode: 'domain' | 'email', input: string): Finding {
  const checks: CheckResult[] = []
  const add = (title: string, state: CheckResult['state'], detail: string, source = 'Local deterministic rule') => checks.push({ id: makeId('CHK'), title, state, detail, source })
  const original = input.trim()
  const domain = domainOf(original)

  if (mode === 'domain') {
    const isDomain = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(domain)
    add('Indicator format', isDomain ? 'PASS' : 'UNKNOWN', isDomain ? 'The supplied text resembles a domain name after defanging normalization.' : 'A domain could not be confidently parsed from the supplied text.')
    const labels = domain.split('.').filter(Boolean)
    const hasPunycode = labels.some(label => label.startsWith('xn--'))
    add('Internationalized label', hasPunycode ? 'SIGNAL' : labels.length ? 'PASS' : 'UNKNOWN', hasPunycode ? 'A punycode label is present; review the rendered form carefully.' : labels.length ? 'No punycode label was found in the parsed text.' : 'No parsed domain is available.')
    const manyLabels = labels.length > 4
    add('Subdomain depth', manyLabels ? 'SIGNAL' : labels.length ? 'PASS' : 'UNKNOWN', manyLabels ? `The string contains ${labels.length} labels; confirm whether the depth is expected.` : labels.length ? `The string contains ${labels.length} labels.` : 'No parsed labels are available.')
    const brandLike = /\b(login|secure|verify|account|support|billing|invoice|obscura)\b/i.test(domain.replace(/[.-]/g, ' '))
    add('Sensitive wording', brandLike ? 'SIGNAL' : labels.length ? 'PASS' : 'UNKNOWN', brandLike ? 'A common trust or account-related term appears in the supplied label. This is not proof of impersonation.' : labels.length ? 'No configured demonstration keywords were found.' : 'No parsed domain is available.')
    add('Registration and reputation', 'UNAVAILABLE', 'No DNS, registration, reputation, or URL lookup was performed.')
    add('Network safety', 'PASS', 'The indicator was examined as text only. No link was opened and no request was sent.', 'OBSCURA safety boundary')
  } else {
    const lines = original.split(/\r?\n/)
    const from = lines.find(line => /^from:/i.test(line))?.split(':').slice(1).join(':').trim() ?? ''
    const returnPath = lines.find(line => /^return-path:/i.test(line))?.split(':').slice(1).join(':').trim() ?? ''
    const fromDomain = domainOf(from)
    const returnDomain = domainOf(returnPath)
    const aligned = Boolean(fromDomain && returnDomain && fromDomain === returnDomain)
    add('From and Return-Path', fromDomain && returnDomain ? aligned ? 'PASS' : 'SIGNAL' : 'UNKNOWN', fromDomain && returnDomain ? aligned ? 'The parsed sender domains match in the supplied text.' : 'The parsed sender domains differ. Forwarders and mailing services can explain this; corroborate context.' : 'Both fields are needed to compare alignment.')
    const authResults = lines.filter(line => /^(authentication-results|received-spf):/i.test(line)).join(' ').toLowerCase()
    const failedAuth = /\b(spf|dkim|dmarc)=(fail|softfail|none|permerror|temperror)\b/.test(authResults)
    const hasAuth = /\b(spf|dkim|dmarc)=/.test(authResults)
    add('Authentication text', failedAuth ? 'SIGNAL' : hasAuth ? 'PASS' : 'UNKNOWN', failedAuth ? 'A failure-like authentication token appears in the supplied header text; it is not independently verified.' : hasAuth ? 'Authentication result text is present but was not validated against a mail provider.' : 'No recognizable authentication result was supplied.')
    const replyTo = lines.find(line => /^reply-to:/i.test(line))?.split(':').slice(1).join(':').trim() ?? ''
    const replyDomain = domainOf(replyTo)
    add('Reply-To alignment', replyDomain && fromDomain ? replyDomain === fromDomain ? 'PASS' : 'SIGNAL' : 'UNKNOWN', replyDomain && fromDomain ? replyDomain === fromDomain ? 'The parsed Reply-To and From domains match.' : 'The parsed Reply-To and From domains differ; legitimate systems can also use separate reply services.' : 'A Reply-To and From value were not both available.')
    add('Link and attachment handling', 'UNAVAILABLE', 'Links and attachments are not opened, fetched, or executed. This demo does not inspect attachment contents.', 'OBSCURA safety boundary')
    add('Header authenticity', 'UNKNOWN', 'Pasted headers are untrusted text and their origin cannot be established locally.')
  }

  const signalCount = checks.filter(check => check.state === 'SIGNAL').length
  const priority: Finding['priority'] = signalCount > 1 ? 'HIGH' : signalCount === 1 ? 'REVIEW' : 'INFO'
  const title = mode === 'domain' ? 'Local domain-text review' : 'Local email-header review'
  return { id: makeId('F'), engine: 'GHOST', title, createdAt: new Date().toISOString(), priority, summary: `${signalCount} rule signal${signalCount === 1 ? '' : 's'} found in supplied text; external reputation and delivery context are unavailable. Priority is for review, not a probability.`, inputLabel: original.length > 140 ? `${original.slice(0, 140)}…` : original, checks }
}

const MAX_IMAGE_BYTES = 25 * 1024 * 1024
const MAX_HEADER_SCAN = 4 * 1024 * 1024

function fourCC(bytes: Uint8Array, offset: number) {
  return String.fromCharCode(bytes[offset] ?? 0, bytes[offset + 1] ?? 0, bytes[offset + 2] ?? 0, bytes[offset + 3] ?? 0)
}

function inspectPng(bytes: Uint8Array) {
  if (bytes.length < 24 || ![137, 80, 78, 71, 13, 10, 26, 10].every((x, i) => bytes[i] === x)) return null
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const width = view.getUint32(16)
  const height = view.getUint32(20)
  let metadata = false
  let offset = 8
  while (offset + 12 <= Math.min(bytes.length, MAX_HEADER_SCAN)) {
    const length = view.getUint32(offset)
    const name = fourCC(bytes, offset + 4)
    if (['eXIf', 'tEXt', 'iTXt', 'zTXt', 'pHYs'].includes(name)) metadata = true
    if (name === 'IEND' || length > MAX_HEADER_SCAN || offset + 12 + length > bytes.length) break
    offset += 12 + length
  }
  return { format: 'PNG', width, height, metadata }
}

function inspectJpeg(bytes: Uint8Array) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null
  let offset = 2
  let metadata = false
  let dimensions: { width: number; height: number } | undefined
  const limit = Math.min(bytes.length - 4, MAX_HEADER_SCAN)
  while (offset < limit) {
    if (bytes[offset] !== 0xff) { offset++; continue }
    while (bytes[offset] === 0xff) offset++
    const marker = bytes[offset++]
    if (marker === 0xd9 || marker === 0xda || offset + 2 > bytes.length) break
    const length = (bytes[offset] << 8) | bytes[offset + 1]
    if (length < 2 || offset + length > bytes.length) break
    if (marker === 0xe1 && fourCC(bytes, offset + 2) === 'Exif') metadata = true
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker) && length >= 7) {
      dimensions = { height: (bytes[offset + 3] << 8) | bytes[offset + 4], width: (bytes[offset + 5] << 8) | bytes[offset + 6] }
    }
    offset += length
  }
  return { format: 'JPEG', ...dimensions, metadata }
}

export async function analyzeMirage(file: File): Promise<Finding> {
  if (file.size > MAX_IMAGE_BYTES) throw new Error('This demo only reads image files up to 25 MB.')
  if (!file.size) throw new Error('The selected file is empty.')
  const bytes = new Uint8Array(await file.arrayBuffer())
  const image = inspectPng(bytes) ?? inspectJpeg(bytes)
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  const extensionMatches = image ? image.format.toLowerCase() === extension || (image.format === 'JPEG' && ['jpg', 'jpeg'].includes(extension)) : false
  let digest = ''
  let digestError = ''
  try {
    if (!globalThis.crypto?.subtle) throw new Error('Secure browser hashing is unavailable.')
    const hash = await globalThis.crypto.subtle.digest('SHA-256', bytes)
    digest = Array.from(new Uint8Array(hash), value => value.toString(16).padStart(2, '0')).join('')
  } catch (error) {
    digestError = error instanceof Error ? error.message : 'Hashing is unavailable in this browser.'
  }
  const checks: CheckResult[] = [
    { id: makeId('CHK'), title: 'File signature', state: image ? 'PASS' : 'SIGNAL', detail: image ? `${image.format} signature recognized from the file header.` : 'Only basic PNG and JPEG signatures are supported in this local demo.', source: 'Local file-header check' },
    { id: makeId('CHK'), title: 'Extension and signature', state: image ? extensionMatches ? 'PASS' : 'SIGNAL' : 'UNKNOWN', detail: image ? extensionMatches ? 'The file extension matches the recognized image signature.' : `The extension .${extension || '(none)'} does not match the recognized ${image.format} signature.` : 'A format comparison is unavailable for unsupported files.', source: 'Local file name and header' },
    { id: makeId('CHK'), title: 'Image dimensions', state: image?.width && image.height ? 'PASS' : 'UNKNOWN', detail: image?.width && image.height ? `${image.width} × ${image.height} pixels read from the image header.` : 'Dimensions were not available within the bounded header scan.', source: 'Local image-header check' },
    { id: makeId('CHK'), title: 'Metadata presence', state: image ? image.metadata ? 'PASS' : 'UNKNOWN' : 'UNKNOWN', detail: image ? image.metadata ? 'A supported metadata chunk was found. Metadata can be edited and does not establish provenance.' : 'No supported metadata chunk was found in the scanned header; this does not indicate manipulation.' : 'Metadata scan was not available for this format.', source: 'Bounded local header scan' },
    { id: makeId('CHK'), title: 'SHA-256 digest', state: digest ? 'PASS' : 'UNAVAILABLE', detail: digest ? 'A SHA-256 digest was calculated locally for this selected file. It is not a comparison to a trusted reference.' : digestError, source: 'Web Crypto · local browser' },
    { id: makeId('CHK'), title: 'Authenticity and provenance', state: 'UNAVAILABLE', detail: 'This demo cannot establish who created the image, whether it was edited, or whether it depicts a real event.', source: 'No provenance service or reference record connected' },
  ]
  const needsReview = checks.some(check => check.state === 'SIGNAL')
  return { id: makeId('F'), engine: 'MIRAGE', title: 'Local image metadata review', createdAt: new Date().toISOString(), priority: needsReview ? 'REVIEW' : 'INFO', summary: 'Local format, header metadata, and digest checks only. These checks cannot determine whether an image is genuine or manipulated.', inputLabel: file.name, checks, digest: digest || undefined }
}
