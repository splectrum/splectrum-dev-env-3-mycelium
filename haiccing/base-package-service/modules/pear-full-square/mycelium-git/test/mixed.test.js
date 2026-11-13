import test from 'brittle'
import fs, { mkdtempSync, rmSync, mkdirSync } from 'bare-fs'
import { join } from 'bare-path'
import { tmpdir } from 'bare-os'
import { p2pgitBackend, mixedBackend, isLocal, writer, openRepo } from '../index.js'

const author = { name: 'test', email: 'test@localhost' }
async function store (dir) {
  mkdirSync(dir, { recursive: true })
  const b = p2pgitBackend(dir, { fs })
  await b.init()
  return b
}

test('isLocal: the request layers, the boxes and the execution branches on disk, the rest atomic', (t) => {
  for (const n of ['request/pending/default', 'request/execute', 'request/done', 'inbox', 'outbox', 'execute/main', 'execute/request/execute']) t.ok(isLocal(n), n)
  for (const n of ['main', 'packages', 'runtime', 'data/x']) t.absent(isLocal(n), n)
})

test('mixed: each branch in its store; an atomic branch complete in its own store; merges across', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'mixed-'))
  try {
    const atomic = await store(join(dir, 'atomic'))
    const local = await store(join(dir, 'local'))
    const b = mixedBackend({ atomic, local })
    const w = writer(b)
    await w.createLayer('main', 'Create main', { author })
    await w.createLayer('request/execute', 'Create request/execute', { author })
    let c = await w.change('main')
    await c.put('/notes/a.json', Buffer.from('{"a":1}'))
    await c.commit('A note', { author })
    t.alike((await atomic.listBranches()).map(([n]) => n), ['main'], 'main in the atomic store')
    t.alike((await local.listBranches()).map(([n]) => n), ['request/execute'], 'request/execute on disk')
    t.alike((await b.listBranches()).map(([n]) => n), ['main', 'request/execute'], 'listed together')
    t.is((await openRepo(atomic).read('/main/notes/a.json')).toString(), '{"a":1}', 'the atomic store holds what main reaches, on its own')
    // An execution branch from main: on disk; written; merged back into main.
    await w.createExecution('main')
    t.ok((await local.listBranches()).some(([n]) => n === 'execute/main'), 'execute/main on disk')
    c = await w.change('execute/main')
    await c.put('/notes/b.json', Buffer.from('{"b":2}'))
    await c.commit('B, executed', { author })
    await w.merge('execute/main', 'main', 'Merge execute/main', { author })
    const repo = openRepo(atomic)
    t.is((await repo.read('/main/notes/b.json')).toString(), '{"b":2}', 'merged into main: in the atomic store, complete')
    t.is((await repo.read('/main/notes/a.json')).toString(), '{"a":1}')
    // Synced back: a fast-forward of the execution branch to main.
    await w.merge('main', 'execute/main', 'Sync', { author, fastForward: true })
    const heads = Object.fromEntries(await b.listBranches())
    t.is(heads['execute/main'], heads.main, 'execute/main at main')
    t.is((await openRepo(b).read('/execute/main/notes/b.json')).toString(), '{"b":2}', 'read through the mixed backend')
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

// The backend contract, on a mixed backend: the fixture split by layer (its
// execute/main on disk, the rest atomic).
import { contract } from './contract.js'
import { transfer } from '../index.js'
contract('mixed', async gitdir => {
  const atomic = p2pgitBackend(gitdir, { fs })
  const local = await store(mkdtempSync(join(tmpdir(), 'mixed-local-')))
  for (const [name, oid] of await atomic.listBranches()) {
    if (!isLocal(name)) continue
    await transfer(atomic, local, oid)
    await local.updateBranch(name, oid, null)
  }
  return mixedBackend({ atomic, local })
})
