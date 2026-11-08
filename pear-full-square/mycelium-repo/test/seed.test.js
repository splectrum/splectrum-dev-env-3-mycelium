import test from 'brittle'
import { mkdtempSync } from 'bare-fs'
import { join } from 'bare-path'
import { tmpdir } from 'bare-os'
import { fileURLToPath } from 'bare-url'
import { nativeBackend, isogitBackend, p2pgitBackend, openRepo } from '../../mycelium-git/index.js'
import { seed } from '../index.js'

const template = fileURLToPath(new URL('./template', import.meta.url))
const author = { name: 'test', email: 'test@localhost' }
const time = '2026-01-02T00:00:00Z'
const fresh = () => join(mkdtempSync(join(tmpdir(), 'seed-')), 'repo')

test('seed: the same repository from a template, on every engine', async (t) => {
  const results = []
  for (const make of [nativeBackend, isogitBackend, p2pgitBackend]) {
    const backend = make(fresh())
    const seeded = await seed({ backend, template, source: 'test/template', author, time })
    t.alike(Object.keys(seeded).sort(), ['execute/main', 'main', 'overlay/config', 'pending/default'])
    t.is(seeded['execute/main'], seeded.main)
    const repo = openRepo(backend)
    t.is((await repo.read('/main/readme.md')).toString(), '# Seeded\n')
    t.is((await repo.read('/pending/default/pending/r1/request.md')).toString(), '# Request: r1\n')
    t.is((await backend.readCommit(seeded.main)).message, 'Seed main from test/template\n')
    results.push(seeded)
    await t.exception(seed({ backend, template, author, time }), /not a new repository/)
  }
  t.alike(results[1], results[0])
  t.alike(results[2], results[0])
})
