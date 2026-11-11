// A package written as a Bare bundle into a sources folder, by organisation
// (docs/design/packages.md; sources/ here, gitignored):
//   <out>/<org>/<repo>.bundle     the package: its dispatcher (main.js, written
//                                 into the package's folder: run.js when started
//                                 as the program; run, deploy, protocol offered
//                                 on import) and what it reaches (bare-pack: resolutions
//                                 fixed, paths canonicalised), and every other
//                                 file of the package (its mrepo/, its tests,
//                                 its data) as files
//   <out>/addons/<sha256>         its native addons, offloaded, shared: the
//                                 bundle names each /../../addons/<sha256>
//                                 (two levels up from the bundle file)
//   <out>/<org>/manifest.json     each bundle: its file, its id, its sha256,
//                                 its size, its main, its entry points, its addons, the commit it
//                                 was made from, the Bare it was made on
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

// main.js: the entry points, as functions importing them (packed as code);
// run.js run when this bundle is the program Bare was started with.
function dispatcher (entries) {
  return [
    '// The package\'s dispatcher, its bundle\'s main (written by tools/package-bundle.js).',
    '// Started as the program (bare <package>.bundle ...): run.js runs. Imported',
    '// (a runtime loading a protocol, a deploy reading structure): nothing runs;',
    '// the entry points offered.',
    "import os from './modules/node_modules/bare-os/index.js'",
    "import { URL } from './modules/node_modules/bare-url/index.js'",
    ...entries.map(e => `export const ${e} = () => import('./${e}.js')`),
    '// This bundle the program: the file Bare was started with, resolved, is it.',
    "const self = new URL('.', import.meta.url).href.replace(/\\/$/, '')",
    "const started = Bare.argv[1] ? new URL(Bare.argv[1], `file://${os.cwd()}/`).href : null",
    entries.includes('run') ? 'if (started === self) await run()' : '// (no run.js: nothing to run as a program)',
    ''
  ].join('\n')
}

export async function bundlePackage ({ folder, out, org = 'haiccing' }) {
  const repo = basename(folder)
  // The bundle's main: the package's dispatcher (main.js, written here from
  // the entry points it has): run when started as the program; on import,
  // nothing runs, the entry points offered (run, deploy, protocol).
  const entries = ENTRIES.filter(e => existsSync(join(folder, `${e}.js`)))
  if (!entries.length) throw new Error(`no entry point in ${folder} (${ENTRIES.map(e => `${e}.js`).join(', ')})`)
  writeFileSync(join(folder, 'main.js'), dispatcher(entries))
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
  const entry = { file, id: bundle.id, sha256: sha256(bytes), bytes: bytes.length, main: bundle.main, entries, addons: [...new Set(addons)].sort(), commit, bare: Bare.version }
  const mf = join(out, org, 'manifest.json')
  const manifest = existsSync(mf) ? readJson(mf) : { packages: {} }
  manifest.packages[`${org}/${repo}`] = entry
  writeFileSync(mf, JSON.stringify(manifest, null, 2) + '\n')
  return entry
}

const args = process.argv.slice(2)
const folder = args.find(a => !a.startsWith('--'))
if (!folder) { console.error('usage: package-bundle.js <package folder> [--out=<folder>] [--org=haiccing]'); process.exit(2) }
const flag = (n, d) => args.find(a => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? d
const r = await bundlePackage({ folder: resolve(folder), out: resolve(flag('out', join(dev, 'sources'))), org: flag('org', 'haiccing') })
console.log(JSON.stringify({ ...r, addons: r.addons.length }))
