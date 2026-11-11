// The package's test runner (generated: tools/lib/dispatcher.js; docs:
// haiccing/package-docs-template, test/README.md). A test set, from this
// point the whole lifecycle, through the package's dispatcher (main.js:
// each unit its own process, its results read from brittle's summary).
//   bare test/run.js [<set>]   a set (validate by default): each unit's report
//       shown, the result last (one line), exit 0 passed, 1 failed, 2 no such set
import process from '../modules/node_modules/bare-process/index.js'
import { run } from '../main.js'

const set = process.argv.slice(2).find(a => !a.startsWith('-')) ?? 'validate'
let r
try { r = await run(`/test/${set}`, { print: line => console.log(line) }) } catch (err) { console.error(err.message); process.exit(2) }
console.log(JSON.stringify(r))
process.exit(r.ok ? 0 : 1)
