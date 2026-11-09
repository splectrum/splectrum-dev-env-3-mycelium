// haicc-base-cli: HAICC's commands, as a library (haicc.js is the command
// line on it). A command takes its arguments and `{ work }` (the level's
// folder) and returns { code, out }: its exit code (0 done; 1 not done; 2 a
// bad call) and what it prints (JSON). The terminal is the boundary: the
// command line's input is validated here, once.
//   import { commands, version } from 'haicc-base-cli'
//   version            this module's name and version
//   status             the level at a glance, read-only: its repository (name,
//                      id, key), its main thread (running: its pid, since
//                      when; or not), its layers, the pinned manifest's
//                      sequence, each package installed (its id, its size,
//                      deployed or not)
//   start              the level's main thread started, if it is not running
//   stop               the level's main thread stopped (the store released)
//   read <uri>         what the level's repository holds at a URI (from a
//                      branch: /main/…, /packages/…), read-only: a file's
//                      size (and its text, when small text), a folder's or a
//                      branch's entries; '*' steps select
import { join } from 'bare-path'
import { existsSync, statSync } from 'bare-fs'
import { openStore } from 'p2p-store'
import { mrepos } from 'p2p-mrepo'
import { openRepo } from '../mycelium-git/index.js'
import { validate, sameName } from '../mycelium-uri/index.js'
import { ask, start as startMain } from '../mycelium-repo-main/index.js'
import pkg from './package.json' with { type: 'json' }

export const version = { name: pkg.name, version: pkg.version }
const LEVEL = 'level'

const text = bytes => {
  if (bytes.length > 4096) return null
  const s = bytes.toString('utf8')
  return /[\u0000-\u0008\u000e-\u001f]/.test(s) || s.includes('�') ? null : s
}

// The level's repository, opened read-only for one command (a short-lived
// reader beside the level's writer: a snapshot).
async function withLevel (work, fn) {
  if (!work || !existsSync(join(work, 'store'))) return { code: 1, out: { error: `no level here: ${work} (not booted)` } }
  const store = await openStore({ storage: join(work, 'store'), readOnly: true })
  try { return await fn(await mrepos({ store }).open(LEVEL)) } finally { await store.close() }
}

export const commands = {
  version: async () => ({ code: 0, out: version }),

  status: async (args, { work }) => withLevel(work, async level => {
    const repo = openRepo(level.backend)
    const layers = []
    for (const pattern of ['/*', '/*/*', '/*/*/*']) {
      for (const [p, node] of await repo.select(pattern)) if (node.type === 'tree' && !layers.some(l => p.startsWith(l + '/'))) layers.push(p)
    }
    const manifest = JSON.parse((await repo.read('/packages/manifest.json')).toString())
    const installed = (await repo.select('/packages/*/*')).map(([p]) => p).filter(p => p.endsWith('.bundle')).map(p => p.slice('/packages/'.length, -'.bundle'.length))
    const packages = installed.map(key => ({
      package: key,
      id: manifest.packages[key]?.id?.slice(0, 16) ?? null,
      bytes: manifest.packages[key]?.bytes ?? null,
      deployed: existsSync(join(work, 'haicc', 'packages', `${key}.bundle`))
    }))
    const m = await ask({ work, op: 'status' })
    const main = m ? { running: true, pid: m.pid, started: m.started } : { running: false }
    return { code: 0, out: { level: { repository: level.name, id: level.id, key: level.key, work }, main, layers: layers.sort(), manifest: { sequence: manifest.sequence, signed: Boolean(manifest.signature), runtime: manifest.runtime }, packages } }
  }),

  async start (args, { work }) {
    if (!work || !existsSync(join(work, 'store'))) return { code: 1, out: { error: `no level here: ${work} (not booted)` } }
    const m = await startMain({ work })
    return m ? { code: 0, out: { main: { running: true, pid: m.pid, started: m.started } } } : { code: 1, out: { error: 'the main thread did not start (see log/main.log)' } }
  },

  async stop (args, { work }) {
    const r = await ask({ work, op: 'stop' })
    return r ? { code: 0, out: { main: { stopping: true } } } : { code: 1, out: { error: 'no main thread running here' } }
  },

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
