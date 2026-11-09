// haicc: HAICC's command line, the package's entry (its bundle's main).
//   bare base-package-haicc.bundle <command> [args] [--work=<level folder>]
//   version            this module's name and version
//   status             the level at a glance
//   read <uri>         what the level's repository holds at a URI
// The level's folder: --work, else the one this bundle runs in (the folder
// holding store/, up from the bundle: <work>/haicc/packages/<org>/). Prints one
// JSON value. Exit 0 done; 1 not done; 2 a bad call.
import process from 'bare-process'
import { dirname, resolve, join } from 'bare-path'
import { existsSync } from 'bare-fs'
import { commands } from './index.js'

const argv = process.argv.slice(2)
const flags = Object.fromEntries(argv.filter(a => a.startsWith('--')).map(a => { const i = a.indexOf('='); return i < 0 ? [a.slice(2), true] : [a.slice(2, i), a.slice(i + 1)] }))
const [command, ...args] = argv.filter(a => !a.startsWith('--'))

if (!commands[command]) {
  console.error(`haicc: ${command ? `no command '${command}'` : 'a command is needed'} (${Object.keys(commands).join(', ')})`)
  process.exitCode = 2
} else {
  let work = typeof flags.work === 'string' ? resolve(flags.work) : dirname(process.argv[1])
  if (typeof flags.work !== 'string') while (!existsSync(join(work, 'store')) && dirname(work) !== work) work = dirname(work)
  const r = await commands[command](args, { work })
  console.log(JSON.stringify(r.out, null, 2))
  process.exitCode = r.code
}
