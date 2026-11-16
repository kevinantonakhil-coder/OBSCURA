import { deleteApp } from 'firebase/app'
import { afterEach, describe, expect, it } from 'vitest'
import { initializeFirebase, readFirebaseConfig } from '../../src/firebase/config'

const firebaseEnv = {
  VITE_FIREBASE_API_KEY: 'public-api-key',
  VITE_FIREBASE_AUTH_DOMAIN: 'obscura-demo.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'obscura-demo',
  VITE_FIREBASE_APP_ID: '1:123456789:web:abcdef',
}

const appsToDelete: ReturnType<typeof initializeFirebase>[] = []

afterEach(async () => {
  await Promise.all(appsToDelete.splice(0).map(({ app }) => deleteApp(app)))
})

describe('Firebase configuration', () => {
  it('keeps Firebase disabled when no public configuration is supplied', () => {
    expect(readFirebaseConfig({})).toBeNull()
  })

  it('rejects partial Firebase configuration with a useful missing-field message', () => {
    expect(() => readFirebaseConfig({ VITE_FIREBASE_PROJECT_ID: 'obscura-demo' }))
      .toThrow(/VITE_FIREBASE_API_KEY.*VITE_FIREBASE_AUTH_DOMAIN.*VITE_FIREBASE_APP_ID/)
  })

  it('initializes Auth and Firestore from complete public configuration', () => {
    const config = readFirebaseConfig(firebaseEnv)
    expect(config).not.toBeNull()

    const handles = initializeFirebase(config!, 'obscura-config-test')
    appsToDelete.push(handles)

    expect(handles.app.options.projectId).toBe('obscura-demo')
    expect(handles.auth.app).toBe(handles.app)
    expect(handles.db.app).toBe(handles.app)
  })
})
