import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createDemoState } from '../../src/demo'
import { WorkspacePage } from '../../src/DemoPages'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

let root: Root | undefined
let host: HTMLDivElement | undefined
afterEach(() => {
  if (root) act(() => root?.unmount())
  host?.remove()
  root = undefined
  host = undefined
  vi.restoreAllMocks()
})

function renderPage(page: string, overrides: Record<string, unknown> = {}) {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  const common = {
    page,
    title: page === 'governance' ? 'Data governance' : page === 'reports' ? 'Reports' : 'Settings',
    state: createDemoState(),
    onUpdate: vi.fn(), onDelete: vi.fn(), onSetRole: vi.fn(), onSetConnector: vi.fn(),
    onSetPreference: vi.fn(), onReset: vi.fn(), onRestore: vi.fn(), onLog: vi.fn(), notify: vi.fn(),
    ...overrides,
  }
  act(() => root?.render(<WorkspacePage {...common}/>))
  return { page: host, callbacks: common }
}

describe('governance and report controls', () => {
  it('shows the local-demo safety boundaries and data limits', () => {
    const { page } = renderPage('governance')
    expect(page.textContent).toMatch(/browser storage limits/i)
    expect(page.textContent).toMatch(/no suspicious URL visits or DNS lookups/i)
    expect(page.textContent).toMatch(/no attachment or script execution/i)
    expect(page.textContent).toMatch(/no biometric identity matching/i)
    expect(page.textContent).toMatch(/human review required/i)
  })

  it('applies the reduced-motion preference through its switch control', () => {
    const state = createDemoState()
    const onSetPreference = vi.fn()
    const { page } = renderPage('settings', { state, onSetPreference })
    const reducedMotion = [...page.querySelectorAll('[role="switch"]')].find(item => item.textContent?.includes('Reduced motion'))
    expect(reducedMotion).toBeTruthy()
    act(() => reducedMotion?.dispatchEvent(new MouseEvent('click', { bubbles: true })))
    expect(onSetPreference).toHaveBeenCalledWith('reducedMotion', !state.preferences.reducedMotion)
  })

  it('exports a clearly labeled demo report on user action', () => {
    const createObjectURL = vi.fn(() => 'blob:obscura-test')
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const onLog = vi.fn()
    const notify = vi.fn()
    const { page } = renderPage('reports', { onLog, notify })
    const button = [...page.querySelectorAll('button')].find(item => item.textContent?.includes('Investigation summary'))
    expect(button).toBeTruthy()
    act(() => button?.click())
    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(anchorClick).toHaveBeenCalledOnce()
    expect(onLog).toHaveBeenCalledWith('REPORT_EXPORTED', expect.stringContaining('exported by user action'))
    expect(notify).toHaveBeenCalledWith(expect.stringContaining('downloaded as a JSON demo report'))
  })
})
