import test from 'brittle'
import { spawnSync } from 'bare-subprocess'
import fs, { mkdtempSync, rmSync, readFileSync } from 'bare-fs'
import { join, dirname } from 'bare-path'
import { tmpdir } from 'bare-os'
import { fileURLToPath } from 'bare-url'
import { openRepo, p2pgitBackend } from 'mycelium-git'
import { start, ask, open } from '../index.js'
import { bootedHost, send, sendForm } from './fixture.js'

const here = join(dirname(fileURLToPath(import.meta.url)), '..')
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
const alive = pid => spawnSync('kill', ['-0', String(pid)], { stdio: 'ignore' }).status === 0
const req = (protocol, action, uri, body) => ({ protocol, action, uri, ...(body !== undefined ? { body } : {}) })

// The same cycle on both storages: the p2p host and a repository on native git.
for (const storage of ['p2p', 'git']) {
  test(`the cycle on ${storage}: initialise (preloaded), start, put, get, delete, refused, stop, shutdown`, async (t) => {
    const work = mkdtempSync(join(tmpdir(), `cycle-${storage}-`))
    try {
      await bootedHost(work, { storage })
      const s = await start({ work, bundle: join(here, 'runtime.js') })
      t.ok(s?.pid, 'the runtime started')
      t.is(s.repository.storage, storage)
      t.alike(await send(work, req('service', 'initialise', '/')), { ok: false, error: 'not now: service initialise (the service is initialised)' }, 'initialised already: the preloaded request ran first, this one refused as it executed')
      t.alike(await send(work, req('service', 'start', '/')), { ok: true, value: { service: 'started' } })
      t.alike(await send(work, req('rest', 'put', '/main/notes/hello.json', { text: 'hi' })), { ok: true, value: { put: '/main/notes/hello.json' } })
      t.alike(await send(work, req('rest', 'get', '/main/notes/hello.json')), { ok: true, value: { text: 'hi' } }, 'read back')
      t.alike(await send(work, req('rest', 'get', '/main/notes')), { ok: true, value: { entries: ['hello.json'] } })
      const status = await send(work, req('rest', 'get', '/'))
      t.is(status.value.service, 'started')
      t.alike(status.value.layers, ['inbox', 'main', 'outbox', 'packages', 'request/done', 'request/execute', 'request/pending/default', 'runtime'], 'the layers (the execution branches not among them)')
      t.alike(await send(work, req('rest', 'put', '/packages/x.json', 1)), { ok: false, error: 'not offered: rest put at /packages/x.json' }, 'the API: only what it offers')
      t.alike(await send(work, req('rest', 'get', '/main/none.json')), { ok: false, error: 'nothing at /main/none.json' }, 'failed in execution: answered')
      t.alike(await send(work, { ...req('rest', 'get', '/'), api: 'other' }), { ok: false, error: 'misdelivered: api other, this repository is of type haicc' })
      t.alike(await send(work, req('rest', 'get', '/'), { to: '/elsewhere/inbox' }), { ok: false, error: 'misdelivered: for /elsewhere/inbox, this is /host/inbox' }, 'an envelope for another inbox: refused')
      const form = await sendForm(work, req('rest', 'get', '/main/notes/hello.json'))
      t.is(form.topic, '/haicc/terminal', 'back: the core, its topic the sender')
      t.alike(form.headers, {}, 'no headers yet')
      t.alike(form.value, { api: 'haicc', protocol: 'rest', action: 'get', uri: '/main/notes/hello.json', output: { text: 'hi' } }, 'the form completed: the request and its output')
      t.alike(await send(work, req('rest', 'delete', '/main/notes/hello.json')), { ok: true, value: { deleted: '/main/notes/hello.json' } })
      t.alike(await send(work, req('service', 'stop', '/')), { ok: true, value: { service: 'initialised' } })
      t.alike(await send(work, req('rest', 'get', '/')), { ok: false, error: 'not now: rest get (the service is initialised, not started)' }, 'stopped: the API not available')
      t.alike(await send(work, req('service', 'shutdown', '/')), { ok: true, value: { service: 'booted' } })
      for (let i = 0; i < 100 && alive(s.pid); i++) await wait(100)
      t.absent(alive(s.pid), 'shut down: the runtime ended by itself')
      t.is(await ask({ work, op: 'status' }), null)
      // The record: every request in request/done; the boxes kept.
      const r = await open(work)
      try {
        const repo = openRepo(r.backend)
        const done = await repo.select('/request/done/*')
        t.is(done.length, 16, 'every request done, the refused ones too')
        const recs = await Promise.all(done.map(async ([p]) => JSON.parse((await repo.read(p)).toString())))
        t.ok(recs.every(x => x.topic === '/request/done' && ('output' in x.value.value || 'error' in x.value.value)), 'each in its envelope at its topic, its form completed')
        t.ok(recs.filter(x => x.value.topic === null).length === 1, 'the preloaded one: no sender')
        t.alike(await repo.select('/request/execute/*'), [], 'nothing left executing')
        t.alike(await repo.select('/main/*'), [], 'main: the note deleted again')
        t.is((await repo.select('/inbox/*')).length, 15, 'the inbox: every envelope posted, kept (housekeeping later)')
        t.is((await repo.select('/outbox/*')).length, 15, 'the outbox: every completed form sent back')
        t.is(JSON.parse((await repo.read('/runtime/service.json')).toString()).state, 'booted')
      } finally { await r.close() }
      const log = readFileSync(join(work, 'log', 'runtime.log'), 'utf8').trim().split('\n').map(l => JSON.parse(l))
      t.ok(log.every(r => r.topic === '/log'), 'the log: records')
      t.absent(log.some(r => r.value.runtime === 'failed'), 'nothing failed: ' + JSON.stringify(log.filter(r => r.value.runtime === 'failed')))
      // One request's journey, as the records show it: the put of the note.
      const r2 = await open(work)
      try {
        const repo = openRepo(r2.backend)
        let name = null
        for (const [p] of await repo.select('/inbox/*')) {
          const env = JSON.parse((await repo.read(p)).toString())
          if (env.value.value.action === 'put' && env.value.value.uri === '/main/notes/hello.json') { name = p.slice('/inbox/'.length, -'.json'.length); break }
        }
        const input = JSON.parse((await repo.read(`/inbox/${name}.json`)).toString())
        const about = log.filter(r => r.value.name === name)
        const output = JSON.parse((await repo.read(`/outbox/${name}.json`)).toString())
        t.alike(about.map(r => { const [k] = Object.keys(r.value); return `${k}:${r.value[k]}` }), ['request:received', 'request:pending', 'request:execute', 'execute:done', 'request:done', 'request:sent back'], 'its journey in the log')
        t.alike(about.map(r => r.value.record.topic), ['/host/inbox', '/request/pending/default', '/request/execute', '/request/execute', '/request/done', '/outbox'], 'each transfer: a new envelope, its topic the new place')
        t.ok(about.every(r => r.value.record.value.topic === '/haicc/terminal'), 'the core inside, unchanged in its address')
        t.ok([input, ...about, ...about.map(r => r.value.record), output].every(r => r.key === name), 'one key throughout: the input, every log record, every envelope, the output')
        t.alike(output, about[about.length - 1].value.record, 'the output: the last envelope, as stored in the outbox')
        t.comment(`the journey of ${name} (${storage}): the input, the log, the output, as records`)
        t.comment(`input  ${JSON.stringify(input)}`)
        for (const r of about) t.comment(`log    ${JSON.stringify(r)}`)
        t.comment(`output ${JSON.stringify(output)}`)
      } finally { await r2.close() }
    } finally { rmSync(work, { recursive: true, force: true }) }
  })
}

test('where the layers live on the p2p host: the atomic ones in the store, the rest on disk', async (t) => {
  const work = mkdtempSync(join(tmpdir(), 'cycle-where-'))
  try {
    await bootedHost(work)
    const s = await start({ work, bundle: join(here, 'runtime.js') })
    t.alike(await send(work, req('service', 'start', '/')), { ok: true, value: { service: 'started' } })
    t.alike(await send(work, req('rest', 'put', '/main/x.json', 1)), { ok: true, value: { put: '/main/x.json' } })
    await send(work, req('service', 'stop', '/'))
    await send(work, req('service', 'shutdown', '/'))
    for (let i = 0; i < 100 && alive(s.pid); i++) await wait(100)
    const onDisk = (await p2pgitBackend(join(work, 'mrepos', 'host', '.git'), { fs }).listBranches()).map(([n]) => n)
    t.alike(onDisk, ['execute/main', 'execute/request/execute', 'execute/runtime', 'inbox', 'outbox', 'request/done', 'request/execute', 'request/pending/default'], 'on disk: the boxes, the request layers, the execution branches')
    const { openStore } = await import('p2p-store')
    const { mrepos } = await import('p2p-mrepo')
    const store = await openStore({ storage: join(work, 'store') })
    try {
      const host = await mrepos({ store }).open('host')
      t.alike((await host.backend.listBranches()).map(([n]) => n), ['main', 'packages', 'runtime'], 'in the store: the atomic layers only')
    } finally { await store.close() }
  } finally { rmSync(work, { recursive: true, force: true }) }
})
