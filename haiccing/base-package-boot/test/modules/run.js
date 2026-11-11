// The test's entry: bare test/modules/run.js. The modules the package
// carries (modules/<org>/<module>/), each tested by its own tests
// (test/*.test.js), from its folder, with the package's brittle, as its own
// process, in name order: as in development, on the package's own copies
// (imports by name through modules/node_modules/). Exits 1 when one failed.
import process from '../../modules/node_modules/bare-process/index.js'
import { spawnSync } from '../../modules/node_modules/bare-subprocess/index.js'
import os from '../../modules/node_modules/bare-os/index.js'
import { readdirSync, existsSync, statSync } from '../../modules/node_modules/bare-fs/index.js'
import { join, dirname } from '../../modules/node_modules/bare-path/index.js'
import { fileURLToPath } from '../../modules/node_modules/bare-url/index.js'

const modules = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'modules')
const brittle = join(modules, 'node_modules', 'brittle', 'cmd.js')
const failed = []
let ran = 0
for (const org of readdirSync(modules).filter(n => n !== 'node_modules' && statSync(join(modules, n)).isDirectory()).sort()) {
  for (const mod of readdirSync(join(modules, org)).sort()) {
    const dir = join(modules, org, mod)
    const tests = existsSync(join(dir, 'test')) ? readdirSync(join(dir, 'test')).filter(n => n.endsWith('.test.js')).sort().map(n => `test/${n}`) : []
    if (!tests.length) continue
    ran++
    console.log(`# module ${org}/${mod}`)
    const r = spawnSync(os.execPath(), [brittle, ...tests], { cwd: dir, stdio: 'inherit' })
    if (r.status !== 0) failed.push(`${org}/${mod}`)
  }
}
console.log(JSON.stringify({ modules: ran, failed }))
process.exit(failed.length ? 1 : 0)
