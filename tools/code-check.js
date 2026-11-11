// The code rules (pkgm-base-check) on this repository's code: the modules the
// haiccing packages carry and the packages' own code (not the tools: they
// live here, where docs/ is). One line a
// problem; exit 1 when there is one.
//   tools/bare tools/code-check.js
import process from 'bare-process'
import { readFileSync, readdirSync, existsSync } from 'bare-fs'
import { join, resolve, dirname } from 'bare-path'
import { fileURLToPath } from 'bare-url'
import { checkModule, checkPackage } from '../pear-full-square/pkgm-base-check/index.js'

const dev = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const packages = ['base-package-boot', 'base-package-runtime', 'package-docs-mrepo', 'package-docs-template']
const carried = new Set()
for (const p of packages) {
  const m = join(dev, 'haiccing', p, 'modules', 'pear-full-square')
  if (existsSync(m)) for (const n of readdirSync(m)) carried.add(n)
}
const ours = [...carried].map(n => JSON.parse(readFileSync(join(dev, 'pear-full-square', n, 'package.json'), 'utf8')).name)
let n = 0
const say = (where, p) => { n++; console.log(`${where}/${p.file}\t${p.check}\t${p.detail}`) }
for (const m of [...carried].sort()) for (const p of checkModule(join(dev, 'pear-full-square', m), { ours })) say(`pear-full-square/${m}`, p)
for (const p of packages) for (const q of checkPackage(join(dev, 'haiccing', p))) say(`haiccing/${p}`, q)
console.log(`${carried.size} modules, ${packages.length} packages: ${n} problems`)
process.exit(n ? 1 : 0)
