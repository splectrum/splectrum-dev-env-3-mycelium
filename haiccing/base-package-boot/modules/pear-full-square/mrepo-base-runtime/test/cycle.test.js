import test from 'brittle'
import { spawnSync } from 'bare-subprocess'
import fs, { mkdtempSync, rmSync, existsSync } from 'bare-fs'
import { join, dirname } from 'bare-path'
import { tmpdir } from 'bare-os'
import { fileURLToPath } from 'bare-url'
import { openRepo, p2pgitBackend } from 'mycelium-git'
import { start, ask, open } from '../index.js'
import { bootedHost, send, sendForm } from './fixture.js'

const here = join(dirname(fileURLToPath(import.meta.url)), '..')
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
const alive = pid => spawnSync('kill', ['-0', String(pid)], { stdio: 'ignore' }).status === 0
// its fourth: a document, the crud create's argument (JSON text)
const req = (protocol, action, uri, doc) => ({ protocol, action, uri, ...(doc !== undefined ? { args: [typeof doc === 'string' ? doc : JSON.stringify(doc)] } : {}) })
// The nodes the cycle makes, as crud answers them: the note, its parent.
const HELLO = { uri: ['main', 'notes/hello'], value: { text: 'hi' }, children: [] }
const NOTES = { uri: ['main', 'notes'], value: {}, children: ['hello'] }
const CREATED = [{ ...NOTES, outcome: 'created' }, { ...HELLO, outcome: 'created' }]

// The same cycle on both storages: the p2p host and a repository on native git.
for (const storage of ['p2p', 'git']) {
  test(`the cycle on ${storage}: initialise (preloaded), start, create, read, delete, refused, stop, shutdown`, { timeout: 180000 }, async (t) => {
    const work = mkdtempSync(join(tmpdir(), `cycle-${storage}-`))
    try {
      await bootedHost(work, { storage })
      const s = await start({ work, bundle: join(here, 'test', 'runtime.js') })
      t.ok(s?.pid, 'the runtime started')
      t.is(s.repository.storage, storage)
      t.alike(await send(work, req('service', 'initialise', '.')), { ok: false, error: 'not now: service initialise (the service is initialised)' }, 'initialised already: the preloaded request ran first, this one refused as it executed')
      t.alike(await send(work, req('crud', 'read', '.')), { ok: false, error: 'not now: crud read (crud is not active; the service is initialised)' }, 'before start: crud loaded, not active: nothing is by default')
      t.alike(await send(work, req('protocol', 'activate', '.', 'crud')), { ok: false, error: 'not now: protocol activate (protocol is not active; the service is initialised)' }, 'nor can it be activated from outside: that is the hooks\'')
      t.alike(await send(work, req('service', 'start', '.')), { ok: true, value: { service: 'started', state: 'started' } })
      t.alike(await send(work, req('crud', 'create', 'notes/hello', { text: 'hi' })), { ok: true, value: CREATED }, 'written at main, where the outside stands: the node and the one above it made')
      t.alike(await send(work, req('crud', 'read', 'notes/hello')), { ok: true, value: [HELLO] }, 'read back')
      t.alike(await send(work, req('crud', 'read', 'notes')), { ok: true, value: [NOTES] })
      t.alike(await send(work, ['crud/read', 'notes/hello']), { ok: true, value: [HELLO] }, 'a request sent as a command, its parts: interpreted on its way in')
      t.alike(await send(work, { command: 'crud/read ./notes' }), { ok: true, value: [NOTES] }, 'as a string; ./ in front allowed')
      t.alike(await send(work, ['crud']), { ok: false, error: 'no action: crud (crud has no default action)' }, 'not a command that can be told: refused')
      t.alike(await send(work, req('crud', 'read', '.')), { ok: true, value: [{ uri: ['main', '.'], value: {}, children: ['notes'] }] }, '. from outside: main itself')
      t.alike(await send(work, req('crud', 'update', 'notes', 1)), { ok: false, error: 'no action: crud update (create, delete, read)' }, 'the API: only what it offers')
      t.alike(await send(work, req('crud', 'delete', 'notes')), { ok: false, error: 'notes has children: not deleted (crud/delete notes recurse)' }, 'failed in execution: answered')
      t.alike(await send(work, req('crud', 'read', '.'), { to: '/elsewhere/inbox' }), { ok: false, error: 'misdelivered: for /elsewhere/inbox, this is /host/inbox' }, 'an envelope for another inbox: refused')
      const form = await sendForm(work, req('crud', 'read', 'notes/hello'))
      t.is(form.topic, '/haicc/terminal', 'back: the core, its topic the sender')
      t.alike(form.headers, {}, 'no headers yet')
      t.alike(form.value, { protocol: 'crud', action: 'read', uri: ['main', 'notes/hello'], output: [HELLO] }, 'the form completed: the request, its URI as held inside, and its output')
      t.alike(await send(work, req('crud', 'delete', 'notes', 'recurse')), { ok: true, value: [{ ...NOTES, outcome: 'deleted' }] }, 'deleted, with what was below it')
      t.alike(await send(work, req('service', 'stop', '.')), { ok: true, value: { service: 'stopped', state: 'initialised' } })
      t.alike(await send(work, req('crud', 'read', '.')), { ok: false, error: 'not now: crud read (crud is not active; the service is initialised)' }, 'stopped: crud deactivated by the stop hook, not available')
      t.alike(await send(work, req('service', 'shutdown', '.')), { ok: true, value: { service: 'shut down', state: 'booted' } })
      t.ok(alive(s.pid), 'shut down: its service booted again, the runtime still running (it runs until stopped)')
      t.ok((await ask({ work, op: 'stop' }))?.stopping, 'asked to stop')
      for (let i = 0; i < 100 && alive(s.pid); i++) await wait(100)
      t.absent(alive(s.pid), 'stopped')
      t.is(await ask({ work, op: 'status' }), null)
      // The record: every request in request/done; the boxes kept.
      const r = await open(work)
      try {
        const repo = openRepo(r.backend)
        const done = await repo.select('/request/done/*')
        t.is(done.length, 21, 'every request done, the refused ones too, and the boot hook')
        const recs = await Promise.all(done.map(async ([p]) => JSON.parse((await repo.read(p)).toString())))
        t.ok(recs.every(x => x.topic === '/request/done' && ('output' in x.value.value || 'error' in x.value.value)), 'each in its envelope at its topic, its form completed')
        t.is(recs.filter(x => x.value.topic === null).length, 2, 'the preloaded one and the boot hook: no sender')
        t.alike((await repo.select('/protocols/*')).map(([p]) => p), ['/protocols/service.json'], 'the active set: service (the boot hook); crud activated by start, deactivated by stop')
        t.alike((await r.backend.listBranches()).map(([b]) => b).filter(b => !b.startsWith('execute/')).sort(), ['inbox', 'main', 'outbox', 'packages', 'protocols', 'request/done', 'request/execute', 'request/pending/default', 'runtime'], 'the layers (the execution branches not among them)')
        t.alike(await repo.select('/request/execute/*'), [], 'nothing left executing')
        t.alike(await repo.select('/main/*'), [], 'main: the note deleted again')
        t.is((await repo.select('/inbox/*')).length, 19, 'the inbox: every envelope posted, kept (housekeeping later)')
        t.is((await repo.select('/outbox/*')).length, 19, 'the outbox: every completed form sent back')
        t.is(JSON.parse((await repo.read('/runtime/service.json')).toString()).state, 'booted')
      } finally { await r.close() }
      t.absent(existsSync(join(work, 'mrepos', 'host', 'log')), 'no log folder')
      // One request's journey, as the records show it: the put of the note,
      // posted, done, sent back; each move a commit of the request layers.
      const r2 = await open(work)
      try {
        const repo = openRepo(r2.backend)
        let name = null
        for (const [p] of await repo.select('/inbox/*')) {
          const env = JSON.parse((await repo.read(p)).toString())
          if (env.value.value.action === 'create' && env.value.value.uri === 'notes/hello') { name = p.slice('/inbox/'.length, -'.json'.length); break }
        }
        const input = JSON.parse((await repo.read(`/inbox/${name}.json`)).toString())
        const done = JSON.parse((await repo.read(`/request/done/${name}.json`)).toString())
        const output = JSON.parse((await repo.read(`/outbox/${name}.json`)).toString())
        t.alike([input.topic, done.topic, output.topic], ['/host/inbox', '/request/done', '/outbox'], 'each place: a new envelope, its topic the place')
        t.ok([input, done, output].every(r => r.key === name && r.value.key === name), 'one key throughout: every envelope, its core')
        t.alike(done.value, output.value, 'the core completed: in done, and sent back')
        t.alike({ ...input.value, value: { ...input.value.value, uri: ['main', 'notes/hello'], output: CREATED } }, done.value, 'the core as posted, its URI as held inside, completed (its output)')
        t.comment(`the journey of ${name} (${storage}): the input, the done request, the output, as records`)
        t.comment(`input  ${JSON.stringify(input)}`)
        t.comment(`done   ${JSON.stringify(done)}`)
        t.comment(`output ${JSON.stringify(output)}`)
      } finally { await r2.close() }
    } finally { rmSync(work, { recursive: true, force: true }) }
  })
}

test('where the layers live on the p2p host: the atomic ones in the store, the rest on disk', { timeout: 120000 }, async (t) => {
  const work = mkdtempSync(join(tmpdir(), 'cycle-where-'))
  try {
    await bootedHost(work)
    const s = await start({ work, bundle: join(here, 'test', 'runtime.js') })
    t.alike(await send(work, req('service', 'start', '.')), { ok: true, value: { service: 'started', state: 'started' } })
    t.alike(await send(work, req('crud', 'create', 'x')), { ok: true, value: [{ uri: ['main', 'x'], value: {}, children: [], outcome: 'created' }] })
    await send(work, req('service', 'stop', '.'))
    await send(work, req('service', 'shutdown', '.'))
    await ask({ work, op: 'stop' })
    for (let i = 0; i < 100 && alive(s.pid); i++) await wait(100)
    const onDisk = (await p2pgitBackend(join(work, 'mrepos', 'host', '.git'), { fs }).listBranches()).map(([n]) => n)
    t.alike(onDisk, ['inbox', 'outbox', 'request/done', 'request/execute', 'request/pending/default'], 'on disk: the boxes, the request layers (a request\'s execution branches there too while it runs: none left)')
    const { openStore } = await import('p2p-store')
    const { mrepos } = await import('p2p-mrepo')
    const store = await openStore({ storage: join(work, 'store') })
    try {
      const host = await mrepos({ store }).open('host')
      t.alike((await host.backend.listBranches()).map(([n]) => n), ['main', 'packages', 'protocols', 'runtime'], 'in the store: the atomic layers only')
    } finally { await store.close() }
  } finally { rmSync(work, { recursive: true, force: true }) }
})
