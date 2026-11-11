// Packages put in place, a boot activity (docs/design/packages.md: "Packages
// put in place are a boot activity"): each package an mrepo lists, sourced
// into the work folder's store once, checked, hard linked into the mrepo's
// packages/, its list and hashes committed into the packages layer.
//   place({ work, name, sources, list })
//     sources  [{ kind: 'folder', path }] (a source by organisation:
//              <path>/<org>/<repo>.bundle, <path>/<org>/manifest.json,
//              <path>/addons/<sha256>)
//     list     ['<org>/<repo>', ...]
//   -> { packages: { '<org>/<repo>': { sha256, id, addons } } }, or throws
// The layer's manifest: { packages, sources } (the sources used: a child's
// deploy sources from them).
// The store: <work>/packages/<org>/<repo>.bundle, <work>/packages/addons/<sha256>;
// the mrepo's: <work>/mrepos/<name>/packages/ (the same layout: a bundle
// finds its addons two levels up). A hard link where the store and the
// mrepo share a disk, else a copy. The packages layer: /manifest.json.
import fs, { existsSync, readFileSync, mkdirSync, linkSync, copyFileSync, rmSync } from 'bare-fs'
import { join, dirname } from 'bare-path'
import crypto from 'bare-crypto'
import { p2pgitBackend, writer, openRepo } from 'mycelium-git'
import { gitdirOf, viewOf } from 'mrepo-base-request'

const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex')
const author = { name: 'mrepo-boot', email: 'mrepo-boot@localhost' }
export const storeOf = work => join(work, 'packages')

// A file into place: hard linked, else copied (another disk).
function put (from, to) {
  mkdirSync(dirname(to), { recursive: true })
  rmSync(to, { force: true })
  try { linkSync(from, to) } catch { copyFileSync(from, to) }
}

// A package from the sources, in order: its manifest entry and its folder.
function find (sources, pkg) {
  const [org] = pkg.split('/')
  for (const s of sources) {
    if (s.kind !== 'folder') continue
    const mf = join(s.path, org, 'manifest.json')
    if (!existsSync(mf)) continue
    const entry = JSON.parse(readFileSync(mf, 'utf8')).packages?.[pkg]
    if (entry && existsSync(join(s.path, entry.file))) return { source: s.path, entry }
  }
  return null
}

export async function place ({ work, name, sources, list }) {
  const store = storeOf(work)
  const mine = join(viewOf(work, name), 'packages')
  const packages = {}
  for (const pkg of list) {
    const file = `${pkg}.bundle`
    let entry
    if (existsSync(join(store, file)) && existsSync(join(store, `${pkg}.json`))) {
      entry = JSON.parse(readFileSync(join(store, `${pkg}.json`), 'utf8'))
    } else {
      const found = find(sources, pkg)
      if (!found) throw new Error(`not in the sources: ${pkg}`)
      entry = found.entry
      const bytes = readFileSync(join(found.source, entry.file))
      if (sha256(bytes) !== entry.sha256) throw new Error(`not as its manifest says (sha256): ${pkg}`)
      for (const a of entry.addons) {
        const ab = readFileSync(join(found.source, 'addons', a))
        if (sha256(ab) !== a) throw new Error(`an addon not as named (sha256): ${a}`)
        if (!existsSync(join(store, 'addons', a))) put(join(found.source, 'addons', a), join(store, 'addons', a))
      }
      put(join(found.source, entry.file), join(store, file))
      fs.writeFileSync(join(store, `${pkg}.json`), JSON.stringify(entry, null, 2) + '\n')
    }
    // Into the mrepo: the bundle and its addons, linked from the store.
    put(join(store, file), join(mine, file))
    for (const a of entry.addons) put(join(store, 'addons', a), join(mine, 'addons', a))
    packages[pkg] = { sha256: entry.sha256, id: entry.id, addons: entry.addons }
  }
  // The packages layer: the list and the hashes, not the bytes.
  // (unchanged: no commit)
  const backend = p2pgitBackend(gitdirOf(work, name), { fs })
  // (with the sources they came from: a child's deploy sources from them too)
  const from = sources.map(x => x.kind === 'folder' ? `folder:${x.path}` : `github:${x.org}`)
  const now = Buffer.from(JSON.stringify({ packages, sources: from }, null, 2) + '\n')
  const was = await openRepo(backend).read('/packages/manifest.json').catch(() => null)
  if (!was || !was.equals(now)) {
    const c = await writer(backend).change('packages')
    await c.put('/manifest.json', now)
    await c.commit(`Packages in place: ${list.join(', ')}`, { author })
  }
  return { packages, committed: !was || !was.equals(now) }
}
