// A package's modules assembled into its folder (haiccing/package-docs-template,
// "What a package is": modules/ once, at the package's top): from the
// modules its package.json names (`modules`), what they run on, all the way
// down (pkgm-base-manager's closure):
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
import { readFileSync, writeFileSync, existsSync, mkdirSync, symlinkSync, chmodSync, rmSync, readdirSync, statSync } from 'bare-fs'
import { join, dirname, resolve, relative } from 'bare-path'
import { fileURLToPath } from 'bare-url'
import { closure } from '../pear-full-square/pkgm-base-manager/lib/closure.js'
import { copy } from '../pear-full-square/pkgm-base-manager/lib/tree.js'
import { writeDispatcher } from './lib/dispatcher.js'

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
// Our modules, by the name they are imported by: this repository's workspaces.
const ours = new Map()
for (const f of readJson(join(dev, 'package.json')).workspaces || []) {
  if (!existsSync(join(dev, f, 'package.json'))) continue
  ours.set(readJson(join(dev, f, 'package.json')).name || f.split('/')[1], { path: f, dir: join(dev, f) })
}
// brittle (the package's tests run on it) and this repository's aliases for
// Node's built-ins (third-party code imports them by those names: carried
// only when it does, below).
const root = readJson(join(dev, 'package.json'))
const aliases = Object.entries(root.dependencies || {}).filter(([, v]) => String(v).startsWith('npm:')).map(([k]) => k)
// An alias only when carried third-party code imports it by that name: the
// closure again with those, until nothing new is imported.
const SPEC = /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*)(['"])([^'"\n]+)\1/g
function jsFiles (dir) {
  const out = []
  for (const n of readdirSync(dir)) {
    if (n === 'node_modules' || n === 'test' || n === '.bin') continue
    const p = join(dir, n)
    const s = statSync(p)
    if (s.isDirectory()) out.push(...jsFiles(p)); else if (/\.(c|m)?js$/.test(n)) out.push(p)
  }
  return out
}
const imported = third => {
  const found = new Set()
  for (const t of third) for (const f of jsFiles(join(dev, 'node_modules', t))) for (const [, , spec] of readFileSync(f, 'utf8').matchAll(SPEC)) if (aliases.includes(spec.split('/')[0])) found.add(spec.split('/')[0])
  return [...found]
}
// The assembly's options: this repository's default (package.json,
// assemble), the package's own replacing it (try and see: its validate
// proves it). omit: third-party code not carried.
const options = { ...(root.assemble || {}), ...(readJson(join(pkg, 'package.json')).assemble || {}) }
const omit = options.omit || []
let also = ['brittle']
let set = closure({ ours, third: join(dev, 'node_modules'), start, also, omit })
for (;;) {
  const more = imported(set.third).filter(a => !also.includes(a))
  if (!more.length) break
  also = [...also, ...more]
  set = closure({ ours, third: join(dev, 'node_modules'), start, also, omit })
}

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
// Each omitted module a stub in its place: code that loads it on demand
// still resolves when the bundle is linked; used, it says it was omitted.
for (const name of omit) {
  const d = join(out, 'node_modules', name)
  mkdirSync(d, { recursive: true })
  writeFileSync(join(d, 'package.json'), JSON.stringify({ name, version: '0.0.0-omitted', main: 'index.js' }, null, 2) + '\n')
  writeFileSync(join(d, 'index.js'), `module.exports = function omitted () { throw new Error('${name}: omitted from this package (its assemble options)') }\n`)
}
const rt = join(out, 'node_modules', `bare-runtime-${platform()}`, 'bin', 'bare')
if (existsSync(rt)) chmodSync(rt, 0o755)
const lock = existsSync(join(dev, 'package-lock.json')) ? readJson(join(dev, 'package-lock.json')) : { packages: {} }
const record = set.third.map(t => {
  const e = lock.packages[`node_modules/${t}`] || {}
  const pj = readJson(join(dev, 'node_modules', t, 'package.json'))
  return { name: t, version: pj.version, license: pj.license || e.license || null, resolved: e.resolved || null, integrity: e.integrity || null }
})
writeFileSync(join(out, 'third-party.json'), JSON.stringify({ platform: platform(), omitted: omit, modules: record }, null, 2) + '\n')
// Its README, linking down to each of ours (READMEs cascade:
// haiccing/package-docs-template).
const row = p => {
  const d = (readJson(join(out, p, 'package.json')).description || '').replace(/\|/g, '\\|')
  return existsSync(join(out, p, 'README.md')) ? `| [${p}/](${p}/) | ${d} |` : `| \`${p}/\` | ${d} |`
}
writeFileSync(join(out, 'README.md'), [
  '# modules/',
  '',
  'The package\'s code: our modules and the third-party code they use.',
  '',
  'Assembled from the modules `package.json` names, all the way down; never',
  'edited by hand. Each of ours carries its own tests, run by the package\'s',
  'modules test, `/test/modules`.',
  '',
  '| ours | |',
  '|---|---|',
  ...[...set.ours].sort().map(row),
  '',
  `The third-party code: \`node_modules/\`, ${record.length} modules for ${platform()}, each`,
  'with its version, licence and source in [third-party.json](third-party.json).',
  'Our modules find each other by name through `node_modules/` (links).',
  ''
].join('\n'))
// Its dispatcher and test runner, from what it now has (tools/lib/dispatcher.js).
writeDispatcher(pkg)
console.log(JSON.stringify({ ours: set.ours, third: set.third.length, unresolved: set.missing.map(m => `${m.from}: ${m.name}`) }))
