// The help layer as the runtime extracts it (mrepo-base-runtime, lib/help.js),
// from bundles, into a folder to browse, with a report on the
// documentation's quality: to evaluate it and set its rules.
//   tools/bare tools/help-extract.js [<org>/<package>...] [--sources=<folder>] [--out=<folder>]
// The packages: by default the boot mrepo's list (base-package-boot's
// mrepo/packages/layer.json), from sources/ here. The out folder: the help
// tree (its READMEs at their help URIs, index.json) and report.json.
// Each README checked:
//   oneliner      none; longer than 160 characters; not one sentence
//   summary       longer than 150 words
//   links         a relative link that resolves to nothing in the bundle
//   cascade       a folder below with a README, not linked from it
//   reached       not reached from the root (/) by the index's links
//   transient     a reference to docs/ (the development repository's: not
//                 there in an mrepo)
import process from 'bare-process'
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'bare-fs'
import { join, resolve, dirname, posix } from 'bare-path'
import { fileURLToPath } from 'bare-url'
import Bundle from 'bare-bundle'
import { parse, extract } from '../pear-full-square/mrepo-base-runtime/lib/help.js'

const dev = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const flag = (n, d) => args.find(a => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? d
const sources = resolve(flag('sources', join(dev, 'sources')))
const out = resolve(flag('out', join(dev, 'sources', 'help')))
let list = args.filter(a => !a.startsWith('--'))
if (!list.length) list = JSON.parse(readFileSync(join(dev, 'haiccing', 'base-package-boot', 'mrepo', 'packages', 'layer.json'))).packages

const problems = []
const report = (uri, check, detail) => problems.push({ uri, check, detail })
const pkgs = list.map(pkg => {
  const b = Bundle.from(readFileSync(join(sources, `${pkg}.bundle`)))
  const readmes = {}
  for (const k of Object.keys(b.files)) if (k.endsWith('/README.md') && !k.includes('/node_modules/')) readmes[k] = b.read(k)
  let help = null
  try { help = JSON.parse(b.read('/package.json').toString()).help ?? null } catch {}
  // links that resolve to nothing in the bundle
  const all = new Set(Object.keys(b.files))
  for (const [k, bytes] of Object.entries(readmes)) {
    for (const h of parse(bytes.toString()).links) {
      const t = posix.normalize(posix.join(posix.dirname(k), h)).replace(/\/$/, '')
      if (!all.has(t) && ![...all].some(f => f.startsWith(t + '/'))) report(`${pkg}${k}`, 'links', `${h}: nothing there`)
    }
  }
  return { pkg, files: readmes, help }
})
const files = extract(pkgs)
const index = JSON.parse(files['/index.json'].toString())

for (const [uri, e] of Object.entries(index)) {
  const r = parse(files[uri === '/' ? '/README.md' : `${uri}/README.md`].toString())
  if (!r.oneliner) report(uri, 'oneliner', 'none')
  else {
    if (r.oneliner.length > 160) report(uri, 'oneliner', `${r.oneliner.length} characters`)
    if (!/[.]$/.test(r.oneliner)) report(uri, 'oneliner', `not one sentence: "${r.oneliner.slice(0, 60)}"`)
  }
  const transient = (files[uri === '/' ? '/README.md' : `${uri}/README.md`].toString().match(/docs\/(design|guides)\/[a-z-]+\.md/g) ?? [])
  if (transient.length) report(uri, 'transient', [...new Set(transient)].join(', '))
  const words = r.summary.split(/\s+/).filter(Boolean).length
  if (words > 150) report(uri, 'summary', `${words} words`)
  // cascade: the nearest READMEs below it, each linked
  for (const below of Object.keys(index)) {
    if (below === uri || !below.startsWith(uri === '/' ? '/' : uri + '/')) continue
    const between = Object.keys(index).some(m => m !== uri && m !== below && below.startsWith(m + '/') && m.startsWith(uri === '/' ? '/' : uri + '/'))
    if (!between && !e.links.includes(below)) report(uri, 'cascade', `${below} not linked`)
  }
}
const reached = new Set(['/'])
const queue = ['/']
while (queue.length) for (const l of index[queue.shift()]?.links ?? []) if (!reached.has(l)) { reached.add(l); queue.push(l) }
for (const uri of Object.keys(index)) if (!reached.has(uri)) report(uri, 'reached', 'not reached from /')

if (existsSync(out)) rmSync(out, { recursive: true })
for (const [p, bytes] of Object.entries(files)) { mkdirSync(dirname(join(out, p)), { recursive: true }); writeFileSync(join(out, p), bytes) }
const byCheck = {}
for (const p of problems) byCheck[p.check] = (byCheck[p.check] ?? 0) + 1
writeFileSync(join(out, 'report.json'), JSON.stringify({ packages: list, readmes: Object.keys(index).length, byCheck, problems }, null, 2) + '\n')
console.log(JSON.stringify({ out, packages: list.length, readmes: Object.keys(index).length, byCheck }))
