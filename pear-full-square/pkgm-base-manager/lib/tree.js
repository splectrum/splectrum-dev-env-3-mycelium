// Folders as units: copied, hashed, compared. Node's built-ins only.
import { readdirSync, lstatSync, readFileSync, mkdirSync, copyFileSync, symlinkSync, readlinkSync, chmodSync, rmSync, existsSync } from 'bare-fs'
import { join, dirname } from 'bare-path'
import { createHash } from 'bare-crypto'

// Every file under a folder (relative paths, sorted), with its kind.
export function walk (root, { skip = () => false } = {}) {
  const out = []
  const visit = rel => {
    for (const name of readdirSync(join(root, rel)).sort()) {
      const r = rel ? `${rel}/${name}` : name
      if (skip(r, name)) continue
      const st = lstatSync(join(root, r))
      if (st.isSymbolicLink()) out.push({ path: r, link: readlinkSync(join(root, r)) })
      else if (st.isDirectory()) visit(r)
      else out.push({ path: r, exec: (st.mode & 0o111) !== 0, size: st.size })
    }
  }
  if (existsSync(root)) visit('')
  return out
}

// A copy of a folder (or a file), symlinks kept as links, the exec bit kept.
export function copy (from, to, opts = {}) {
  const st = lstatSync(from)
  if (!st.isDirectory()) { mkdirSync(dirname(to), { recursive: true }); copyFileSync(from, to); chmodSync(to, st.mode & 0o777); return }
  mkdirSync(to, { recursive: true })
  for (const f of walk(from, opts)) {
    const dest = join(to, f.path)
    mkdirSync(dirname(dest), { recursive: true })
    if (f.link !== undefined) symlinkSync(f.link, dest)
    else { copyFileSync(join(from, f.path), dest); chmodSync(dest, f.exec ? 0o755 : 0o644) }
  }
}

// A folder's identity: its paths, exec bits, links and contents.
export function hashTree (root, paths) {
  const h = createHash('sha256')
  for (const p of paths) {
    const files = lstatSync(join(root, p)).isDirectory() ? walk(join(root, p)).map(f => ({ ...f, path: `${p}/${f.path}` })) : [{ path: p, exec: (lstatSync(join(root, p)).mode & 0o111) !== 0 }]
    for (const f of files) {
      h.update(f.path + '\0')
      if (f.link !== undefined) h.update('link\0' + f.link + '\0')
      else h.update((f.exec ? 'x' : '-') + '\0' + createHash('sha256').update(readFileSync(join(root, f.path))).digest('hex') + '\0')
    }
  }
  return h.digest('hex')
}

export const remove = p => rmSync(p, { recursive: true, force: true })
