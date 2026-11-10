// haicc: HAICC's command line, the package's entry (its bundle's main): the
// terminal's input into the host's repository (index.js).
//   bare base-package-haicc.bundle [protocol] <action> <uri> [body] [--work=<host folder>]
//   bare base-package-haicc.bundle version     this module's name and version
// The host's folder: --work, else the one this bundle runs in (the folder
// holding store/, up from the bundle: <work>/mrepos/host/packages/<org>/).
// Prints the answer as JSON. Exit 0 done; 1 refused or failed; 2 a bad call.
import process from 'bare-process'
import { dirname, resolve, join } from 'bare-path'
import { existsSync } from 'bare-fs'
import { parse, send, version } from './index.js'

const argv = process.argv.slice(2)
const flags = Object.fromEntries(argv.filter(a => a.startsWith('--')).map(a => { const i = a.indexOf('='); return i < 0 ? [a.slice(2), true] : [a.slice(2, i), a.slice(i + 1)] }))
const args = argv.filter(a => !a.startsWith('--'))

if (args[0] === 'version' && args.length === 1) {
  console.log(JSON.stringify(version))
} else {
  const request = parse(args)
  if (request.error) {
    console.error(`haicc: ${request.error}`)
    process.exitCode = 2
  } else {
    let work = typeof flags.work === 'string' ? resolve(flags.work) : dirname(process.argv[1])
    if (typeof flags.work !== 'string') while (!existsSync(join(work, 'store')) && dirname(work) !== work) work = dirname(work)
    const r = await send({ work, ...request })
    console.log(JSON.stringify(r.out, null, 2))
    process.exitCode = r.code
  }
}
