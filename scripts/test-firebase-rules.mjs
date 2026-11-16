import { spawn, spawnSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'

const java = spawnSync('java', ['-version'], { encoding: 'utf8' })
const javaOutput = `${java.stdout ?? ''}\n${java.stderr ?? ''}`
const javaVersion = Number(javaOutput.match(/version\s+"?((?:1\.)?\d+)/i)?.[1]?.replace(/^1\./, ''))
if (java.error || !javaVersion || javaVersion < 21) {
  console.error('Firebase Emulator Suite needs Java 21 or newer. Install a Java 21+ runtime, reopen the terminal, then run `npm run test:rules` again.')
  process.exit(1)
}

const env = {
  ...process.env,
  XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME || path.join(process.cwd(), '.firebase-cli-config'),
}
const cacheRoot = path.join(process.cwd(), '.npm-cache', '_npx')
let firebaseEntry
if (existsSync(cacheRoot)) {
  for (const directory of readdirSync(cacheRoot, { withFileTypes: true }).filter(entry => entry.isDirectory())) {
    const candidate = path.join(cacheRoot, directory.name, 'node_modules', 'firebase-tools', 'lib', 'bin', 'firebase.js')
    if (existsSync(candidate)) { firebaseEntry = candidate; break }
  }
}

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const command = firebaseEntry
  ? { executable: process.execPath, args: [firebaseEntry, 'emulators:exec', '--project', 'demo-obscura', '--only', 'auth,firestore', 'npm test -- tests/firebase'], shell: false }
  : { executable: npmCommand, args: ['exec', '--yes', '--legacy-peer-deps', '--cache', '.npm-cache', '--package=firebase-tools@15.36.0', '--', 'firebase', 'emulators:exec', '--project', 'demo-obscura', '--only', 'auth,firestore', '"npm test -- tests/firebase"'], shell: process.platform === 'win32' }

const child = spawn(command.executable, command.args, { env, stdio: 'inherit', shell: command.shell })
child.on('error', error => {
  console.error('Could not start the Firebase Emulator Suite:', error.message)
  process.exitCode = 1
})
child.on('exit', (code, signal) => {
  if (signal) {
    console.error(`Firebase emulator command stopped by ${signal}.`)
    process.exitCode = 1
  } else {
    process.exitCode = code ?? 1
  }
})
