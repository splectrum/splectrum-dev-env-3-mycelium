// The runtime as an mrepo's process: bare run.js --work=<folder>, over an
// mrepo on the filesystem storage written here (its layers, no service);
// started, its protocols registered, answering through its inbox, stopped.
import test from '../../modules/node_modules/brittle/index.js'
import process from '../../modules/node_modules/bare-process/index.js'
import { spawn, spawnSync } from '../../modules/node_modules/bare-subprocess/index.js'
import fs, { mkdtempSync, rmSync, writeFileSync, mkdirSync } from '../../modules/node_modules/bare-fs/index.js'
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

// An mrepo, as a deploy of the runtime package alone leaves it: its layers,
// no service (no gate), nothing preloaded.
async function mrepo (work) {
  const gitdir = gitdirOf(work, 'test')
  mkdirSync(gitdir, { recursive: true })
  const backend = p2pgitBackend(gitdir, { fs })
  await backend.init()
  const w = writer(backend)
  for (const l of ['main', 'runtime', 'protocols', 'inbox', 'outbox', 'request/pending/default', 'request/execute', 'request/done']) await w.createLayer(l, `Create ${l}`, { author })
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
    // its own protocols, registered as it started (an internal request)
    const repo = openRepo(backend)
    let registered = null
    for (let i = 0; i < 100 && !registered; i++) { registered = await repo.read('/protocols/runtime.json').then(b => JSON.parse(b.toString()), () => null); if (!registered) await wait(100) }
    t.alike([registered?.package, Object.keys(registered?.actions ?? {})], ['haiccing/base-package-runtime', ['run', 'register']], 'the runtime protocol in its protocols layer')
    t.ok(await repo.read('/protocols/help.json').then(() => true, () => false), 'and help')
    // answering through its inbox
    t.alike((await send(work, backend, { protocol: 'runtime', action: 'register', uri: '/' }))?.output, { registered: ['help', 'runtime'] }, 'a request through its inbox: answered')
    t.is((await send(work, backend, { protocol: 'rest', action: 'get', uri: '/main' }))?.error, 'no protocol: rest (help, runtime)', 'a protocol it does not offer: refused as it executes, said with the protocols there')
    t.ok((await ask({ work, op: 'stop' }))?.stopping, 'asked to stop')
    for (let i = 0; i < 100 && alive(child.pid); i++) await wait(100)
    t.absent(alive(child.pid), 'its process ended')
  } finally { rmSync(work, { recursive: true, force: true }) }
})
