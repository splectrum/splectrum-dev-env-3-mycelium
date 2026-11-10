// A package's modules assembled into its folder (docs/design/packages.md,
// "What a package is": modules/ once, at the package's top): from the
// modules its package.json names (`modules`), what they run on, all the way
// down (the package writer's closure):
//   <package>/modules/<org>/<module>/   ours, copied whole (committed here)
//   <package>/modules/node_modules/     the third-party code, links to ours by
//                                       name (not committed here: node_modules
//                                       is ignored; written with the package)
//   <package>/modules/third-party.json  the record: each, its version,
//                                       licence, integrity, where from
// What was there is replaced.
//   tools/bare tools/package-assemble.js <package folder>
import process from 'bare-process'
import os from 'bare-os'
import { readFileSync, writeFileSync, existsSync, mkdirSync, symlinkSync, chmodSync, rmSync } from 'bare-fs'
import { join, dirname, resolve, relative } from 'bare-path'
import { fileURLToPath } from 'bare-url'
import { closure } from '../pear-full-square/pkgm-base-manager/lib/closure.js'
import { copy } from '../pear-full-square/pkgm-base-manager/lib/tree.js'
import { oursOf } from './package-writer/index.js'

const dev = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const readJson = f => JSON.parse(readFileSync(f, 'utf8'))
const platform = () => `${os.platform()}-${os.arch()}`
// Third-party code as shipped: no tests, no .bin, this platform's prebuilds only.
const skipThird = (r, base) => base === 'test' || base === '.bin' || (r.split('/').at(-2) === 'prebuilds' && base !== platform())
// Not a module's: its dependencies, git, records, a log a run left.
const skipOurs = (r, base) => base === 'node_modules' || base === '.git' || base === 'record' || r === 'log'

const [folder] = process.argv.slice(2)
if (!folder) { console.error('usage: package-assemble.js <package folder>'); process.exit(2) }
const pkg = resolve(folder)
const start = readJson(join(pkg, 'package.json')).modules || []
const ours = oursOf(dev, { packages: {} })
// brittle (the package's tests run on it) and this repository's aliases for
// Node's built-ins (third-party code imports them by those names).
const root = readJson(join(dev, 'package.json'))
const aliases = Object.entries(root.dependencies || {}).filter(([, v]) => String(v).startsWith('npm:')).map(([k]) => k)
const set = closure({ ours, third: join(dev, 'node_modules'), start, also: ['brittle', ...aliases] })

const out = join(pkg, 'modules')
rmSync(out, { recursive: true, force: true })
const byPath = new Map([...ours.values()].map(m => [m.path, m]))
for (const p of set.ours) copy(byPath.get(p).dir, join(out, p), { skip: skipOurs })
for (const t of set.third) copy(join(dev, 'node_modules', t), join(out, 'node_modules', t), { skip: skipThird })
for (const [n, m] of ours) {
  if (!set.ours.includes(m.path)) continue
  const link = join(out, 'node_modules', n)
  mkdirSync(dirname(link), { recursive: true })
  symlinkSync(relative(dirname(link), join(out, m.path)), link)
}
const rt = join(out, 'node_modules', `bare-runtime-${platform()}`, 'bin', 'bare')
if (existsSync(rt)) chmodSync(rt, 0o755)
const lock = existsSync(join(dev, 'package-lock.json')) ? readJson(join(dev, 'package-lock.json')) : { packages: {} }
const record = set.third.map(t => {
  const e = lock.packages[`node_modules/${t}`] || {}
  const pj = readJson(join(dev, 'node_modules', t, 'package.json'))
  return { name: t, version: pj.version, license: pj.license || e.license || null, resolved: e.resolved || null, integrity: e.integrity || null }
})
writeFileSync(join(out, 'third-party.json'), JSON.stringify({ platform: platform(), modules: record }, null, 2) + '\n')
console.log(JSON.stringify({ ours: set.ours, third: set.third.length, unresolved: set.missing.map(m => `${m.from}: ${m.name}`) }))
