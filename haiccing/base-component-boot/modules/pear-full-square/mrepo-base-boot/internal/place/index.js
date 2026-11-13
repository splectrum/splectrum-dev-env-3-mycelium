// place: an mrepo's packages put in place; also storeOf (README.md beside it).
import fs from 'bare-fs'
import { join } from 'bare-path'
import { p2pgitBackend, writer, openRepo } from 'mycelium-git'
import { fetch, put } from '../fetch/index.js'

const author = { name: 'mrepo-boot', email: 'mrepo-boot@localhost' }

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

export const storeOf = work => join(work, 'packages')
