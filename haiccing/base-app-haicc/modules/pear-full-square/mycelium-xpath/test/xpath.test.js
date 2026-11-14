import test from 'brittle'
import { readFileSync } from 'bare-fs'
import { select, objectChildren } from '../index.js'
import { sameName } from 'mycelium-uri'

const tree = JSON.parse(readFileSync(new URL('./tree.json', import.meta.url)))
const kids = objectChildren

test('select: plain steps', async (t) => {
  t.alike(await select(kids, tree, '/main/readme'), [['/main/readme', 'hello']])
  t.alike(await select(kids, tree, '/main/nope'), [])
  t.alike(await select(kids, tree, '/'), [['/', tree]])
  t.alike(await select(kids, tree, '/main/docs'), [['/main/docs', { a: 'A', b: 'B' }]])
  t.alike(await select(kids, tree, '/main/readme/deeper'), [])
})

test('select: * steps', async (t) => {
  t.alike((await select(kids, tree, '/main/*')).map(([p]) => p), ['/main/readme', '/main/README.md', '/main/docs', '/main/src'])
  t.alike(await select(kids, tree, '/main/*/a'), [['/main/docs/a', 'A'], ['/main/src/a', 'srcA']])
  t.alike(await select(kids, tree, '/*/*/docs/a'), [['/overlay/config/docs/a', 'conf']])
  t.alike(await select(kids, tree, '/empty/*'), [])
  t.alike(await select(kids, tree, '/main/readme/*'), [])
})

test('select: exact by default, match for the boundary', async (t) => {
  t.alike(await select(kids, tree, '/main/readme.md'), [])
  t.alike(await select(kids, tree, '/main/README.md'), [['/main/README.md', 'convention']])
  t.alike(await select(kids, tree, '/main/readme.md', sameName), [['/main/README.md', 'convention']])
})

test('async children', async (t) => {
  const slow = async node => kids(node)
  t.alike(await select(slow, tree, '/main/src/*/x'), [['/main/src/lib/x', 'X']])
})
