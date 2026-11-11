// fetch({ store, sources, pkg }): a package into the store, checked (README.md beside it).
import { existsSync, readFileSync, writeFileSync } from 'bare-fs'
import { join } from 'bare-path'
import crypto from 'bare-crypto'
import { put } from '../put/index.js'

const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex')

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
