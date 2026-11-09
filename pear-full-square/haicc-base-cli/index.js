// haicc-base-cli: HAICC's commands, as a library (haicc.js is the command
// line on it). A command takes its arguments and `{ work }` (the level's
// folder) and returns { code, out }: its exit code (0 done; 1 not done; 2 a
// bad call) and what it prints (JSON). The terminal is the boundary: the
// command line's input is validated here, once.
//   import { commands, version } from 'haicc-base-cli'
//   version            this module's name and version
//   read <uri>         what the level's repository holds at a URI (from a
//                      branch: /main/…, /packages/default/…), read-only: a
//                      file's size (and its text, when small text), a
//                      folder's or a branch's entries; '*' steps select
import { join } from 'bare-path'
import { existsSync } from 'bare-fs'
import { openStore } from 'p2p-store'
import { mrepos } from 'p2p-mrepo'
import { openRepo } from '../mycelium-git/index.js'
import { validate, sameName } from '../mycelium-uri/index.js'
import pkg from './package.json' with { type: 'json' }

export const version = { name: pkg.name, version: pkg.version }
const LEVEL = 'level'

const text = bytes => {
  if (bytes.length > 4096) return null
  const s = bytes.toString('utf8')
  return /[\u0000-\u0008\u000e-\u001f]/.test(s) || s.includes('�') ? null : s
}

export const commands = {
  version: async () => ({ code: 0, out: version }),

  async read ([uri], { work }) {
    let path
    try { path = validate(uri ?? '', { star: true }) } catch (err) { return { code: 2, out: { error: err.message } } }
    if (!work || !existsSync(join(work, 'store'))) return { code: 1, out: { error: `no level here: ${work} (not booted)` } }
    // A short-lived reader beside the level's writer: read-only, a snapshot.
    const store = await openStore({ storage: join(work, 'store'), readOnly: true })
    try {
      const repo = openRepo((await mrepos({ store }).open(LEVEL)).backend)
      const found = await repo.select(path, sameName)
      if (!found.length) return { code: 1, out: { uri: path, error: 'nothing there' } }
      const out = []
      for (const [p, node] of found) {
        if (node.type === 'blob') {
          const bytes = await repo.read(p)
          out.push({ uri: p, type: 'file', bytes: bytes.length, ...(text(bytes) !== null ? { text: text(bytes) } : {}) })
        } else {
          out.push({ uri: p, type: node.type === 'tree' ? 'folder' : 'branches', entries: (await repo.select(p === '/' ? '/*' : `${p}/*`)).map(([q]) => q.split('/').pop()) })
        }
      }
      return { code: 0, out: out.length === 1 ? out[0] : out }
    } finally { await store.close() }
  }
}
