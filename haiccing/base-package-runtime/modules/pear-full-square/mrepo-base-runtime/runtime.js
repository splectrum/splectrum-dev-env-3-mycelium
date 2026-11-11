// mrepo: a running repository's runtime, from the command line (the
// package's entry, its bundle's main):
//   bare base-package-mrepo.bundle start --work=<host folder>   the runtime,
//       in the foreground (`start` in the library detaches it); no log of
//       its own (a failure on stderr)
//   bare base-package-mrepo.bundle version
// Exit 0 done; 1 not done (the store held by another, no repository); 2 a bad call.
import process from 'bare-process'
import { resolve } from 'bare-path'
import { version, run } from './index.js'

const argv = process.argv.slice(2)
const flags = Object.fromEntries(argv.filter(a => a.startsWith('--')).map(a => { const i = a.indexOf('='); return i < 0 ? [a.slice(2), true] : [a.slice(2, i), a.slice(i + 1)] }))
const [command] = argv.filter(a => !a.startsWith('--'))

if (command === 'version') {
  console.log(JSON.stringify(version))
} else if (command === 'start' && typeof flags.work === 'string') {
  const work = resolve(flags.work)
  try {
    await run({ work })
    process.exit(0) // stopped: ended here (its signal handlers would hold the process open)
  } catch (err) {
    console.error(`mrepo: ${err.message}`)
    process.exit(1)
  }
} else {
  console.error(`mrepo: ${command ? `no command '${command}'` : 'a command is needed'} (start --work=<folder>, version)`)
  process.exitCode = 2
}
