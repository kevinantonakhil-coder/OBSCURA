import type { CheckResult, Finding } from './demo'

const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
const check = (title: string, state: CheckResult['state'], detail: string, source: string): CheckResult => ({ id: id('CHK'), title, state, detail, source })

export function analyzePhantom(brandName: string, observedText: string): Finding {
  const brand = brandName.trim().toLocaleLowerCase().replace(/[^a-z0-9]/g, '')
  const text = observedText.trim().toLocaleLowerCase()
  if (!brand || brand.length > 80) throw new Error('Enter a short brand or organization label (maximum 80 characters).')
  if (!text || text.length > 2000) throw new Error('Enter text copied from a public profile or page (maximum 2,000 characters).')
  const containsBrand = text.replace(/[^a-z0-9]/g, '').includes(brand)
  const accountCue = /(?:official|support|help|security|verify|billing|account|service|team|admin)/i.test(text)
  const numberSuffix = /(?:[_-]\d{2,}|\d{3,})/.test(text)
  const checks: CheckResult[] = [
    check('Brand term in supplied text', containsBrand ? 'SIGNAL' : 'UNKNOWN', containsBrand ? 'The supplied text contains the brand label. This alone does not show who controls the account.' : 'No exact normalized brand label was found in the supplied text.', 'Local text comparison'),
    check('Account-style wording', accountCue ? 'SIGNAL' : 'UNKNOWN', accountCue ? 'The text includes a common support or account term. Legitimate organizations use these terms too.' : 'No configured account-style terms were found.', 'Local lexical rule'),
    check('Numeric handle pattern', numberSuffix ? 'SIGNAL' : 'UNKNOWN', numberSuffix ? 'A numeric suffix or sequence appears in the text. This is a weak review cue, not an identity claim.' : 'No numeric suffix cue was found.', 'Local format rule'),
    check('Account ownership', 'UNAVAILABLE', 'No platform ownership, registration, or live profile was checked.', 'No platform connection'),
    check('Person identity', 'UNAVAILABLE', 'This tool does not identify people or compare faces. Review the source and account context directly.', 'Privacy boundary'),
  ]
  const signals = checks.filter(item => item.state === 'SIGNAL').length
  return { id: id('F'), engine: 'PHANTOM', title: 'Text-only impersonation indicators', createdAt: new Date().toISOString(), priority: signals > 1 ? 'HIGH' : signals ? 'REVIEW' : 'INFO', summary: `${signals} weak textual review cue${signals === 1 ? '' : 's'} found. Ownership and affiliation remain unverified; this is not an identity finding or probability.`, inputLabel: 'public text reviewed locally · input not retained', checks }
}

export async function analyzeQuantumHash(file: File): Promise<Finding> {
  if (file.size > 25 * 1024 * 1024) throw new Error('QUANTUM supports local hash demonstrations up to 25 MB.')
  if (!file.size) throw new Error('The selected file is empty.')
  if (!globalThis.crypto?.subtle) throw new Error('Secure browser hashing is unavailable in this browser context.')
  const digestBuffer = await globalThis.crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  const digest = Array.from(new Uint8Array(digestBuffer), value => value.toString(16).padStart(2, '0')).join('')
  return { id: id('F'), engine: 'QUANTUM', title: 'Local SHA-256 digest', createdAt: new Date().toISOString(), priority: 'INFO', summary: 'A SHA-256 digest was calculated in this browser. It is not a signature, proof of origin, or comparison to a trusted reference.', inputLabel: 'local file hashed · file name and bytes not retained', digest, checks: [
    check('SHA-256', 'PASS', `${digest.slice(0, 16)}… · full digest is available in the result.`, 'Web Crypto · local browser'),
    check('Trusted reference comparison', 'UNAVAILABLE', 'No external or trusted reference digest was supplied.', 'No reference source connected'),
    check('File persistence', 'PASS', 'The file was read in this browser and was not sent to OBSCURA or Firebase.', 'Local-only workflow'),
  ] }
}

export async function createSignatureDemo(message: string): Promise<Finding> {
  const input = message.trim()
  if (!input || input.length > 512) throw new Error('Enter a short demonstration message (1–512 characters).')
  if (!globalThis.crypto?.subtle) throw new Error('Secure browser cryptography is unavailable in this browser context.')
  const keyPair = await globalThis.crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify'])
  const bytes = new TextEncoder().encode(input)
  const signature = await globalThis.crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, keyPair.privateKey, bytes)
  const valid = await globalThis.crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, keyPair.publicKey, signature, bytes)
  return { id: id('F'), engine: 'QUANTUM', title: 'Ephemeral digital signature demonstration', createdAt: new Date().toISOString(), priority: valid ? 'INFO' : 'REVIEW', inputLabel: 'ephemeral signature demo · message and keys not retained', summary: 'A temporary ECDSA P-256 key signed and verified a short message in this browser. The private key was not exported or stored; this does not identify a real signer.', checks: [
    check('Signature verification', valid ? 'PASS' : 'SIGNAL', valid ? 'The signature verifies for this exact message and temporary public key.' : 'The generated signature did not verify.', 'Web Crypto · local browser'),
    check('Key persistence', 'PASS', 'The temporary private key was non-exportable and was discarded after this demonstration.', 'Ephemeral key handling'),
    check('Signer identity', 'UNAVAILABLE', 'A valid signature proves control of its matching private key only; no real-world identity was checked.', 'Identity boundary'),
  ] }
}

const P = 23
const Q = 11
const G = 2
const modPow = (base: number, exponent: number, modulus: number): number => {
  let result = 1
  let value = base % modulus
  let power = exponent
  while (power > 0) {
    if (power % 2 === 1) result = (result * value) % modulus
    value = (value * value) % modulus
    power = Math.floor(power / 2)
  }
  return result
}

export function runToyZkProof(secret: number, nonce: number, challenge: number, responseOverride?: number) {
  if (!Number.isInteger(secret) || secret < 1 || secret >= Q || !Number.isInteger(nonce) || nonce < 0 || nonce >= Q || !Number.isInteger(challenge) || challenge < 0 || challenge >= Q) {
    throw new Error('Secret, nonce, and challenge must be in the demonstration group range.')
  }
  const publicValue = modPow(G, secret, P)
  const commitment = modPow(G, nonce, P)
  const response = (nonce + challenge * secret) % Q
  const candidate = responseOverride ?? response
  const verified = Number.isInteger(candidate) && candidate >= 0 && candidate < Q && modPow(G, candidate, P) === (commitment * modPow(publicValue, challenge, P)) % P
  return { verified, publicValue, commitment, challenge, response, groupSize: Q, modulus: P, generator: G }
}

export function createToyZkFinding() {
  if (!globalThis.crypto?.getRandomValues) throw new Error('Secure random values are unavailable in this browser context.')
  const random = new Uint32Array(3)
  globalThis.crypto.getRandomValues(random)
  const proof = runToyZkProof(1 + random[0] % (Q - 1), random[1] % Q, random[2] % Q)
  return { id: id('F'), engine: 'QUANTUM' as const, title: 'Toy zero-knowledge protocol demonstration', createdAt: new Date().toISOString(), priority: proof.verified ? 'INFO' as const : 'REVIEW' as const, inputLabel: 'toy ZK demonstration · witness not retained', summary: 'A tiny educational Schnorr-style identification example verified in this browser. Its small group is deliberately insecure and must never protect real data.', checks: [
    check('Challenge response', proof.verified ? 'PASS' : 'SIGNAL', `Toy group: p=${proof.modulus}, q=${proof.groupSize}, g=${proof.generator}; public value=${proof.publicValue}; commitment=${proof.commitment}; challenge=${proof.challenge}; response=${proof.response}.`, 'Educational finite-group example'),
    check('Witness disclosure', 'PASS', 'The demonstration response was verified without writing the witness to the result record.', 'Local-only proof exercise'),
    check('Cryptographic security', 'UNAVAILABLE', 'This group is tiny and trivially brute-forceable. This is a concept demonstration, not a secure ZK proof system.', 'Not for production'),
  ] }
}
