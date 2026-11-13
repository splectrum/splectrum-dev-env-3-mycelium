// The runtime as an mrepo's process: bare run.js --work=<folder>, over an
// mrepo on the filesystem storage written here (its layers, no service);
// started, its protocols registered, answering through its inbox, stopped.
import test from '../../modules/node_modules/brittle/index.js'
import process from '../../modules/node_modules/bare-process/index.js'
import { spawn, spawnSync } from '../../modules/node_modules/bare-subprocess/index.js'
import fs, { mkdtempSync, rmSync, writeFileSync, mkdirSync, readdirSync, readFileSync } from '../../modules/node_modules/bare-fs/index.js'
import { join, dirname } from '../../modules/node_modules/bare-path/index.js'
import os, { tmpdir } from '../../modules/node_modules/bare-os/index.js'
import { fileURLToPath } from '../../modules/node_modules/bare-url/index.js'
import { openRepo, writer, p2pgitBackend } from '../../modules/pear-full-square/mycelium-git/index.js'
import { record, wrap, guid, gitdirOf, viewOf } from '../../modules/pear-full-square/mrepo-base-request/index.js'
import { ask } from '../../modules/pear-full-square/mrepo-base-runtime/index.js'

const pkg = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
const alive = pid => spawnSync('kill', ['-0', String(pid)], { stdio: 'ignore' }).status === 0
const author = { name: 'test', email: 'test@localhost' }

// An mrepo from the runtime package's part of the structure alone: its
// layers, its boot hooks (the package's own, mrepo/runtime/hooks/boot/),
// no package linked, nothing preloaded.
async function mrepo (work) {
  const gitdir = gitdirOf(work, 'test')
  mkdirSync(gitdir, { recursive: true })
  const backend = p2pgitBackend(gitdir, { fs })
  await backend.init()
  const w = writer(backend)
  for (const l of ['main', 'runtime', 'protocols', 'inbox', 'outbox', 'request/pending/default', 'request/execute', 'request/done']) await w.createLayer(l, `Create ${l}`, { author })
  const hooks = join(pkg, 'mrepo', 'runtime', 'hooks', 'boot')
  const r = await w.change('runtime')
  for (const f of readdirSync(hooks).sort()) await r.put(`/hooks/boot/${f}`, readFileSync(join(hooks, f)))
  await r.commit('Its boot hooks', { author })
  mkdirSync(join(viewOf(work, 'test'), 'inbox'), { recursive: true })
  writeFileSync(join(work, 'mrepo.json'), JSON.stringify({ storage: 'filesystem', name: 'test' }))
  return backend
}

async function send (work, backend, form) {
  const core = record('/test', { ...form }, guid())
  writeFileSync(join(viewOf(work, 'test'), 'inbox', `${core.key}.json`), JSON.stringify(wrap('/test/inbox', core)))
  const repo = openRepo(backend)
  for (let i = 0; i < 100; i++) {
    const back = await repo.read(`/outbox/${core.key}.json`).then(b => JSON.parse(b.toString()), () => null)
    if (back) return back.value.value
    await wait(100)
  }
  return null
}

test('the runtime: started, answering, stopped', { timeout: 60000 }, async (t) => {
  const work = mkdtempSync(join(tmpdir(), 'runtime-'))
  try {
    const backend = await mrepo(work)
    // RUNTIME: the bundle to test instead of this folder's run.js (the release check)
    const entry = process.env.RUNTIME || join(pkg, 'run.js')
    const child = spawn(os.execPath(), [entry, `--work=${work}`], { stdio: 'ignore' })
    let s = null
    for (let i = 0; i < 100 && !s; i++) { s = await ask({ work, op: 'status' }); if (!s) await wait(100) }
    t.alike(s?.repository, { name: 'test', uri: 'test', storage: 'filesystem', id: null, key: null }, 'running: the mrepo, on the filesystem; no unique URI of its own: its name')
    // Its boot hooks, placed as its own requests as it started, each done
    // before it took anything in. This mrepo is the runtime package's part
    // alone: it links no package, so the protocols its hooks name are not
    // there, and each says so.
    const repo = openRepo(backend)
    let done = []
    for (let i = 0; i < 100 && done.length < 3; i++) {
      done = []
      for (const [p] of await repo.select('/request/done/*')) if (!p.endsWith('layer.json')) done.push(JSON.parse((await repo.read(p)).toString()).value.value)
      if (done.length < 3) await wait(100)
    }
    t.alike(done.map(f => f.command.join(' ')).sort(), ['help/extract', 'protocol/activate / help', 'protocol/activate / runtime'], 'its boot hooks: each a request of its own, done')
    t.ok(done.every(f => /^no protocol: (help|protocol) \(runtime\)$/.test(f.error ?? '')), 'none of them possible here: no package linked, said')
    t.alike(await repo.select('/protocols/*'), [], 'so nothing is active')
    // through its inbox: nothing is active by default
    t.is((await send(work, backend, { protocol: 'runtime', action: 'run', uri: '/packages/haiccing/x/test/validate' }))?.error, 'not now: runtime run (runtime is not active)', 'a request from outside for a protocol that is loaded and not active: refused as it executes')
    t.is((await send(work, backend, { protocol: 'rest', action: 'get', uri: '/main' }))?.error, 'no protocol: rest ()', 'a protocol it does not have: refused at once, said with the active ones (none)')
    t.ok((await ask({ work, op: 'stop' }))?.stopping, 'asked to stop')
    for (let i = 0; i < 100 && alive(child.pid); i++) await wait(100)
    t.absent(alive(child.pid), 'its process ended')
  } finally { rmSync(work, { recursive: true, force: true }) }
})
