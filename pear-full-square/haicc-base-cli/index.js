// haicc-base-cli: HAICC's commands, as a library (haicc.js is the command
// line on it). A command takes its arguments and `{ work }` (the host's
// folder) and returns { code, out }: its exit code (0 done; 1 not done; 2 a
// bad call) and what it prints (JSON). The terminal is the boundary: the
// command line's input is validated here, once.
//   import { commands, version } from 'haicc-base-cli'
//   version            this module's name and version
//   status             the host at a glance, read-only: its repository (name,
//                      id, key), its runtime (running: its pid, since
//                      when; or not), its layers, the pinned manifest's
//                      sequence, each package installed (its id, its size,
//                      deployed or not), the messages waiting in its boxes
//   start              the host's runtime started, if it is not running
//   stop               the host's runtime stopped (the store released)
//   read <uri>         what the host's repository holds at a URI (from a
//                      branch: /main/…, /packages/…), read-only: a file's
//                      size (and its text, when small text), a folder's or a
//                      branch's entries; '*' steps select
//   post <uri> <json>  a value POSTed to a URI of the host (its root the
//                      host's repository): input from outside the root,
//                      through its mapping (none -> host: validated here, the
//                      URI and the JSON; only POST /inbox allowed): the
//                      message { from: null, body } a new document in
//                      <work>/mrepos/host/inbox, taken in by the runtime.
import { join } from 'bare-path'
import { existsSync, statSync } from 'bare-fs'
import { openStore } from 'p2p-store'
import { mrepos } from 'p2p-mrepo'
import { openRepo } from '../mycelium-git/index.js'
import { validate, sameName } from '../mycelium-uri/index.js'
import { ask, start as startRuntime, HOST, INBOX, inbox, outbox, viewOf } from '../mrepo-base-runtime/index.js'
import pkg from './package.json' with { type: 'json' }

export const version = { name: pkg.name, version: pkg.version }

const text = bytes => {
  if (bytes.length > 4096) return null
  const s = bytes.toString('utf8')
  return /[\u0000-\u0008\u000e-\u001f]/.test(s) || s.includes('�') ? null : s
}

// The host's repository, opened read-only for one command (a short-lived
// reader beside the host's writer: a snapshot).
async function withHost (work, fn) {
  if (!work || !existsSync(join(work, 'store'))) return { code: 1, out: { error: `no host here: ${work} (not booted)` } }
  const store = await openStore({ storage: join(work, 'store'), readOnly: true })
  try { return await fn(await mrepos({ store }).open(HOST)) } finally { await store.close() }
}

export const commands = {
  version: async () => ({ code: 0, out: version }),

  status: async (args, { work }) => withHost(work, async host => {
    const repo = openRepo(host.backend)
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
      deployed: existsSync(join(viewOf(work, HOST), 'packages', `${key}.bundle`))
    }))
    const m = await ask({ work, op: 'status' })
    const runtime = m ? { running: true, pid: m.pid, started: m.started } : { running: false }
    const boxes = { inbox: inbox(work).list().length, outbox: outbox(work).list().length }
    return { code: 0, out: { host: { repository: host.name, id: host.id, key: host.key, work }, runtime, layers: layers.sort(), manifest: { sequence: manifest.sequence, signed: Boolean(manifest.signature), runtime: manifest.runtime }, packages, boxes } }
  }),

  async start (args, { work }) {
    if (!work || !existsSync(join(work, 'store'))) return { code: 1, out: { error: `no host here: ${work} (not booted)` } }
    const m = await startRuntime({ work })
    return m ? { code: 0, out: { runtime: { running: true, pid: m.pid, started: m.started } } } : { code: 1, out: { error: 'the runtime did not start (see log/runtime.log)' } }
  },

  async stop (args, { work }) {
    const r = await ask({ work, op: 'stop' })
    return r ? { code: 0, out: { runtime: { stopping: true } } } : { code: 1, out: { error: 'no runtime running here' } }
  },

  async post ([uri, body], { work }) {
    let to, value
    try { to = validate(uri ?? '') } catch (err) { return { code: 2, out: { error: err.message } } }
    if (to !== INBOX) return { code: 2, out: { error: `not allowed: POST ${to} (from outside, only POST ${INBOX})` } }
    try { value = JSON.parse(body ?? '') } catch { return { code: 2, out: { error: `not a JSON value: ${body ?? '(none)'}` } } }
    if (!work || !existsSync(join(work, 'store'))) return { code: 1, out: { error: `no host here: ${work} (not booted)` } }
    const name = inbox(work).add({ from: null, body: value })
    return { code: 0, out: { uri: `${INBOX}/${name}` } }
  },

  async read ([uri], { work }) {
    let path
    try { path = validate(uri ?? '', { star: true }) } catch (err) { return { code: 2, out: { error: err.message } } }
    if (!work || !existsSync(join(work, 'store'))) return { code: 1, out: { error: `no host here: ${work} (not booted)` } }
    // A short-lived reader beside the host's writer: read-only, a snapshot.
    const store = await openStore({ storage: join(work, 'store'), readOnly: true })
    try {
      const repo = openRepo((await mrepos({ store }).open(HOST)).backend)
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
