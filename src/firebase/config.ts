import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore'
import type { FirebasePublicConfig } from './public-config'
export { readFirebaseConfig } from './public-config'
export type { FirebasePublicConfig } from './public-config'

export type FirebaseHandles = {
  app: FirebaseApp
  auth: Auth
  db: Firestore
}

const emulatorApps = new Set<string>()

export function initializeFirebase(config: FirebasePublicConfig, appName = '[DEFAULT]'): FirebaseHandles {
  const app = getApps().find(candidate => candidate.name === appName) ?? initializeApp(config, appName)
  const auth = getAuth(app)
  const db = getFirestore(app)
  const useEmulators = import.meta.env.DEV && import.meta.env.VITE_FIREBASE_USE_EMULATORS === 'true'

  if (useEmulators && !emulatorApps.has(app.name)) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
    connectFirestoreEmulator(db, '127.0.0.1', 8080)
    emulatorApps.add(app.name)
  }

  return { app, auth, db }
}
