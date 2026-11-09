import test from 'brittle'
import { spawnSync } from 'bare-subprocess'
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'bare-fs'
import { join, dirname } from 'bare-path'
import { tmpdir } from 'bare-os'
import { fileURLToPath } from 'bare-url'
import { openStore } from 'p2p-store'
import { mrepos } from 'p2p-mrepo'
import { start, ask, LEVEL, outbox, received } from '../index.js'

const here = join(dirname(fileURLToPath(import.meta.url)), '..')
const main = (...args) => spawnSync(Bare.argv[0], [join(here, 'main.js'), ...args], { stdio: ['ignore', 'pipe', 'pipe'] })

test('version: the module and its version', (t) => {
  const r = main('version')
  t.is(r.status, 0)
  t.is(JSON.parse(String(r.stdout)).name, 'mycelium-repo-main')
})

test('a bad call: exit 2', (t) => {
  t.is(main().status, 2)
  t.is(main('start').status, 2, 'start needs --work')
})

test('the main thread: started detached, the store held, asked over its connection, stopped', async (t) => {
  const work = mkdtempSync(join(tmpdir(), 'main-'))
  try {
    const store = await openStore({ storage: join(work, 'store') })
    const level = await mrepos({ store }).create(LEVEL)
    await store.close()
    t.is(await ask({ work, op: 'status' }), null, 'nothing answers before it starts')
    // Started by a process that then ends: the main thread outlives it.
    const starter = spawnSync(Bare.argv[0], ['-e', `import('${join(here, 'index.js')}').then(m => m.start({ work: '${work}', bundle: '${join(here, 'main.js')}' })).then(s => console.log(JSON.stringify(s)))`], { stdio: ['ignore', 'pipe', 'pipe'] })
    t.is(starter.status, 0, String(starter.stderr))
    await new Promise(resolve => setTimeout(resolve, 1000))
    const s = await ask({ work, op: 'status' })
    t.ok(s?.ok, 'it answers, its starter gone')
    t.is(s.repository.id, level.id, 'the level\'s repository')
    t.ok(s.pid > 0)
    t.is((await start({ work, bundle: join(here, 'main.js') })).pid, s.pid, 'started again: the one running')
    t.is(main('start', `--work=${work}`).status, 1, 'a second main thread: refused (the store is held)')
    const ro = await openStore({ storage: join(work, 'store'), readOnly: true })
    t.is((await mrepos({ store: ro }).open(LEVEL)).id, level.id, 'a reader meanwhile, read-only')
    await ro.close()
    const m = outbox(work).add({ to: '/level/main/hello', from: null, body: { text: 'hi' } })
    for (let i = 0; i < 50 && !received(work, LEVEL).list().length; i++) await new Promise(resolve => setTimeout(resolve, 100))
    t.alike(received(work, LEVEL).list(), [m], 'a message in the outbox: dispatched, taken in by the repository')
    t.is(received(work, LEVEL).read(m).to, '/main/hello')
    t.alike(await ask({ work, op: 'nothing' }), { ok: false, error: 'not a request (status, stop)' })
    t.ok((await ask({ work, op: 'stop' }))?.stopping)
    const alive = pid => spawnSync('kill', ['-0', String(pid)], { stdio: 'ignore' }).status === 0
    for (let i = 0; i < 100 && alive(s.pid); i++) await new Promise(resolve => setTimeout(resolve, 100))
    t.absent(alive(s.pid), 'its process ended')
    t.absent(existsSync(join(work, 'main.sock')), 'its connection gone')
    const again = await openStore({ storage: join(work, 'store') })
    t.pass('the store free again: opened writable')
    await again.close()
    const log = readFileSync(join(work, 'log', 'main.log'), 'utf8').trim().split('\n').map(l => JSON.parse(l).main)
    t.alike(log.filter(m => m !== 'failed'), ['running', 'dispatched', 'received', 'stopping', 'stopped'])
  } finally { rmSync(work, { recursive: true, force: true }) }
})
