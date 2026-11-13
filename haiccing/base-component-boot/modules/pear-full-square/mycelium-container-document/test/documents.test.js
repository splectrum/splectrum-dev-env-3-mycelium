import test from 'brittle'
import { mkdtempSync, rmSync, readdirSync, writeFileSync } from 'bare-fs'
import { join } from 'bare-path'
import { tmpdir } from 'bare-os'
import * as json from 'mycelium-value-json'
import { documents, newName } from '../index.js'

test('documents: written, listed in order, read, removed', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'docs-'))
  try {
    const box = documents(join(dir, 'box'), json)
    t.alike(box.list(), [], 'no folder yet: none')
    const a = box.add({ n: 1 })
    const b = box.add({ n: 2 })
    t.ok(/^\d{13}-[0-9a-f]{8}$/.test(a), 'a time-ordered name')
    box.write('zz', { n: 3 })
    t.alike(box.list(), [a, b, 'zz'].sort())
    t.alike(box.read(b), { n: 2 })
    t.alike(readdirSync(join(dir, 'box')).sort(), [a + '.json', b + '.json', 'zz.json'].sort(), 'no temporary file left')
    writeFileSync(join(dir, 'box', 'half.json.part'), '{"n":')
    t.absent(box.list().includes('half'), 'a document being written: not listed')
    box.remove(a)
    t.absent(box.list().includes(a))
    const names = Array.from({ length: 100 }, newName)
    t.alike([...names].sort(), names, 'in one process: in the order made, even within a millisecond')
  } finally { rmSync(dir, { recursive: true, force: true }) }
})
