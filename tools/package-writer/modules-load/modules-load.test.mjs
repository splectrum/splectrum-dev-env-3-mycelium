// Every module of ours in the package (modules/<org>/<module>) loads.
// brittle as the package carries it (a named test sits outside modules/: no
// node_modules above it to find it by name).
import test from '../../modules/node_modules/brittle/index.js'
import { readFileSync, existsSync, readdirSync } from '../../modules/node_modules/bare-fs/index.js'
import { join, dirname } from '../../modules/node_modules/bare-path/index.js'
import { fileURLToPath, pathToFileURL } from '../../modules/node_modules/bare-url/index.js'

const modules = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'modules')
for (const org of readdirSync(modules).filter(o => o !== 'node_modules' && !o.endsWith('.json')).sort()) {
  for (const mod of readdirSync(join(modules, org)).sort()) {
    const dir = join(modules, org, mod)
    test(`${org}/${mod} loads`, async (t) => {
      const p = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
      const entry = typeof p.exports === 'string' ? p.exports : p.exports?.['.']?.import ?? p.exports?.['.'] ?? p.main
      if (!entry) { if (p.browser) t.ok(existsSync(join(dir, p.browser)), `${p.browser} there`); else t.pass('no entry: nothing to load'); return }
      const m = await import(pathToFileURL(join(dir, entry)).href)
      t.ok(Object.keys(m).length > 0, 'exports something')
    })
  }
}
