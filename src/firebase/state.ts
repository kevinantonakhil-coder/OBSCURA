import { initializeFirebase, readFirebaseConfig, type FirebaseHandles } from './config'

export type FirebaseRuntime =
  | { mode: 'local-demo'; handles: null; error: null }
  | { mode: 'firebase'; handles: FirebaseHandles; error: null }
  | { mode: 'configuration-error'; handles: null; error: string }

export function createFirebaseRuntime(env: Record<string, string | undefined>, appName = '[DEFAULT]'): FirebaseRuntime {
  try {
    const config = readFirebaseConfig(env)
    if (!config) return { mode: 'local-demo', handles: null, error: null }
    return { mode: 'firebase', handles: initializeFirebase(config, appName), error: null }
  } catch (error) {
    return {
      mode: 'configuration-error',
      handles: null,
      error: error instanceof Error ? error.message : 'Firebase configuration could not be read.',
    }
  }
}
