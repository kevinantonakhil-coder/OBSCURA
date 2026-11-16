import { doc, getDoc, type Firestore } from 'firebase/firestore'
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth'

export type AuthUserSummary = {
  uid: string
  email: string | null
  displayName: string | null
  emailVerified: boolean
}

export type AuthViewState =
  | { status: 'unconfigured' | 'signedOut' | 'checkingPilot'; user: null }
  | { status: 'unverified' | 'uninvited' | 'ready'; user: AuthUserSummary }
  | { status: 'error'; user: AuthUserSummary | null; error: string }

function summarizeUser(user: User): AuthUserSummary {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    emailVerified: user.emailVerified,
  }
}

export function classifyPilotAccess(user: AuthUserSummary | null, allowlisted: boolean): AuthViewState {
  if (!user) return { status: 'signedOut', user: null }
  if (!user.emailVerified) return { status: 'unverified', user }
  if (!allowlisted) return { status: 'uninvited', user }
  return { status: 'ready', user }
}

export function listenForPilotAccess(auth: Auth, db: Firestore, onState: (state: AuthViewState) => void) {
  let active = true
  let revision = 0
  const unsubscribe = onAuthStateChanged(auth, user => {
    const currentRevision = ++revision
    if (!user) {
      onState({ status: 'signedOut', user: null })
      return
    }

    const summary = summarizeUser(user)
    if (!summary.emailVerified) {
      onState({ status: 'unverified', user: summary })
      return
    }

    onState({ status: 'checkingPilot', user: null })
    void getDoc(doc(db, 'pilotAllowlist', user.uid)).then(snapshot => {
      if (active && revision === currentRevision) onState(classifyPilotAccess(summary, snapshot.exists()))
    }).catch(() => {
      if (active && revision === currentRevision) {
        onState({ status: 'error', user: summary, error: 'OBSCURA could not verify pilot access. Check the Firestore rules and connection, then retry.' })
      }
    })
  }, error => {
    if (active) onState({ status: 'error', user: null, error: error.message || 'Firebase sign-in could not be checked.' })
  })

  return () => {
    active = false
    revision += 1
    unsubscribe()
  }
}

export async function signInWithGoogle(auth: Auth): Promise<User> {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  const credential = await signInWithPopup(auth, provider)
  return credential.user
}

export function signOutUser(auth: Auth): Promise<void> {
  return signOut(auth)
}

export function authErrorMessage(error: unknown): string {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : ''
  if (code === 'auth/unauthorized-domain') return 'This website domain is not enabled for Firebase sign-in yet.'
  if (code === 'auth/popup-blocked') return 'Your browser blocked the Google sign-in window. Allow pop-ups for this site and try again.'
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return 'The sign-in window was closed before sign-in finished.'
  return 'Google sign-in did not complete. Try again or check the Firebase Authentication setup.'
}
