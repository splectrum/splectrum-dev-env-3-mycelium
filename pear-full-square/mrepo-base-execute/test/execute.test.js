import test from 'brittle'
import { mkdtempSync, rmSync } from 'bare-fs'
import { join } from 'bare-path'
import { tmpdir } from 'bare-os'
import { openStore } from 'p2p-store'
import { mrepos } from 'p2p-mrepo'
import { openRepo, writer } from 'mycelium-git'
import { layer, record, EXECUTE } from 'mrepo-base-request'
import { bootedHost } from '../../mrepo-base-runtime/test/fixture.js'
import { execute } from '../index.js'

// The runtime's context over a booted host, in this process.
async function withHost (work, fn) {
  const store = await openStore({ storage: join(work, 'store') })
  try {
    const host = await mrepos({ store, local: join(work, 'mrepos') }).open('host')
    return await fn({ work, name: host.name, backend: host.backend, repo: openRepo(host.backend), writer: writer(host.backend) })
  } finally { await store.close() }
}
const json = async (repo, p) => JSON.parse((await repo.read(p)).toString())
const run = async (ctx, value) => {
  const name = `${Date.now()}-00000000`
  await layer(ctx, EXECUTE).put(name, record(`/${EXECUTE}`, record('/haicc/terminal', { api: 'haicc', ...value })))
  await execute(ctx)
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
      t.is((await json(ctx.repo, '/runtime/api.json')).api, 'haicc', 'the API extracted from the type\'s package into the runtime layer')
      t.is((await json(ctx.repo, '/runtime/service.json')).state, 'initialised', 'merged back into runtime')
      r = await run(ctx, { protocol: 'service', action: 'start', uri: '/' })
      r = await run(ctx, { protocol: 'rest', action: 'put', uri: '/main/a/b.json', body: { n: 1 } })
      t.alike(r, { ok: true, value: { put: '/main/a/b.json' } }, 'completed: its form filled in, merged into request/execute')
      t.alike(await json(ctx.repo, '/main/a/b.json'), { n: 1 }, 'in main')
      t.alike(await json(ctx.repo, '/execute/main/a/b.json'), { n: 1 }, 'its execution branch beside it')
      const before = (Object.fromEntries(await ctx.backend.listBranches())).main
      r = await run(ctx, { protocol: 'rest', action: 'delete', uri: '/main/none.json' })
      t.alike(r, { ok: false, error: 'nothing at /main/none.json' }, 'failed: its result said')
      t.is((Object.fromEntries(await ctx.backend.listBranches())).main, before, 'and main untouched')
      r = await run(ctx, { protocol: 'service', action: 'start', uri: '/' })
      t.alike(r, { ok: false, error: 'not now: service start (the service is started)' }, 'checked again as it executes')
    })
  } finally { rmSync(work, { recursive: true, force: true }) }
})
