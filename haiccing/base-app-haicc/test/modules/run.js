// The test group's entry: bare test/modules/run.js. Every module the
// package carries, tested by its own tests, each module its own process,
// through the package's dispatcher. Exits 1 when one failed.
import process from '../../modules/node_modules/bare-process/index.js'
import { run } from '../../main.js'

const r = await run('/test/modules', { print: line => console.log(line) })
console.log(JSON.stringify(r))
process.exit(r.ok ? 0 : 1)
