import test from 'brittle'
import { mkdtempSync } from 'bare-fs'
import { join } from 'bare-path'
import { tmpdir } from 'bare-os'
import { fixture } from '../../mycelium-git/test/contract.js'
import { nativeBackend, isogitBackend, p2pgitBackend, openRepo, writer, writeBundle } from '../../mycelium-git/index.js'
import { exportLayer, importBundle } from '../index.js'

const author = { name: 'test', email: 'test@localhost' }
const time = '2026-01-02T00:00:00Z'
const tmp = name => join(mkdtempSync(join(tmpdir(), 'export-')), name)
const engines = [nativeBackend, isogitBackend, p2pgitBackend]

test('export a layer from every engine, import it into every engine', async (t) => {
  for (const makeFrom of engines) {
    const from = makeFrom(fixture())
    const w = writer(from)
    await w.createLayer('data/sets', 'Create', { author, time })
    const c = await w.change('data/sets')
    await c.put('/one.md', 'one')
    const commit = await c.commit('Put', { author, time })
    const file = tmp('sets.bundle')
    t.is((await exportLayer({ backend: from, layer: 'data/sets', file })).commit, commit)
    for (const makeTo of engines) {
      const to = makeTo(fixture())
      const r = await importBundle({ backend: to, file })
      t.alike(r, { commit, objects: 5 }, `${makeFrom.name} → ${makeTo.name}`)
      t.is((await openRepo(to).read('/data/sets/one.md')).toString(), 'one')
      await importBundle({ backend: to, file, as: 'data/again' })
      await t.exception(importBundle({ backend: to, file, as: 'other/x' }), /not a layer/)
    }
  }
})

test('import-bundle refusals', async (t) => {
  const from = nativeBackend(fixture())
  const file = tmp('all.bundle')
  const { writeFileSync } = await import('bare-fs')
  writeFileSync(file, await writeBundle(from, Object.fromEntries(await from.listBranches())))
  const to = nativeBackend(fixture())
  await t.exception(importBundle({ backend: to, file }), /name a branch/)
  await t.exception(importBundle({ backend: to, file, branch: 'data/nope' }), /not in the bundle/)
  await t.exception(exportLayer({ backend: from, layer: 'data/nope', file: tmp('x') }), /no branch/)
})
