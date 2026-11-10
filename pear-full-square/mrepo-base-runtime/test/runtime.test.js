import test from 'brittle'
import { spawnSync } from 'bare-subprocess'
import { mkdtempSync, rmSync, existsSync, readFileSync, readdirSync } from 'bare-fs'
import { join, dirname } from 'bare-path'
import { tmpdir } from 'bare-os'
import { fileURLToPath } from 'bare-url'
import { openStore } from 'p2p-store'
import { mrepos } from 'p2p-mrepo'
import { start, ask, HOST } from '../index.js'
import { bootedHost, send } from './fixture.js'

const here = join(dirname(fileURLToPath(import.meta.url)), '..')
const runtime = (...args) => spawnSync(Bare.argv[0], [join(here, 'runtime.js'), ...args], { stdio: ['ignore', 'pipe', 'pipe'] })

test('version: the module and its version', (t) => {
  const r = runtime('version')
  t.is(r.status, 0)
  t.is(JSON.parse(String(r.stdout)).name, 'mrepo-base-runtime')
})

test('a bad call: exit 2', (t) => {
  t.is(runtime().status, 2)
  t.is(runtime('start').status, 2, 'start needs --work')
})

test('the runtime: started detached, the store held, asked over its connection, stopped', async (t) => {
  const work = mkdtempSync(join(tmpdir(), 'runtime-'))
  try {
    const host = await bootedHost(work)
    t.is(await ask({ work, op: 'status' }), null, 'nothing answers before it starts')
    // Started by a process that then ends: the runtime outlives it.
    const starter = spawnSync(Bare.argv[0], ['-e', `import('${join(here, 'index.js')}').then(m => m.start({ work: '${work}', bundle: '${join(here, 'runtime.js')}' })).then(s => console.log(JSON.stringify(s)))`], { stdio: ['ignore', 'pipe', 'pipe'] })
    t.is(starter.status, 0, String(starter.stderr))
    await new Promise(resolve => setTimeout(resolve, 1000))
    const s = await ask({ work, op: 'status' })
    t.ok(s?.ok, 'it answers, its starter gone')
    t.is(s.repository.id, host.id, 'the host\'s repository')
    t.ok(s.pid > 0)
    t.is((await start({ work, bundle: join(here, 'runtime.js') })).pid, s.pid, 'started again: the one running')
    t.is(runtime('start', `--work=${work}`).status, 1, 'a second runtime: refused (the store is held)')
    const ro = await openStore({ storage: join(work, 'store'), readOnly: true })
    t.is((await mrepos({ store: ro }).open(HOST)).id, host.id, 'a reader meanwhile, read-only')
    await ro.close()
    // A request posted to /inbox: taken in, refused as it executes
    // (initialised, not started), answered.
    t.alike(await send(work, { protocol: 'rest', action: 'get', uri: '/' }), { ok: false, error: 'not now: rest get (the service is initialised, not started)' }, 'taken in and answered: the preloaded initialise ran first')
    t.alike(await ask({ work, op: 'nothing' }), { ok: false, error: 'not a request (status, stop)' })
    t.ok((await ask({ work, op: 'stop' }))?.stopping)
    const alive = pid => spawnSync('kill', ['-0', String(pid)], { stdio: 'ignore' }).status === 0
    for (let i = 0; i < 100 && alive(s.pid); i++) await new Promise(resolve => setTimeout(resolve, 100))
    t.absent(alive(s.pid), 'its process ended')
    t.absent(existsSync(join(work, 'runtime.sock')), 'its connection gone')
    const again = await openStore({ storage: join(work, 'store') })
    t.pass('the store free again: opened writable')
    await again.close()
    // The repository's log: a file a request (its key), one for the runtime.
    const folder = join(work, 'mrepos', 'host', 'log')
    const files = readdirSync(folder).sort()
    const read = f => readFileSync(join(folder, f), 'utf8').trim().split('\n').map(l => JSON.parse(l))
    const tag = r => { const [k] = Object.keys(r.value); return `${k}:${r.value[k]}` }
    const rt = files.filter(f => f.startsWith('runtime-')).map(read)
    t.is(rt.length, 2, 'a runtime file a start: the one that ran, the second that failed')
    t.alike(rt.find(l => l.length === 1).map(r => r.value.error), ['File descriptor could not be locked'], 'the second runtime, failing before its repository opened: in the log folder all the same')
    t.alike(rt.find(l => l.length > 1).map(tag), ['runtime:running', 'runtime:stopping', 'runtime:stopped'])
    t.absent(existsSync(join(work, 'log')), 'no plain file log')
    const requests = files.filter(f => !f.startsWith('runtime-'))
    t.is(requests.length, 2, 'a file a request: the preloaded one, the posted one')
    const journeys = requests.map(f => read(f).map(tag)).sort((a, b) => a.length - b.length)
    t.alike(journeys, [['request:execute', 'execute:done', 'request:done'], ['request:received', 'request:pending', 'request:execute', 'execute:done', 'request:done', 'request:sent back']])
    t.ok(requests.every(f => read(f).every(r => r.topic === '/log' && r.key === f.slice(0, -'.jsonl'.length))), 'every line a record, keyed by its request')
  } finally { rmSync(work, { recursive: true, force: true }) }
})
