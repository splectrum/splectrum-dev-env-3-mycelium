import test from 'brittle'
import { mkdtempSync, rmSync } from 'bare-fs'
import { join } from 'bare-path'
import { tmpdir } from 'bare-os'
import { openStore } from 'p2p-store'
import { mrepos } from 'p2p-mrepo'
import { openRepo, writer } from 'mycelium-git'
import { layer, record, wrap, complete, guid, begin, EXECUTE } from 'mrepo-base-request'
import { bootedHost } from 'mrepo-base-runtime/test/fixture.js'
import { initialise, start, stop, shutdown, CONFIG } from 'mrepo-base-service'
import { execute, executed, failed, ACTIONS } from '../index.js'

// The protocols as packages would offer them: rest (this module's), service.
const ALL = { ...ACTIONS, service: { initialise, start, stop, shutdown } }
const any = { uris: ['/**'] }
const PROTOCOLS = { service: CONFIG, rest: { gated: true, actions: { get: any, put: any, delete: any } } }

// The runtime's context over a booted host, in this process.
async function withHost (work, fn) {
  const store = await openStore({ storage: join(work, 'store') })
  try {
    const host = await mrepos({ store, local: join(work, 'mrepos') }).open('host')
    return await fn({ work, name: host.name, backend: host.backend, repo: openRepo(host.backend), writer: writer(host.backend), protocols: PROTOCOLS })
  } finally { await store.close() }
}
const json = async (repo, p) => JSON.parse((await repo.read(p)).toString())
const run = async (ctx, value) => {
  const name = `${Date.now()}-00000000`
  await begin(ctx, name, record('/haicc/terminal', { ...value }))
  await execute(ctx, { actions: ALL })
  const core = (await json(ctx.repo, `/${EXECUTE}/${name}.json`)).value
  return 'output' in core.value ? { ok: true, value: core.value.output } : 'error' in core.value ? { ok: false, error: core.value.error } : null
}

test('execute: execution branches from their targets, the record completed, merged back into each target', async (t) => {
  const work = mkdtempSync(join(tmpdir(), 'execute-'))
  try {
    await bootedHost(work, { preload: false })
    await withHost(work, async ctx => {
      let r = await run(ctx, { protocol: 'service', action: 'initialise', uri: '/' })
      t.alike(r, { ok: true, value: { service: 'initialised' } })
      t.is((await json(ctx.repo, '/runtime/service.json')).state, 'initialised', 'merged back into runtime')
      r = await run(ctx, { protocol: 'service', action: 'start', uri: '/' })
      r = await run(ctx, { protocol: 'rest', action: 'put', uri: '/main/a/b.json', body: { n: 1 } })
      t.alike(r, { ok: true, value: { put: '/main/a/b.json' } }, 'completed: its form filled in, merged into request/execute')
      t.alike(await json(ctx.repo, '/main/a/b.json'), { n: 1 }, 'in main')
      t.alike((await ctx.backend.listBranches()).map(([b]) => b).filter(b => b.startsWith('execute/')), [], 'its execution branches, its own by its key: merged back and removed')
      const before = (Object.fromEntries(await ctx.backend.listBranches())).main
      r = await run(ctx, { protocol: 'rest', action: 'delete', uri: '/main/none.json' })
      t.alike(r, { ok: false, error: 'nothing at /main/none.json' }, 'failed: its result said')
      t.is((Object.fromEntries(await ctx.backend.listBranches())).main, before, 'and main untouched')
      r = await run(ctx, { protocol: 'service', action: 'start', uri: '/' })
      t.alike(r, { ok: false, error: 'not now: service start (the service is started)' }, 'checked again as it executes')
    })
  } finally { rmSync(work, { recursive: true, force: true }) }
})

test('the execution context: read-only to the action, the runtime\'s context read through it', async (t) => {
  const work = mkdtempSync(join(tmpdir(), 'execute-'))
  try {
    await bootedHost(work, { preload: false })
    await withHost(work, async ctx => {
      let seen = null
      const actions = { ...ALL, service: { ...ALL.service, initialise: async exec => { seen = { frozen: Object.isFrozen(exec) && Object.isFrozen(exec.runtime), name: exec.runtime.name, writer: 'writer' in exec.runtime, branches: (await exec.runtime.branches()).includes('runtime'), service: JSON.parse((await exec.runtime.read('/runtime/service.json')).toString()).state }; return 'seen' } } }
      const name = guid()
      await begin(ctx, name, record(null, { protocol: 'service', action: 'initialise', uri: '/' }, name))
      await execute(ctx, { actions })
      t.alike(seen, { frozen: true, name: 'host', writer: false, branches: true, service: 'booted' })
    })
  } finally { rmSync(work, { recursive: true, force: true }) }
})

test('local commit and rollback in an action; the global commit at its end, a failure rolling back globally', async (t) => {
  const work = mkdtempSync(join(tmpdir(), 'execute-'))
  try {
    await bootedHost(work, { preload: false })
    await withHost(work, async ctx => {
      await run(ctx, { protocol: 'service', action: 'initialise', uri: '/' })
      await run(ctx, { protocol: 'service', action: 'start', uri: '/' })
      let seen = null
      const go = (fail) => ({ ...ACTIONS, rest: { ...ACTIONS.rest, put: async exec => {
        exec.put('/main/step.json', Buffer.from('1'))
        await exec.commit('first')
        seen = { work: exec.runtime.work, read: (await exec.read('/main/step.json')).toString() }
        exec.remove('/main/step.json')
        exec.put('/main/done.json', Buffer.from('2'))
        if (fail) throw new Error('failed after a local commit')
        return 'ok'
      } } })
      const main = async () => (Object.fromEntries(await ctx.backend.listBranches())).main
      const at = async (repo, p) => (await repo.select(p)).length > 0
      const one = async (fail) => {
        const name = guid()
        await begin(ctx, name, record(null, { protocol: 'rest', action: 'put', uri: '/main/x.json', body: 1 }, name))
        await execute(ctx, { actions: go(fail) })
        return (await json(ctx.repo, `/${EXECUTE}/${name}.json`)).value.value
      }
      const before = await main()
      const bad = await one(true)
      t.is(bad.error, 'failed after a local commit')
      t.is(await main(), before, 'failed: main untouched')
      t.alike((await ctx.backend.listBranches()).map(([b]) => b).filter(b => b.startsWith('execute/')), [], 'its local commit undone: its execution branches discarded')
      const good = await one(false)
      t.is(good.output, 'ok')
      t.alike(seen, { work, read: '1' }, 'after a local commit, reads see it; the work folder in the context')
      t.ok(await at(ctx.repo, '/main/done.json'), 'merged at the end')
      t.absent(await at(ctx.repo, '/main/step.json'), 'with what followed the local commit')
      // discard: the uncommitted writes; rollback: the last local commit
      const back = { ...ACTIONS, rest: { ...ACTIONS.rest, put: async exec => {
        exec.put('/main/committed.json', Buffer.from('3'))
        await exec.commit()
        exec.put('/main/dropped.json', Buffer.from('4'))
        exec.discard()
        exec.put('/main/undone.json', Buffer.from('5'))
        await exec.commit()
        await exec.rollback()
        const n = async p => (await exec.select(p)).length
        const after = { committed: await n('/main/committed.json'), dropped: await n('/main/dropped.json'), undone: await n('/main/undone.json') }
        exec.put('/main/kept.json', Buffer.from('6'))
        return after
      } } }
      const name = guid()
      await begin(ctx, name, record(null, { protocol: 'rest', action: 'put', uri: '/main/x.json', body: 1 }, name))
      await execute(ctx, { actions: back })
      t.alike((await json(ctx.repo, `/${EXECUTE}/${name}.json`)).value.value.output, { committed: 1, dropped: 0, undone: 0 }, 'discard dropped the uncommitted; rollback undid the last commit, not the one before')
      t.ok(await at(ctx.repo, '/main/committed.json'), 'merged: what stayed committed')
      t.absent(await at(ctx.repo, '/main/dropped.json'))
      t.absent(await at(ctx.repo, '/main/undone.json'))
      t.ok(await at(ctx.repo, '/main/kept.json'))
      // reset: everything of the execution ditched, local commits too
      const ditch = { ...ACTIONS, rest: { ...ACTIONS.rest, put: async exec => {
        exec.put('/main/first.json', Buffer.from('6'))
        await exec.commit()
        exec.put('/main/second.json', Buffer.from('7'))
        await exec.reset()
        const after = (await exec.select('/main/first.json')).length
        exec.put('/main/fresh.json', Buffer.from('8'))
        return { after }
      } } }
      const n2 = guid()
      await begin(ctx, n2, record(null, { protocol: 'rest', action: 'put', uri: '/main/x.json', body: 1 }, n2))
      await execute(ctx, { actions: ditch })
      t.alike((await json(ctx.repo, `/${EXECUTE}/${n2}.json`)).value.value.output, { after: 0 }, 'reset: back to the start, its local commit undone')
      t.absent(await at(ctx.repo, '/main/first.json'), 'nothing before the reset merged')
      t.absent(await at(ctx.repo, '/main/second.json'))
      t.ok(await at(ctx.repo, '/main/fresh.json'), 'what came after it: merged')
      t.ok(await at(ctx.repo, '/main/kept.json'), 'what the action wrote after it: merged')
    })
  } finally { rmSync(work, { recursive: true, force: true }) }
})

test('exec.log: entries into the request\'s record, at or above the threshold', async (t) => {
  const work = mkdtempSync(join(tmpdir(), 'execute-'))
  try {
    await bootedHost(work, { preload: false })
    await withHost(work, async ctx => {
      await run(ctx, { protocol: 'service', action: 'initialise', uri: '/' })
      await run(ctx, { protocol: 'service', action: 'start', uri: '/' })
      const logging = { ...ACTIONS, rest: { ...ACTIONS.rest, get: async exec => {
        exec.log('info', 'step', { n: 1 })
        exec.log('debug', 'detail')
        exec.log('warn', 'careful')
        t.exception(() => exec.log('loud', 'x'), /not a log level/)
        return 'logged'
      } } }
      const one = async () => {
        const name = guid()
        await begin(ctx, name, record(null, { protocol: 'rest', action: 'get', uri: '/main' }, name))
        await execute(ctx, { actions: logging })
        return (await json(ctx.repo, `/${EXECUTE}/${name}.json`)).value.value
      }
      const done = await one()
      t.is(done.output, 'logged')
      t.alike(done.log.map(e => [e.level, e.event]), [['info', 'step'], ['warn', 'careful']], 'kept at info and above (debug not)')
      t.is(done.log[0].n, 1, 'with its data')
      t.ok(done.log[0].time, 'and its time')
    })
  } finally { rmSync(work, { recursive: true, force: true }) }
})

test('executed: a form completed elsewhere handed over as execute hands one', async (t) => {
  const work = mkdtempSync(join(tmpdir(), 'execute-'))
  try {
    await bootedHost(work, { preload: false })
    await withHost(work, async ctx => {
      const core = complete(record(null, { protocol: 'service', action: 'boot', uri: '/' }, guid()), { ok: true, value: { booted: true } })
      await executed(ctx, core.key, wrap(`/${EXECUTE}`, core))
      t.alike((await json(ctx.repo, `/${EXECUTE}/${core.key}.json`)).value, core, 'in request/execute, completed')
      t.alike((await ctx.backend.listBranches()).map(([b]) => b).filter(b => b.startsWith('execute/')), [], 'through its own execution branch, removed after')
    })
  } finally { rmSync(work, { recursive: true, force: true }) }
})

test('failed: a runtime\'s error in the request executing', async (t) => {
  const work = mkdtempSync(join(tmpdir(), 'execute-'))
  try {
    await bootedHost(work, { preload: false })
    await withHost(work, async ctx => {
      t.alike(await failed(ctx, 'runtime: x'), [], 'none executing: none completed (the caller says it on stderr)')
      const core = record(null, { protocol: 'service', action: 'initialise', uri: '/' }, guid())
      await begin(ctx, core.key, core)
      t.alike(await failed(ctx, 'runtime: x'), [core.key])
      t.is((await json(ctx.repo, `/${EXECUTE}/${core.key}.json`)).value.value.error, 'runtime: x', 'its form completed with the error: the request protocol moves it to done')
    })
  } finally { rmSync(work, { recursive: true, force: true }) }
})
