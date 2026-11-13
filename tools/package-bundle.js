// A package written as a Bare bundle into a sources folder, by organisation
// (haiccing/package-docs-template; sources/ here, gitignored):
//   <out>/<org>/<repo>.bundle     the package: its dispatcher (main.js, written
//                                 into the package's folder with test/run.js:
//                                 tools/lib/dispatcher.js) and what it reaches:
//                                 every entry and test unit, as code (bare-pack: resolutions
//                                 fixed, paths canonicalised), and every other
//                                 file of the package (its mrepo/, its tests,
//                                 its data) as files
//   <out>/addons/<sha256>         its native addons, offloaded, shared: the
//                                 bundle names each /../../addons/<sha256>
//                                 (two levels up from the bundle file)
//   <out>/<org>/manifest.json     each bundle: its file, its id, its sha256,
//                                 its size, its main, its entry points, its addons, the commit it
//                                 was made from, the Bare it was made on; and
//                                 its content: a hash of everything in it but
//                                 its test reports (test-reports/<set>.json, <set>.md), what
//                                 a test report certifies: the same before and
//                                 after the report is added (tools/package-test.js)
// Unsigned for now. The package's modules/ assembled first
// (tools/package-assemble.js).
//   tools/bare tools/package-bundle.js <package folder> [--out=<folder>] [--org=haiccing]
import process from 'bare-process'
import { readFileSync, writeFileSync, mkdirSync, readdirSync, lstatSync, realpathSync, existsSync } from 'bare-fs'
import { join, resolve, basename, dirname } from 'bare-path'
import { pathToFileURL, fileURLToPath } from 'bare-url'
import { spawnSync } from 'bare-subprocess'
import crypto from 'bare-crypto'
import pack from 'bare-pack'
import traverse from 'bare-module-traverse'
import bundleId from 'bare-bundle-id'
import { writeDispatcher } from './lib/dispatcher.js'

const dev = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex')
const readJson = f => JSON.parse(readFileSync(f, 'utf8'))

// Every file of a folder, as paths relative to it, in name order.
function files (dir, at = '') {
  return readdirSync(join(dir, at)).sort().flatMap(n => {
    const p = at ? `${at}/${n}` : n
    const s = lstatSync(join(dir, p))
    return s.isDirectory() ? files(dir, p) : s.isFile() ? [p] : []
  })
}

const ENTRIES = ['run', 'deploy', 'protocol']

// A test report in a package: test-reports/<set>.json and the same to
// read, <set>.md (not the folder's README).
export const isReport = path => /^\/?test-reports\/[^/]+\.(json|md)$/.test(path) && !/\/?README\.md$/.test(path)

// A bundle's content: a hash over its files (each its path and its bytes'
// hash, in path order), its resolutions and its addons, its test reports
// left out.
export function contentOf (bundle, addons) {
  const h = crypto.createHash('sha256')
  for (const key of Object.keys(bundle.files).sort()) {
    if (isReport(key)) continue
    h.update(`${key}\0${sha256(bundle.read(key))}\n`)
  }
  h.update(JSON.stringify(bundle.resolutions))
  h.update(JSON.stringify([...new Set(addons)].sort()))
  return h.digest('hex')
}

export async function bundlePackage ({ folder, out, org = 'haiccing' }) {
  const repo = basename(folder)
  // The bundle's main: the package's dispatcher (main.js, written here from
  // the entry points it has): run when started as the program; on import,
  // nothing runs, the entry points offered (run, deploy, protocol).
  const entries = ENTRIES.filter(e => existsSync(join(folder, `${e}.js`)))
  // none: a documentation package (its main runs nothing)
  writeDispatcher(folder)
  const main = 'main.js'
  mkdirSync(join(out, 'addons'), { recursive: true })
  mkdirSync(join(out, org), { recursive: true })
  const base = pathToFileURL(folder.endsWith('/') ? folder : folder + '/')
  const addons = []
  const readModule = url => { try { return readFileSync(fileURLToPath(url)) } catch { return null } }
  // modules/node_modules/<ours> -> ../<org>/<module>: followed to the real
  // file, each module once in the bundle.
  const resolveModule = url => { try { return pathToFileURL(realpathSync(fileURLToPath(url))) } catch { return url } }
  const writeFile = (url, source) => {
    const hash = sha256(source)
    writeFileSync(join(out, 'addons', hash), source)
    addons.push(hash)
    return `/../../addons/${hash}`
  }
  // The URLs with a prefix (the traversal's probing: ./binding to ./binding.js).
  async function * listPrefix (url) {
    const path = fileURLToPath(url)
    const dir = path.endsWith('/') ? path : path.slice(0, path.lastIndexOf('/') + 1)
    let names = []
    try { names = readdirSync(dir).sort() } catch { return }
    for (const n of names) {
      const p = dir + n
      if (!p.startsWith(path)) continue
      if (lstatSync(p).isDirectory()) { for (const f of files(p)) yield pathToFileURL(join(p, f)) } else yield pathToFileURL(p)
    }
  }
  const bundle = await pack(new URL(main, base), { base, offload: { addons: true }, resolve: traverse.resolve.bare }, readModule, listPrefix, resolveModule, writeFile)
  // The rest of the package as files: third-party code only as reached.
  for (const p of files(folder)) {
    if (p.startsWith('modules/node_modules/') || p.endsWith('.bare')) continue
    if (!bundle.exists('/' + p)) bundle.write('/' + p, readFileSync(join(folder, p)))
  }
  bundle.id = bundleId(bundle).toString('hex')
  const bytes = bundle.toBuffer()
  const file = `${org}/${repo}.bundle`
  writeFileSync(join(out, file), bytes)
  const commit = spawnSync('git', ['-C', dev, 'rev-parse', 'HEAD'], { stdio: ['ignore', 'pipe', 'ignore'] }).stdout?.toString().trim() || null
  // docs: a documentation package (its package.json's docs): no structure laid in
  const docs = JSON.parse(readFileSync(join(folder, 'package.json'), 'utf8')).docs === true
  const entry = { file, id: bundle.id, sha256: sha256(bytes), content: contentOf(bundle, addons), bytes: bytes.length, main: bundle.main, entries, docs, addons: [...new Set(addons)].sort(), commit, bare: Bare.version }
  const mf = join(out, org, 'manifest.json')
  const manifest = existsSync(mf) ? readJson(mf) : { packages: {} }
  manifest.packages[`${org}/${repo}`] = entry
  writeFileSync(mf, JSON.stringify(manifest, null, 2) + '\n')
  return entry
}

// Started as the program (not imported by another tool).
if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2)
  const folder = args.find(a => !a.startsWith('--'))
  if (!folder) { console.error('usage: package-bundle.js <package folder> [--out=<folder>] [--org=haiccing]'); process.exit(2) }
  const flag = (n, d) => args.find(a => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? d
  const r = await bundlePackage({ folder: resolve(folder), out: resolve(flag('out', join(dev, 'sources'))), org: flag('org', 'haiccing') })
  console.log(JSON.stringify({ ...r, addons: r.addons.length }))
}
