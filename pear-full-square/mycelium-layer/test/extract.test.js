import test from 'brittle'
import fs from 'bare-fs'
import { join } from 'bare-path'
import { tmpdir } from 'bare-os'
import { fileURLToPath } from 'bare-url'
import { fixture } from '../../mycelium-git/test/contract.js'
import { nativeBackend, isogitBackend, p2pgitBackend } from '../../mycelium-git/index.js'
import { deploy, extract } from '../index.js'

const folder = fileURLToPath(new URL('./folder', import.meta.url))
const author = { name: 'test', email: 'test@localhost' }
const time = '2026-01-02T00:00:00Z'

test('extract: files and modes back, provenance beside, a round trip to the same tree', async (t) => {
  for (const make of [nativeBackend, isogitBackend, p2pgitBackend]) {
    const backend = make(fixture())
    const { tree, commit } = await deploy({ backend, layer: 'capability/test', folder, message: 'Deploy', author, time })
    const out = join(fs.mkdtempSync(join(tmpdir(), 'extract-')), 'pkg')
    const p = await extract({ backend, layer: 'capability/test', folder: out, source: 'fixture' })
    t.alike(p, { source: 'fixture', layer: 'capability/test', path: '/', commit, tree, files: 4 })
    t.alike(JSON.parse(fs.readFileSync(`${out}.provenance.json`)), p)
    t.is(fs.readFileSync(join(out, 'sub/b.md'), 'utf8'), 'b\n')
    t.is(fs.readlinkSync(join(out, 'link.md')), 'sub/b.md')
    t.ok(fs.statSync(join(out, 'run.sh')).mode & 0o100)
    t.ok(!(fs.statSync(join(out, 'a.md')).mode & 0o100))
    const again = await deploy({ backend, layer: 'capability/again', folder: out, message: 'Again', author, time })
    t.is(again.tree, tree)

    const sub = await extract({ backend, layer: 'capability/test', path: '/sub', folder: out + '-sub' })
    t.is(sub.files, 1)
    await t.exception(extract({ backend, layer: 'capability/test', folder: out }), /exists/)
    await t.exception(extract({ backend, layer: 'capability/test', path: '/a.md', folder: out + '-x' }), /not a folder/)
    await t.exception(extract({ backend, layer: 'nope', folder: out + '-y' }), /no branch: nope/)
  }
})
