import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FirebaseAccessPage } from '../../src/DemoPages'
import { classifyPilotAccess, type AuthViewState } from '../../src/firebase/auth'
import { createFirebaseRuntime } from '../../src/firebase/state'

const allowedUser = {
  uid: 'pilot-user-1',
  email: 'analyst@example.test',
  displayName: 'Demo Analyst',
  emailVerified: true,
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

describe('Firebase pilot access', () => {
  it('selects the isolated browser demo when Firebase is not configured', () => {
    expect(createFirebaseRuntime({})).toMatchObject({ mode: 'local-demo', handles: null, error: null })
  })

  it('keeps a signed-out user outside the workspace', () => {
    expect(classifyPilotAccess(null, false)).toEqual({ status: 'signedOut', user: null })
  })

  it('denies a signed-in user who is not on the pilot allowlist', () => {
    expect(classifyPilotAccess(allowedUser, false)).toEqual({ status: 'uninvited', user: allowedUser })
  })

  it('does not allow an unverified identity into the pilot', () => {
    expect(classifyPilotAccess({ ...allowedUser, emailVerified: false }, true).status).toBe('unverified')
  })

  it('allows only a verified, allowlisted identity through the authentication gate', () => {
    expect(classifyPilotAccess(allowedUser, true)).toEqual({ status: 'ready', user: allowedUser })
  })

  it('starts Google sign-in when the user chooses the sign-in button', () => {
    const onSignIn = vi.fn()
    const state: AuthViewState = { status: 'signedOut', user: null }
    const page = mount(<FirebaseAccessPage state={state} onSignIn={onSignIn} onSignOut={vi.fn()} onBack={vi.fn()}/>)
    const button = [...page.querySelectorAll('button')].find(item => item.textContent?.includes('Continue with Google'))
    expect(button).toBeTruthy()
    act(() => button?.click())
    expect(onSignIn).toHaveBeenCalledOnce()
  })

  it('does not offer sign-in when Firebase configuration is invalid', () => {
    const state: AuthViewState = { status: 'error', user: null, error: 'Firebase configuration is incomplete.' }
    const page = mount(<FirebaseAccessPage state={state} firebaseConfigured={false} onSignIn={vi.fn()} onSignOut={vi.fn()} onBack={vi.fn()}/>)
    expect(page.textContent).toMatch(/configuration is incomplete/i)
    expect([...page.querySelectorAll('button')].some(item => item.textContent?.includes('Continue with Google'))).toBe(false)
  })

  it('shows denied pilot access without offering workspace navigation', () => {
    const state: AuthViewState = { status: 'uninvited', user: allowedUser }
    const page = mount(<FirebaseAccessPage state={state} onSignIn={vi.fn()} onSignOut={vi.fn()} onBack={vi.fn()}/>)
    expect(page.textContent).toMatch(/not on the obscura pilot allowlist/i)
    expect([...page.querySelectorAll('button')].some(item => item.textContent?.match(/open workspace/i))).toBe(false)
  })

  it('lets an authenticated pilot member sign out', () => {
    const onSignOut = vi.fn()
    const state: AuthViewState = { status: 'ready', user: allowedUser }
    const page = mount(<FirebaseAccessPage state={state} onSignIn={vi.fn()} onSignOut={onSignOut} onBack={vi.fn()}/>)
    const button = [...page.querySelectorAll('button')].find(item => item.textContent?.includes('Sign out'))
    expect(button).toBeTruthy()
    act(() => button?.click())
    expect(onSignOut).toHaveBeenCalledOnce()
  })
})
