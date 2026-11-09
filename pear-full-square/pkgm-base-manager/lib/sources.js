// Where packages come from: sources, asked in order. A source is a folder
// (`{ kind: 'folder', path }`: the setup's own, one carried in, a mirror) or
// the web (`{ kind: 'web', url }`: GitHub's release downloads, any server),
// laid out flat: manifest.json, <repo>.bundle, addons/<sha256>
// (docs/design/structure.md). Downloads in the shell, with curl
// (docs/rules.md 26: never from Bare). What a source delivers is checked:
// the manifest by its publisher's signature and sequence, every bundle and
// addon by its sha256 in that manifest. A source is transport, never trusted.
//   const m = loadManifest({ sources, publicKey, scratch, atLeast })
//   loadPackage({ sources, manifest: m, repo, to, scratch })   -> { bundle, addons }
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, renameSync, rmSync } from 'bare-fs'
import { join } from 'bare-path'
import { spawnSync } from 'bare-subprocess'
import crypto from 'bare-crypto'
import { verify } from './sign.js'

const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex')

// One file from a source, into dest; true if the source had it.
export function fetchFile (source, path, dest) {
  if (source.kind === 'folder') {
    const from = join(source.path, path)
    if (!existsSync(from)) return false
    copyFileSync(from, dest)
    return true
  }
  if (source.kind === 'web') {
    const r = spawnSync('curl', ['-fsSL', '--retry', '3', '--connect-timeout', '20', '-o', dest, `${source.url.replace(/\/$/, '')}/${path}`], { stdio: ['ignore', 'ignore', 'pipe'] })
    return r.status === 0
  }
  return false
}

// The newest manifest the sources hold that its publisher signed, its
// sequence at least `atLeast` (never back to an older one); null if none.
export function loadManifest ({ sources, publicKey, scratch, atLeast = 0 }) {
  mkdirSync(scratch, { recursive: true })
  let best = null
  for (const [i, s] of sources.entries()) {
    const f = join(scratch, `manifest-${i}.json`)
    if (!fetchFile(s, 'manifest.json', f)) continue
    let m
    try { m = JSON.parse(readFileSync(f, 'utf8')) } catch { continue }
    if (!verify(m, publicKey) || !(m.sequence >= atLeast)) continue
    if (!best || m.sequence > best.sequence) best = m
  }
  return best
}

// A package as the manifest lists it: its bundle, and the addons not
// already in `to`/addons, each fetched from the first source that has it and
// matches its hash; written into `to` (<repo>.bundle, addons/<sha256>).
export function loadPackage ({ sources, manifest, repo, to, scratch }) {
  const entry = manifest.packages?.[repo]
  if (!entry) throw new Error(`not in the manifest: ${repo}`)
  mkdirSync(join(to, 'addons'), { recursive: true })
  mkdirSync(scratch, { recursive: true })
  const fetched = []
  const get = (path, hash, dest) => {
    for (const s of sources) {
      const tmp = join(scratch, hash)
      if (!fetchFile(s, path, tmp)) continue
      if (sha256(readFileSync(tmp)) !== hash) { rmSync(tmp, { force: true }); continue }
      renameSync(tmp, dest)
      fetched.push(path)
      return
    }
    throw new Error(`no source has ${path} as the manifest lists it (${hash.slice(0, 12)})`)
  }
  const bundle = join(to, `${repo}.bundle`)
  if (!(existsSync(bundle) && sha256(readFileSync(bundle)) === entry.sha256)) get(`${repo}.bundle`, entry.sha256, bundle)
  for (const a of entry.addons || []) if (!existsSync(join(to, 'addons', a))) get(`addons/${a}`, a, join(to, 'addons', a))
  return { bundle, fetched }
}

export const writeJson = (f, v) => writeFileSync(f, JSON.stringify(v, null, 2) + '\n')
