export type FirebasePublicConfig = {
  apiKey: string
  authDomain: string
  projectId: string
  appId: string
}

type FirebaseEnvironment = Record<string, string | undefined>

const requiredKeys = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
] as const

export function readFirebaseConfig(env: FirebaseEnvironment): FirebasePublicConfig | null {
  const values = Object.fromEntries(requiredKeys.map(key => [key, env[key]?.trim() ?? ''])) as Record<(typeof requiredKeys)[number], string>
  const missing = requiredKeys.filter(key => !values[key])
  if (missing.length === requiredKeys.length) return null
  if (missing.length) {
    throw new Error(`Firebase configuration is incomplete. Add ${missing.join(', ')} or remove all Firebase configuration to use the local demo.`)
  }

  return {
    apiKey: values.VITE_FIREBASE_API_KEY,
    authDomain: values.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: values.VITE_FIREBASE_PROJECT_ID,
    appId: values.VITE_FIREBASE_APP_ID,
  }
}
