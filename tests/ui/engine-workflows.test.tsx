import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Fingerprint, Image, LockKeyhole, MailWarning } from 'lucide-react'
import type { CaseRecord } from '../../src/demo'
import { AdvancedEngineWorkflow, EngineWorkflow } from '../../src/DemoPages'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const demoCase: CaseRecord = {
  id: 'case-demo-1', title: 'Synthetic training case', purpose: 'Demo only', leadEngine: 'UNASSIGNED',
  status: 'OPEN', priority: 'INFO', createdAt: '2026-11-15T00:00:00.000Z', updatedAt: '2026-11-15T00:00:00.000Z',
  findings: [], evidence: [], notes: [], seeded: false,
}

let root: Root | undefined
let host: HTMLDivElement | undefined
afterEach(() => {
  if (root) act(() => root?.unmount())
  host?.remove()
  root = undefined
  host = undefined
})

function mount(element: React.ReactElement) {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  act(() => root?.render(element))
  return host
}

function clickButton(page: HTMLElement, text: string) {
  const button = [...page.querySelectorAll('button')].find(item => item.textContent?.includes(text))
  expect(button, `button containing "${text}"`).toBeTruthy()
  act(() => button?.click())
}

function setField(page: HTMLElement, id: string, value: string) {
  const field = page.querySelector<HTMLInputElement | HTMLTextAreaElement>(`#${id}`)
  expect(field, `field #${id}`).toBeTruthy()
  act(() => {
    const prototype = field instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype
    Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(field, value)
    field?.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function waitForText(page: HTMLElement, text: string) {
  await waitForCondition(() => page.textContent?.includes(text) ?? false)
}

async function waitForCondition(condition: () => boolean) {
  await act(async () => {
    const deadline = Date.now() + 2000
    while (!condition() && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 5))
  })
}

describe('four engine case workflows', () => {
  it('runs GHOST sample checks and saves the result to a case', async () => {
    const onSave = vi.fn()
    const notify = vi.fn()
    const page = mount(<EngineWorkflow engine={{ id: 'ghost', name: 'GHOST', title: 'Threat intelligence', desc: '', code: '09', icon: MailWarning, color: 'amber' }} cases={[demoCase]} role="Analyst" onSave={onSave} notify={notify}/> )
    clickButton(page, 'Load safe sample')
    clickButton(page, 'Run local text checks')
    await waitForText(page, 'Local domain-text review')
    expect(page.textContent).toContain('Local domain-text review')
    clickButton(page, 'Save result')
    await waitForCondition(() => onSave.mock.calls.length === 1)
    expect(onSave).toHaveBeenCalledWith('case-demo-1', expect.objectContaining({ engine: 'GHOST' }))
    expect(notify).toHaveBeenCalled()
  })

  it('runs the bundled MIRAGE image sample and saves only its finding', async () => {
    const onSave = vi.fn()
    const page = mount(<EngineWorkflow engine={{ id: 'mirage', name: 'MIRAGE', title: 'Media forensics', desc: '', code: '10', icon: Image, color: 'mint' }} cases={[demoCase]} role="Analyst" onSave={onSave} notify={vi.fn()}/> )
    clickButton(page, 'Use bundled synthetic image sample')
    clickButton(page, 'Inspect file locally')
    await waitForText(page, 'Local image metadata review')
    clickButton(page, 'Save result')
    await waitForCondition(() => onSave.mock.calls.length === 1)
    expect(onSave).toHaveBeenCalledWith('case-demo-1', expect.objectContaining({ engine: 'MIRAGE' }))
  })

  it('runs PHANTOM text cues without identifying a person and saves the case result', async () => {
    const onSave = vi.fn()
    const page = mount(<AdvancedEngineWorkflow engine={{ id: 'phantom', name: 'PHANTOM', title: 'Impersonation signals', desc: '', code: '12', icon: Fingerprint, color: 'violet' }} cases={[demoCase]} role="Analyst" onSave={onSave} notify={vi.fn()}/> )
    setField(page, 'phantom-brand', 'Northstar')
    setField(page, 'phantom-text', '@northstar_support')
    clickButton(page, 'Run local demonstration')
    await waitForText(page, 'Text-only impersonation indicators')
    expect(page.textContent).toMatch(/never identifies a person/i)
    clickButton(page, 'Save summary')
    await waitForCondition(() => onSave.mock.calls.length === 1)
    expect(onSave).toHaveBeenCalledWith('case-demo-1', expect.objectContaining({ engine: 'PHANTOM' }))
  })

  it('runs the QUANTUM toy proof and saves the explicitly educational result', async () => {
    const onSave = vi.fn()
    const page = mount(<AdvancedEngineWorkflow engine={{ id: 'quantum', name: 'QUANTUM', title: 'Cryptographic proof', desc: '', code: '13', icon: LockKeyhole, color: 'blue' }} cases={[demoCase]} role="Analyst" onSave={onSave} notify={vi.fn()}/> )
    clickButton(page, 'ZK concept')
    clickButton(page, 'Run local demonstration')
    await waitForText(page, 'Toy zero-knowledge protocol demonstration')
    expect(page.textContent).toMatch(/not secure/i)
    expect(page.textContent).toContain('Toy zero-knowledge protocol demonstration')
    clickButton(page, 'Save summary')
    await waitForCondition(() => onSave.mock.calls.length === 1)
    expect(onSave).toHaveBeenCalledWith('case-demo-1', expect.objectContaining({ engine: 'QUANTUM' }))
  })
})
