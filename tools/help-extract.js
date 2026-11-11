// The help layer as the runtime extracts it (mrepo-base-runtime, lib/help.js),
// from bundles, into a folder to browse, with a report on the
// documentation's quality: to evaluate it and set its rules.
//   tools/bare tools/help-extract.js [<org>/<package>...] [--sources=<folder>] [--out=<folder>]
// The packages: by default the boot mrepo's list (base-package-boot's
// mrepo/packages/layer.json), from sources/ here. The out folder: the help
// tree (its READMEs at their help URIs, index.json) and report.json.
// Each README checked against the rules (haiccing/package-docs-template,
// "READMEs"):
//   oneliner      none; over 120 characters; with parentheses; not one sentence
//   summary       over 100 words
//   sections      a title over three words, or with punctuation
//   transient     a reference to the development repository (docs/, steps/)
//   links         a relative link that resolves to nothing in the bundle
//   cascade       a folder below with a README, not linked from it
//   reached       not reached from the root (/) by the index's links
// --files: the same checks on the development repository's own READMEs
// (the four haiccing packages, the carried modules), by file.
import process from 'bare-process'
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync, statSync } from 'bare-fs'
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

// The rules on one README's text: [[check, detail]...].
function rules (text) {
  const r = parse(text)
  const out = []
  if (!r.oneliner) out.push(['oneliner', 'none'])
  else {
    if (r.oneliner.length > 120) out.push(['oneliner', `${r.oneliner.length} characters`])
    if (/[()]/.test(r.oneliner)) out.push(['oneliner', 'parentheses'])
    if (!/[.]$/.test(r.oneliner)) out.push(['oneliner', `not one sentence: "${r.oneliner.slice(0, 60)}"`])
  }
  // the summary's words, its links table not counted
  const words = r.summary.split('\n').filter(l => !l.trim().startsWith('|')).join(' ').split(/\s+/).filter(Boolean).length
  if (words > 100) out.push(['summary', `${words} words`])
  for (const s of r.sections) if (!/^`?[\w.-]+`?$/.test(s.title) && (s.title.split(/\s+/).length > 3 || /[:;,.()`]/.test(s.title))) out.push(['sections', s.title]) // a file's name is one
  const transient = text.match(/(?<![\w/-])(docs\/(design|guides|rules|readme)|steps\/\d)[\w./-]*/gi) ?? []
  if (transient.length) out.push(['transient', [...new Set(transient)].join(', ')])
  return out
}

if (args.includes('--files')) {
  const roots = ['haiccing/base-package-boot', 'haiccing/base-package-runtime', 'haiccing/package-docs-mrepo', 'haiccing/package-docs-template',
    ...readdirSync(join(dev, 'haiccing', 'base-package-boot', 'modules', 'pear-full-square')).map(m => `pear-full-square/${m}`)]
  const found = []
  const walk = d => { for (const n of readdirSync(join(dev, d)).sort()) { const p = `${d}/${n}`; if (n === 'node_modules' || n === 'modules' || n === '.git') continue; if (statSync(join(dev, p)).isDirectory()) walk(p); else if (n === 'README.md') found.push(p) } }
  for (const r of roots) walk(r)
  let n = 0
  for (const f of found) for (const [check, detail] of rules(readFileSync(join(dev, f), 'utf8'))) { n++; console.log(`${f}\t${check}\t${detail}`) }
  console.log(`${found.length} READMEs, ${n} problems`)
  process.exit(n ? 1 : 0)
}

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
  for (const [check, detail] of rules(files[uri === '/' ? '/README.md' : `${uri}/README.md`].toString())) report(uri, check, detail)
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
