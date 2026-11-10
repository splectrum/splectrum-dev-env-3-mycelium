import test from 'brittle'
import fs, { mkdtempSync, rmSync, readdirSync } from 'bare-fs'
import { join } from 'bare-path'
import { tmpdir } from 'bare-os'
import { p2pgitBackend, openRepo, writer } from 'mycelium-git'
import { logTo, commitLog, logFolder, logRecord, record, wrap, guid } from '../index.js'

test('the log: a file a request (its key), one for the runtime; the new lines committed into the log layer', async (t) => {
  const work = mkdtempSync(join(tmpdir(), 'logs-'))
  try {
    const backend = p2pgitBackend(join(work, 'mrepos', 'host', '.git'), { fs })
    await backend.init()
    const ctx = { work, name: 'host', backend, repo: openRepo(backend), writer: writer(backend) }
    const append = logTo(work, '2026-11-10T10:00:00.000Z')
    const core = record('/haicc/terminal', { api: 'haicc' }, guid())
    append(logRecord({ runtime: 'running' }))
    append(logRecord({ request: 'pending', name: core.key, record: wrap('/request/pending/default', core) }))
    t.alike(readdirSync(logFolder(work)).sort(), [`${core.key}.jsonl`, 'runtime-2026-11-10T10-00-00-000Z.jsonl'].sort())
    t.alike((await commitLog(ctx)).sort(), [`${core.key}.jsonl`, 'runtime-2026-11-10T10-00-00-000Z.jsonl'].sort(), 'both committed')
    t.alike(await commitLog(ctx), [], 'nothing new: no commit')
    append(logRecord({ request: 'done', name: core.key, record: wrap('/request/done', core) }))
    t.alike(await commitLog(ctx), [`${core.key}.jsonl`], 'only the file with new lines')
    const lines = (await ctx.repo.read(`/log/${core.key}.jsonl`)).toString().trim().split('\n').map(l => JSON.parse(l))
    t.alike(lines.map(r => r.value.request), ['pending', 'done'])
    t.ok(lines.every(r => r.key === core.key && r.topic === '/log'))
    const again = { ...ctx, seen: {} }
    t.alike(await commitLog(again), [], 'after a restart: what the layer holds known, nothing recommitted')
  } finally { rmSync(work, { recursive: true, force: true }) }
})
