// The help layer as the runtime extracts it, from bundles, into a folder to
// browse, with its problems: the documentation checked against the rules
// (haiccing/package-docs-template, "READMEs"). The extraction and the rules
// are mrepo-base-help's: the same here.
//   tools/bare tools/help-extract.js [<org>/<package>...] [--sources=<folder>] [--out=<folder>]
//   tools/bare tools/help-extract.js --files
// The packages: by default the boot mrepo's list (base-package-boot's
// mrepo/packages/layer.json), from sources/ here. The out folder (default
// sources/help/): the help tree, its index.json and problems.json.
// --files: the rules on this repository's own READMEs (the four haiccing
// packages, the modules they carry), by file. Exit 1 when there is a problem.
import process from 'bare-process'
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync, statSync } from 'bare-fs'
import { join, resolve, dirname } from 'bare-path'
import { fileURLToPath } from 'bare-url'
import Bundle from 'bare-bundle'
import { check, extract } from '../pear-full-square/mrepo-base-help/index.js'

const dev = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const flag = (n, d) => args.find(a => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? d

if (args.includes('--files')) {
  const roots = ['pear-full-square/mrepo-base-help', 'pear-full-square/pkgm-base-check', 'haiccing/base-package-service', 'haiccing/base-package-boot', 'haiccing/base-package-runtime', 'haiccing/package-docs-mrepo', 'haiccing/package-docs-template',
    ...readdirSync(join(dev, 'haiccing', 'base-package-boot', 'modules', 'pear-full-square')).map(m => `pear-full-square/${m}`)]
  const found = []
  const walk = d => { for (const n of readdirSync(join(dev, d)).sort()) { const p = `${d}/${n}`; if (n === 'node_modules' || n === 'modules' || n === '.git') continue; if (statSync(join(dev, p)).isDirectory()) walk(p); else if (n === 'README.md') found.push(p) } }
  for (const r of roots) walk(r)
  let n = 0
  for (const f of found) for (const [c, d] of check(readFileSync(join(dev, f), 'utf8'))) { n++; console.log(`${f}\t${c}\t${d}`) }
  console.log(`${found.length} READMEs, ${n} problems`)
  process.exit(n ? 1 : 0)
}

const sources = resolve(flag('sources', join(dev, 'sources')))
const out = resolve(flag('out', join(dev, 'sources', 'help')))
let list = args.filter(a => !a.startsWith('--'))
if (!list.length) list = JSON.parse(readFileSync(join(dev, 'haiccing', 'base-package-boot', 'mrepo', 'packages', 'layer.json'))).packages
const files = extract(list.map(pkg => {
  const b = Bundle.from(readFileSync(join(sources, `${pkg}.bundle`)))
  const readmes = {}
  for (const k of Object.keys(b.files)) if (k.endsWith('/README.md')) readmes[k] = b.read(k)
  let help = null
  try { help = JSON.parse(b.read('/package.json').toString()).help ?? null } catch {}
  return { pkg, files: readmes, help, paths: Object.keys(b.files) }
}))
if (existsSync(out)) rmSync(out, { recursive: true })
for (const [p, bytes] of Object.entries(files)) { mkdirSync(dirname(join(out, p)), { recursive: true }); writeFileSync(join(out, p), bytes) }
const problems = JSON.parse(files['/problems.json'].toString())
const byCheck = {}
for (const p of problems) byCheck[p.check] = (byCheck[p.check] ?? 0) + 1
console.log(JSON.stringify({ out, packages: list.length, readmes: Object.keys(JSON.parse(files['/index.json'].toString())).length, problems: problems.length, byCheck }))
process.exit(problems.length ? 1 : 0)
