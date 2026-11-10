import test from 'brittle'
import { spawnSync } from 'bare-subprocess'
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'bare-fs'
import { join, dirname } from 'bare-path'
import { tmpdir } from 'bare-os'
import { fileURLToPath } from 'bare-url'
import { openStore } from 'p2p-store'
import { mrepos } from 'p2p-mrepo'
import fs from 'bare-fs'
import { openRepo, p2pgitBackend } from 'mycelium-git'
import { createFs } from 'p2p-git/hyperdrive-fs'
import { start, ask, inbox, outbox } from '../index.js'
import { record } from 'mrepo-base-request'
import { bootedHost } from './fixture.js'

const here = join(dirname(fileURLToPath(import.meta.url)), '..')
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

// A request posted as the terminal's input would; its answer taken.
async function send (work, protocol, action, uri, body) {
  const name = inbox(work).add(record('/inbox', { api: 'haicc', protocol, action, uri, ...(body !== undefined ? { body } : {}) }, { mrepo: { from: null } }))
  for (let i = 0; i < 100 && !outbox(work).list().includes(name); i++) await wait(100)
  const answer = outbox(work).read(name)
  outbox(work).remove(name)
  return answer.value
}

test('the cycle: initialise (preloaded), start, put, get, delete, refused, stop, shutdown', async (t) => {
  const work = mkdtempSync(join(tmpdir(), 'cycle-'))
  try {
    await bootedHost(work)
    const s = await start({ work, bundle: join(here, 'runtime.js') })
    t.ok(s?.pid, 'the runtime started')
    t.alike(await send(work, 'service', 'initialise', '/'), { ok: false, error: 'not now: service initialise (the service is initialised)' }, 'initialised already: the preloaded request ran first, this one refused as it executed')
    t.alike(await send(work, 'service', 'start', '/'), { ok: true, value: { service: 'started' } })
    t.alike(await send(work, 'rest', 'put', '/main/notes/hello.json', { text: 'hi' }), { ok: true, value: { put: '/main/notes/hello.json' } })
    t.alike(await send(work, 'rest', 'get', '/main/notes/hello.json'), { ok: true, value: { text: 'hi' } }, 'read back')
    t.alike(await send(work, 'rest', 'get', '/main/notes'), { ok: true, value: { entries: ['hello.json'] } })
    const status = await send(work, 'rest', 'get', '/')
    t.is(status.value.service, 'started')
    t.alike(status.value.layers, ['main', 'packages', 'request/done', 'request/execute', 'request/pending/default', 'runtime'], 'the layers (the execution branches not among them)')
    t.alike(await send(work, 'rest', 'put', '/packages/x.json', 1), { ok: false, error: 'not offered: rest put at /packages/x.json' }, 'the API: only what it offers')
    t.alike(await send(work, 'rest', 'get', '/main/none.json'), { ok: false, error: 'nothing at /main/none.json' }, 'failed in execution: answered')
    const other = inbox(work).add(record('/inbox', { api: 'other', protocol: 'rest', action: 'get', uri: '/' }, { mrepo: { from: null } }))
    for (let i = 0; i < 50 && !outbox(work).list().includes(other); i++) await wait(100)
    t.is(outbox(work).read(other).value.error, 'misdelivered: api other, this repository is of type haicc')
    outbox(work).remove(other)
    t.alike(await send(work, 'rest', 'delete', '/main/notes/hello.json'), { ok: true, value: { deleted: '/main/notes/hello.json' } })
    t.alike(await send(work, 'service', 'stop', '/'), { ok: true, value: { service: 'initialised' } })
    t.alike(await send(work, 'rest', 'get', '/'), { ok: false, error: 'not now: rest get (the service is initialised, not started)' }, 'stopped: the API not available')
    t.alike(await send(work, 'service', 'shutdown', '/'), { ok: true, value: { service: 'booted' } })
    const alive = pid => spawnSync('kill', ['-0', String(pid)], { stdio: 'ignore' }).status === 0
    for (let i = 0; i < 100 && alive(s.pid); i++) await wait(100)
    t.absent(alive(s.pid), 'shut down: the runtime ended by itself')
    t.is(await ask({ work, op: 'status' }), null)
    // The record: every request in request/done, main's history the puts.
    const store = await openStore({ storage: join(work, 'store'), readOnly: true })
    try {
      const host = await mrepos({ store, local: join(work, 'mrepos') }).open('host')
      const repo = openRepo(host.backend)
      const done = await repo.select('/request/done/*')
      t.is(done.length, 12, 'every request taken in done, those refused as they executed too (the second initialise, the get once stopped); those refused at the inbox not')
      const recs = await Promise.all(done.map(async ([p]) => JSON.parse((await repo.read(p)).toString())))
      t.ok(recs.every(r => r.topic === '/request/done' && r.headers.mrepo.execute.done), 'each a record at its topic, executed')
      const put = recs.find(r => r.value.action === 'put')
      t.ok(put.headers.mrepo.execute.states.main && put.headers.mrepo.execute.merged.main, 'the states it ran on, the merge it made')
      t.alike(await repo.select('/request/execute/*'), [], 'nothing left executing')
      t.alike(await repo.select('/main/*'), [], 'main: the note deleted again')
      t.alike(JSON.parse((await repo.read('/runtime/service.json')).toString()).state, 'booted')
      // Where each layer lives: the atomic ones in the store, the request and
      // execution branches on disk, in the repository's folder.
      const inStore = (await p2pgitBackend('/', { fs: createFs(host.drive) }).listBranches()).map(([n]) => n)
      const onDisk = (await p2pgitBackend(join(work, 'mrepos', 'host', '.git'), { fs }).listBranches()).map(([n]) => n)
      t.alike(inStore, ['main', 'packages', 'runtime'], 'in the store: the atomic layers only')
      t.alike(onDisk, ['execute/main', 'execute/request/execute', 'execute/runtime', 'request/done', 'request/execute', 'request/pending/default'], 'on disk: the request layers and the execution branches')
    } finally { await store.close() }
    const log = readFileSync(join(work, 'log', 'runtime.log'), 'utf8').trim().split('\n').map(l => JSON.parse(l))
    t.absent(log.some(e => e.runtime === 'failed'), 'nothing failed')
    t.ok(existsSync(join(work, 'store')))
  } finally { rmSync(work, { recursive: true, force: true }) }
})
