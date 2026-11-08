// The test sets (test/<set>.json) and the tests' categories (test/<test>/test.json) agree.
// Bare's modules as the package carries them (a named test sits outside
// modules/: no node_modules above it to find them by name).
import fs from '../../modules/node_modules/bare-fs/index.js'
import path from '../../modules/node_modules/bare-path/index.js'
import process from '../../modules/node_modules/bare-process/index.js'
import { fileURLToPath } from '../../modules/node_modules/bare-url/index.js'

const tests_ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const at = f => path.join(tests_, f)
const json = f => JSON.parse(fs.readFileSync(f, "utf8"))
const sets = Object.fromEntries(fs.readdirSync(tests_).filter(f => f.endsWith(".json")).map(f => [f.slice(0, -5), json(at(f))]))
const tests = fs.readdirSync(tests_).filter(d => fs.statSync(at(d)).isDirectory())
let n = 0, pass = 0
const check = (c, what) => { n++; if (c) pass++; console.log(`${c ? "ok" : "not ok"} ${n} - ${what}`) }
for (const [s, def] of Object.entries(sets)) for (const t of def.tests || []) check(fs.existsSync(at(path.join(t, "test"))) || fs.existsSync(at(path.join(t, "boot"))), `${s}: ${t} is there, with a test or a boot script`)
for (const t of tests) {
  const cats = fs.existsSync(at(path.join(t, "test.json"))) ? json(at(path.join(t, "test.json"))).categories || [] : []
  const named = Object.keys(sets).filter(s => (sets[s].tests || []).includes(t))
  check(named.length > 0, `${t}: in a set`)
  check(JSON.stringify([...cats].sort()) === JSON.stringify(named.sort()), `${t}: its categories (${cats.join(", ")}) are the sets that name it (${named.join(", ")})`)
}
console.log(`# tests ${n}\n# pass ${pass}`)
process.exit(pass === n ? 0 : 1)
