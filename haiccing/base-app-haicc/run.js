// The haicc command, as a program: run with Bare from its bundle
// (bare base-app-haicc.bundle /run <argument>...: what the platform's haicc
// starts) or from the package's folder (bare run.js <argument>...).
//   <argument>...   the haicc command line: haicc --help says its forms
// The environment as it is (HAICC_HOME, HAICC_WORK, HAICC_TIMEOUT,
// HAICC_RAW, HAICC_OUTPUT, HAICC_WIDTH); the Bare running this is the one
// the boot is run with. Its exit code: the command line's.
// Our modules from the package's own modules/ (no node_modules above them here).
import process from './modules/node_modules/bare-process/index.js'
import { main } from './modules/pear-full-square/haicc-base-app/index.js'

// The arguments: after the script. Started through the dispatcher (bare
// <bundle> /run ..., bare main.js /run ...), the entry's own name comes
// first and is not one of them; only that one is taken off (a node may be
// named run: haicc /run service/start).
const script = process.argv[1] ?? ''
const args = process.argv.slice(/\.(js|bundle)$/.test(script) ? 2 : 1)
if (!/(^|\/)run\.js$/.test(script) && args[0] === '/run') args.shift()
process.exit(await main(args, { env: process.env, bare: process.execPath }))
