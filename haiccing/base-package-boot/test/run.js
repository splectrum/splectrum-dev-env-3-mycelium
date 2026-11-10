// The package's tests, by set: bare test/run.js [<set>] (validate by
// default). A set is test/<set>.json, { description, tests: [<name>...] };
// each test run as its own process, its entry test/<name>/run.js, in order.
// Exits 0 when every one passed, 1 when one failed, 2 for no such set.
import process from '../modules/node_modules/bare-process/index.js'
import { spawnSync } from '../modules/node_modules/bare-subprocess/index.js'
import os from '../modules/node_modules/bare-os/index.js'
import { readFileSync, existsSync } from '../modules/node_modules/bare-fs/index.js'
import { join, dirname } from '../modules/node_modules/bare-path/index.js'
import { fileURLToPath } from '../modules/node_modules/bare-url/index.js'

const here = dirname(fileURLToPath(import.meta.url))
const set = process.argv.slice(2).find(a => !a.startsWith('-')) ?? 'validate'
const file = join(here, `${set}.json`)
if (!existsSync(file)) { console.error(`no test set: ${set} (test/${set}.json)`); process.exit(2) }
const { tests } = JSON.parse(readFileSync(file, 'utf8'))
const failed = []
for (const name of tests) {
  console.log(`# test ${name}`)
  const r = spawnSync(os.execPath(), [join(here, name, 'run.js')], { stdio: 'inherit' })
  if (r.status !== 0) failed.push(name)
}
console.log(JSON.stringify({ set, tests, passed: tests.length - failed.length, failed }))
process.exit(failed.length ? 1 : 0)
