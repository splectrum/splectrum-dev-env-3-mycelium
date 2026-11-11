// Packages put in place, a boot activity (docs/design/packages.md, "Packages
// put in place are a boot activity"): each package an mrepo lists, sourced
// into the work folder's store once, checked, hard linked individually into
// the mrepo's packages/ (it runs only what is registered for it), the list
// committed into its packages layer.
//   fetch({ store, sources, pkg })      the package in the store (from the
//                                       sources when not there yet), checked:
//                                       its manifest entry
//   structureOf({ store, pkg })         its mrepo/ part, read from its bundle:
//                                       { '<path inside mrepo/>': bytes }
//   place({ dir, store, sources, list }) each listed package fetched and linked
//                                       into <dir>/packages/; the packages
//                                       layer's manifest committed: { packages,
//                                       sources, store } (store: the mapping a
//                                       deploying runtime reaches the store by)
//     sources  [{ kind: 'folder', path }] (a source by organisation:
//              <path>/<org>/<repo>.bundle, <path>/<org>/manifest.json,
//              <path>/addons/<sha256>)
//   -> { packages: { '<org>/<repo>': { sha256, id, entries, addons } }, committed }
// The store: <work>/packages/<org>/<repo>.bundle (and its manifest entry
// beside it, <repo>.json), <work>/packages/addons/<sha256>; an mrepo's
// packages/ the same layout (a bundle finds its addons two levels up). A
// hard link where they share a disk, else a copy.
import fs, { existsSync, readFileSync, mkdirSync, linkSync, copyFileSync, rmSync, writeFileSync } from 'bare-fs'
import { join, dirname } from 'bare-path'
import crypto from 'bare-crypto'
import Bundle from 'bare-bundle'
import { p2pgitBackend, writer, openRepo } from 'mycelium-git'

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

export function fetch ({ store, sources, pkg }) {
  const file = join(store, `${pkg}.bundle`)
  const known = join(store, `${pkg}.json`)
  if (existsSync(file) && existsSync(known)) return JSON.parse(readFileSync(known, 'utf8'))
  const found = find(sources, pkg)
  if (!found) throw new Error(`not in the store nor the sources: ${pkg}`)
  const { entry } = found
  if (sha256(readFileSync(join(found.source, entry.file))) !== entry.sha256) throw new Error(`not as its manifest says (sha256): ${pkg}`)
  for (const a of entry.addons) {
    if (existsSync(join(store, 'addons', a))) continue
    if (sha256(readFileSync(join(found.source, 'addons', a))) !== a) throw new Error(`an addon not as named (sha256): ${a}`)
    put(join(found.source, 'addons', a), join(store, 'addons', a))
  }
  put(join(found.source, entry.file), file)
  writeFileSync(known, JSON.stringify(entry, null, 2) + '\n')
  return entry
}

export function structureOf ({ store, pkg }) {
  const bundle = Bundle.from(readFileSync(join(store, `${pkg}.bundle`)))
  const out = {}
  for (const key of Object.keys(bundle.files)) if (key.startsWith('/mrepo/')) out[key.slice('/mrepo/'.length)] = bundle.read(key)
  return out
}

export async function place ({ dir, store, sources, list }) {
  const mine = join(dir, 'packages')
  const packages = {}
  for (const pkg of list) {
    const entry = fetch({ store, sources, pkg })
    // Into the mrepo, each individually: the bundle and each of its addons.
    put(join(store, `${pkg}.bundle`), join(mine, `${pkg}.bundle`))
    for (const a of entry.addons) put(join(store, 'addons', a), join(mine, 'addons', a))
    packages[pkg] = { sha256: entry.sha256, id: entry.id, entries: entry.entries ?? [], addons: entry.addons }
  }
  // The packages layer: the list and the hashes (not the bytes), the sources
  // used and the store (unchanged: no commit).
  const backend = p2pgitBackend(join(dir, '.git'), { fs })
  const from = sources.map(x => x.kind === 'folder' ? `folder:${x.path}` : `github:${x.org}`)
  const now = Buffer.from(JSON.stringify({ packages, sources: from, store }, null, 2) + '\n')
  const was = await openRepo(backend).read('/packages/manifest.json').catch(() => null)
  const committed = !was || !was.equals(now)
  if (committed) {
    const c = await writer(backend).change('packages')
    await c.put('/manifest.json', now)
    await c.commit(`Packages in place: ${list.join(', ')}`, { author })
  }
  return { packages, committed }
}
