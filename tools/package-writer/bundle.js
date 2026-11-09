// A package's release: the full package as one bundle, its native addons
// beside it by hash, and a manifest (docs/design/structure.md, "Packages as
// bundles, published as releases"):
//   <release>/<org>/<repo>.bundle  the package: the closure of its entry point
//                              (resolutions fixed, paths canonicalised), and
//                              every other file of the package (its tests, its
//                              data) as files; its main the package's entry
//   <release>/addons/<sha256>  its native addons, offloaded: the bundle names
//                              each as /../../addons/<sha256>, the addons store
//                              two levels up (beside the [org] folders), so it
//                              runs wherever the layout is placed
//   <release>/manifest.json    the bundle's hash, the addons', the entry, the
//                              commit it was made from, the runtime
// Made from a staged package (already tested), by bare-pack.
//   await writeRelease({ staged, release, org, repo, entry, commit })
import { readFileSync, writeFileSync, mkdirSync, readdirSync, lstatSync, realpathSync, existsSync } from 'bare-fs'
import { join, relative } from 'bare-path'
import { pathToFileURL, fileURLToPath } from 'bare-url'
import crypto from 'bare-crypto'
import pack from 'bare-pack'
import traverse from 'bare-module-traverse'
import bundleId from 'bare-bundle-id'

const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex')

// Every file of a folder, as paths relative to it, in name order.
function files (dir, at = '') {
  return readdirSync(join(dir, at)).sort().flatMap(n => {
    const p = join(at, n)
    const s = lstatSync(join(dir, p))
    return s.isDirectory() ? files(dir, p) : s.isFile() ? [p] : []
  })
}

export async function writeRelease ({ staged, release, org, repo, entry, commit = null, runtime = Bare.version }) {
  mkdirSync(join(release, 'addons'), { recursive: true })
  const base = pathToFileURL(staged.endsWith('/') ? staged : staged + '/')
  const addons = []
  const readModule = url => { try { return readFileSync(fileURLToPath(url)) } catch { return null } }
  // The workspace's links (modules/node_modules/<ours> -> ../<org>/<module>)
  // followed to the real file: each module once in the bundle.
  const resolveModule = url => { try { return pathToFileURL(realpathSync(fileURLToPath(url))) } catch { return url } }
  const writeFile = (url, source) => {
    const hash = sha256(source)
    writeFileSync(join(release, 'addons', hash), source)
    addons.push(hash)
    return `/../../addons/${hash}`
  }
  // The URLs that have a prefix (for the traversal's probing, e.g.
  // ./binding to ./binding.js): the parent folder's entries that start with it.
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
  const bundle = await pack(new URL(entry, base), { base, offload: { addons: true }, resolve: traverse.resolve.bare }, readModule, listPrefix, resolveModule, writeFile)
  // The rest of the package as files: its tests, its data. Third-party
  // code goes in only as reached from the entry.
  for (const p of files(staged)) {
    if (p.startsWith('modules/node_modules/') || p.endsWith('.bare')) continue
    const key = '/' + p
    if (!bundle.exists(key)) bundle.write(key, readFileSync(join(staged, p)))
  }
  // Its identity, from its contents (Bare's: bare-bundle-id), in its header.
  bundle.id = bundleId(bundle).toString('hex')
  const bytes = bundle.toBuffer()
  const file = `${org}/${repo}.bundle`
  mkdirSync(join(release, org), { recursive: true })
  writeFileSync(join(release, file), bytes)
  const manifest = {
    org,
    repo,
    key: `${org}/${repo}`,
    bundle: { file, id: bundle.id, sha256: sha256(bytes), bytes: bytes.length, main: bundle.main },
    addons: [...new Set(addons)].sort(),
    commit,
    runtime: { bare: runtime }
  }
  writeFileSync(join(release, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
  return manifest
}

export const releaseFiles = release => existsSync(release) ? files(release).map(p => relative(release, join(release, p))) : []
