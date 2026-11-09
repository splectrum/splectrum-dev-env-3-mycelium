// mycelium: a running repository's main thread, from the command line (the
// package's entry, its bundle's main):
//   bare base-package-mycelium.bundle start --work=<level folder>   the main
//       thread, in the foreground (`start` in the library detaches it); its
//       log in <work>/log/main.log
//   bare base-package-mycelium.bundle version
// Exit 0 done; 1 not done (the store held by another, no repository); 2 a bad call.
import process from 'bare-process'
import { resolve } from 'bare-path'
import { version, run, logTo } from './index.js'

const argv = process.argv.slice(2)
const flags = Object.fromEntries(argv.filter(a => a.startsWith('--')).map(a => { const i = a.indexOf('='); return i < 0 ? [a.slice(2), true] : [a.slice(2, i), a.slice(i + 1)] }))
const [command] = argv.filter(a => !a.startsWith('--'))

if (command === 'version') {
  console.log(JSON.stringify(version))
} else if (command === 'start' && typeof flags.work === 'string') {
  const work = resolve(flags.work)
  const log = logTo(work)
  try {
    await run({ work, say: log })
    process.exit(0) // stopped: ended here (its signal handlers would hold the process open)
  } catch (err) {
    log({ main: 'failed', error: err.message })
    console.error(`mycelium: ${err.message}`)
    process.exit(1)
  }
} else {
  console.error(`mycelium: ${command ? `no command '${command}'` : 'a command is needed'} (start --work=<folder>, version)`)
  process.exitCode = 2
}
