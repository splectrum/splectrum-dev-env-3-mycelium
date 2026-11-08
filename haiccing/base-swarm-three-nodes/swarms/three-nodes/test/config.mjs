// The swarm's configuration holds: each of its files there and JSON; one
// master; its codebase named, and each module of it in the package.
// (Against the platform's schemas once the platform carries them.)
import { readFileSync, existsSync } from '../../../modules/node_modules/bare-fs/index.js'
import { join, dirname } from '../../../modules/node_modules/bare-path/index.js'
import { fileURLToPath } from '../../../modules/node_modules/bare-url/index.js'

const swarm = join(dirname(fileURLToPath(import.meta.url)), '..')
const modules = join(swarm, '..', '..', 'modules')
const read = f => { try { return JSON.parse(readFileSync(join(swarm, f), 'utf8')) } catch { return null } }
let n = 0, pass = 0
const check = (c, what) => { n++; if (c) pass++; console.log(`${c ? 'ok' : 'not ok'} ${n} - ${what}`) }
for (const f of ['nodes.json', 'modules.json', 'splectral.json', 'host.json']) check(read(f) !== null, `${f}: there, and JSON`)
const nodes = Object.values(read('nodes.json')?.nodes || {})
check(nodes.filter(x => x.role === 'master').length === 1, 'nodes.json: one master')
const codebase = read('modules.json')?.modules || []
check(codebase.length > 0, 'modules.json: its codebase named')
for (const m of codebase) check(existsSync(join(modules, m, 'package.json')), `${m}: in the package`)
console.log(`# tests ${n}\n# pass ${pass}`)
Bare.exitCode = pass === n ? 0 : 1
