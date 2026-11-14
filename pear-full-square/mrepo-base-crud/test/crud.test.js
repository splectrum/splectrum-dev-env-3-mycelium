// The crud actions on an execution written here: its files by path, read
// and selected as a repository would, its writes applied at once.
import test from 'brittle'
import { create, read, remove, place, CONFIG, NODE } from '../index.js'

const B = v => Buffer.from(JSON.stringify(v))
const J = b => JSON.parse(b.toString())
// (paths are given relative or slash-led: kept slash-led here)
const abs = p => (p.startsWith('/') ? p : `/${p}`)
function execution (files = {}) {
  const writes = []
  const exec = {
    read: async path => { if (!(abs(path) in files)) throw new Error('none'); return files[abs(path)] },
    // an exact path, or the entries of a folder (<folder>/*): files, and
    // the folders that hold some
    select: async pattern => {
      const p = abs(pattern)
      if (!p.endsWith('/*')) return p in files ? [[p, { type: 'blob' }]] : Object.keys(files).some(f => f.startsWith(p + '/')) ? [[p, { type: 'tree' }]] : []
      const folder = p.slice(0, -1)
      const seen = new Map()
      for (const f of Object.keys(files).filter(f => f.startsWith(folder))) {
        const [name, ...rest] = f.slice(folder.length).split('/')
        if (!seen.has(name)) seen.set(name, [folder + name, { type: rest.length ? 'tree' : 'blob' }])
      }
      return [...seen.values()].sort((a, b) => (a[0] < b[0] ? -1 : 1))
    },
    put: (path, bytes) => { files[abs(path)] = Buffer.from(bytes); writes.push(['put', abs(path)]) },
    remove: path => { delete files[abs(path)]; writes.push(['remove', abs(path)]) },
    commit: async () => {}
  }
  return { exec, files, writes }
}
// A request's URI as the mrepo holds it: from outside the prefix main and
// what was written; the mrepo's own, one segment.
const out = u => ['main', u]
const own = u => [u]

test('where a URI points: its layer, its names, the URI of a node in the same format', (t) => {
  const p = place(out('swarms/swarm-1'))
  t.alike([p.layer, p.names, p.star], ['main', ['swarms', 'swarm-1'], false], 'from outside: main, the names as written')
  t.alike([p.uriOf(['swarms', 'swarm-1']), p.uriOf(['swarms']), p.uriOf([])], [['main', 'swarms/swarm-1'], ['main', 'swarms'], ['main', '.']], 'a node\'s URI: the prefix kept, then its own; the layer itself .')
  const q = place(own('runtime/log/levels'))
  t.alike([q.layer, q.names, q.uriOf(['log'])], ['runtime', ['log', 'levels'], ['runtime/log']], 'the mrepo\'s own: the layer first, in the one segment')
  t.alike([place(out('.')).names, place(out('swarms/*')).names, place(out('swarms/*')).star, place(out('*')).star], [[], ['swarms'], true, true], 'the layer itself; a last name part of *: a selection')
  t.exception(() => place(own('.')), /not a node: \. \(the mrepo itself; a layer first: main\)/)
  t.exception(() => place(out('a/b.json')), /not a name for a node: b\.json/, 'a name, no extension')
  t.exception(() => place(out('*/a')), /not a name for a node: \*/, '* only last')
  t.exception(() => place('main/swarms'), /not a URI: its segments, an array/)
})

test('create: the node and every node above it, each a folder with its document; idempotent', async (t) => {
  const { exec, files, writes } = execution({ '/main/layer.json': B({}) })
  const made = await create(exec, { uri: out('swarms/swarm-1'), args: ['{"size":3}'] })
  t.alike(made, [
    { uri: ['main', 'swarms'], value: {}, children: ['swarm-1'], outcome: 'created' },
    { uri: ['main', 'swarms/swarm-1'], value: { size: 3 }, children: [], outcome: 'created' }
  ], 'what it answers: each node of the path, its URI in the internal format, its document, its children by name, what happened')
  t.alike(Object.keys(files).sort(), ['/main/layer.json', `/main/swarms/${NODE}`, `/main/swarms/swarm-1/${NODE}`], 'stored: a folder a node, its document in it under a hidden name')
  t.alike([J(files[`/main/swarms/${NODE}`]), J(files[`/main/swarms/swarm-1/${NODE}`])], [{}, { size: 3 }], 'the parent an empty document, the node the value given')
  const n = writes.length
  const again = await create(exec, { uri: out('swarms/swarm-1'), args: ['{"size":99}'] })
  t.alike(again.map(x => [x.outcome, x.value]), [['there', {}], ['there', { size: 3 }]], 'again, with another value: there already, left as it is')
  t.is(writes.length, n, 'nothing written')
  const more = await create(exec, { uri: out('swarms/swarm-2') })
  t.alike(more.map(x => [x.uri[1], x.outcome, x.children]), [['swarms', 'there', ['swarm-1', 'swarm-2']], ['swarms/swarm-2', 'created', []]], 'a sibling: its parent there, itself created; no value: an empty document')
  t.alike(J(files[`/main/swarms/swarm-2/${NODE}`]), {})
  await t.exception(create(exec, { uri: out('.') }), /missing argument: target/, 'the layer itself is not created')
  await t.exception(create(exec, { uri: out('swarms/*') }), /one node, not a selection/)
  await t.exception(create(exec, { uri: out('a'), args: ['{not json'] }), /not a document: \{not json \(JSON\)/)
  await t.exception(create(exec, { uri: out('a/b.json') }), /not a name for a node/)
  t.is(writes.length, n + 1, 'a refusal writes nothing')
})

test('read: the nodes a URI selects, an array; none there: empty, not an error', async (t) => {
  const { exec } = execution({ '/main/layer.json': B({}), [`/main/swarms/${NODE}`]: B({ kind: 'group' }), [`/main/swarms/swarm-1/${NODE}`]: B({}), [`/main/swarms/swarm-2/${NODE}`]: B({ size: 2 }), '/main/swarms/swarm-2/.other.json': B({}), '/main/loose/file.json': B({}) })
  t.alike(await read(exec, { uri: out('swarms') }), [{ uri: ['main', 'swarms'], value: { kind: 'group' }, children: ['swarm-1', 'swarm-2'] }], 'one node: an array of one, its children by name only')
  t.alike(await read(exec, { uri: out('swarms/*') }), [{ uri: ['main', 'swarms/swarm-1'], value: {}, children: [] }, { uri: ['main', 'swarms/swarm-2'], value: { size: 2 }, children: [] }], 'a last name part of *: its children, each a node; a hidden file is not a child')
  t.alike(await read(exec, { uri: out('.') }), [{ uri: ['main', '.'], value: {}, children: ['swarms'] }], 'the layer itself: a node, its document {} when it has none; a folder without a document is no node, so no child')
  t.alike((await read(exec, { uri: out('*') })).map(n => n.uri), [['main', 'swarms']], 'its children, read')
  t.alike(await read(exec, { uri: out('swarmz') }), [], 'nothing there (a typo): an empty array, not an error')
  t.alike(await read(exec, { uri: out('swarms/swarm-1/*') }), [], 'no children: empty')
  t.alike(await read(exec, { uri: own('main/swarms/swarm-2') }), [{ uri: ['main/swarms/swarm-2'], value: { size: 2 }, children: [] }], 'the mrepo\'s own: the layer first, the URI answered in the same format')
})

test('delete: the nodes selected made sure to be gone; children only with recurse; idempotent', async (t) => {
  const start = () => execution({ '/main/layer.json': B({}), [`/main/swarms/${NODE}`]: B({}), [`/main/swarms/swarm-1/${NODE}`]: B({}), [`/main/swarms/swarm-1/node-1/${NODE}`]: B({}), [`/main/swarms/swarm-2/${NODE}`]: B({ size: 2 }), [`/main/other/${NODE}`]: B({}) })
  let { exec, files, writes } = start()
  t.alike(await remove(exec, { uri: out('swarms/swarm-2') }), [{ uri: ['main', 'swarms/swarm-2'], value: { size: 2 }, children: [], outcome: 'deleted' }], 'what it answers: the node as it was, deleted')
  t.absent(`/main/swarms/swarm-2/${NODE}` in files, 'its document gone, and with it the folder')
  t.alike(await remove(exec, { uri: out('swarms/swarm-2') }), [], 'again: nothing there, nothing selected, the request succeeds')
  const n = writes.length
  await t.exception(remove(exec, { uri: out('swarms') }), /^Error: swarms has children: not deleted \(crud\/delete swarms recurse\)|swarms has children: not deleted \(crud\/delete swarms recurse\)/, 'a node with children, without recurse: refused, saying how')
  await t.exception(remove(exec, { uri: out('*') }), /swarms has children/, 'a selection with one such node: refused whole')
  t.is(writes.length, n, 'a refusal removes nothing')
  t.alike((await remove(exec, { uri: out('swarms'), args: ['recurse'] })).map(x => [x.uri, x.children, x.outcome]), [[['main', 'swarms'], ['swarm-1'], 'deleted']], 'with recurse: the node answered, as it was')
  t.alike(Object.keys(files).sort(), ['/main/layer.json', `/main/other/${NODE}`], 'everything below it gone with it; nothing else')
  ;({ exec, files } = start())
  t.alike((await remove(exec, { uri: out('swarms/*'), args: ['recurse'] })).map(x => x.uri[1]), ['swarms/swarm-1', 'swarms/swarm-2'], 'a selection: each node of it')
  t.alike(Object.keys(files).sort(), ['/main/layer.json', `/main/other/${NODE}`, `/main/swarms/${NODE}`], 'the children gone, the node itself kept')
  await t.exception(remove(exec, { uri: out('.') }), /missing argument: target/, 'the layer itself is not deleted')
  await t.exception(remove(exec, { uri: out('other'), args: ['all'] }), /not an argument: all \(recurse\)/)
})

test('a shortcut: a node that is a link, read with where it leads; deleted, the link goes; a URI does not run through it', async (t) => {
  const { exec, files } = execution({ '/main/layer.json': B({}), [`/main/host/${NODE}`]: B({}), '/main/host/.shortcuts.json': B([{ mrepo: 'local/host' }]) })
  t.alike(await read(exec, { uri: out('host') }), [{ uri: ['main', 'host'], value: {}, children: [], shortcuts: [{ mrepo: 'local/host' }] }], 'read: a node, with its shortcuts: the mrepos its data comes from')
  await t.exception(read(exec, { uri: out('host/swarms') }), /host is a shortcut: a URI does not run through it \(haicc host haicc swarms \.\.\.\)/, 'below it: not read here; the way across said')
  await t.exception(read(exec, { uri: out('host/*') }), /host is a shortcut: a URI does not run through it \(haicc host haicc \. \.\.\.\)/, 'its children neither')
  await t.exception(create(exec, { uri: out('host/swarms') }), /host is a shortcut/, 'nothing created below it')
  t.alike((await create(exec, { uri: out('host') })).map(x => x.outcome), ['there'], 'itself: there')
  t.alike((await remove(exec, { uri: out('host') })).map(x => [x.shortcuts, x.outcome]), [[[{ mrepo: 'local/host' }], 'deleted']], 'deleted: the node and its link, not what it leads to')
  t.alike(Object.keys(files), ['/main/layer.json'], 'its document and its shortcuts gone')
})

test('another layer, for the mrepo\'s own requests: the same, the layer first', async (t) => {
  const { exec, files } = execution({ '/runtime/layer.json': B({}), '/runtime/host/.shortcuts.json': B([{ mrepo: 'x' }]) })
  t.alike((await create(exec, { uri: own('runtime/log/levels'), args: ['{"level":"info"}'] })).map(x => [x.uri, x.outcome]), [[['runtime/log'], 'created'], [['runtime/log/levels'], 'created']])
  t.alike(J(files[`/runtime/log/levels/${NODE}`]), { level: 'info' })
  t.alike((await create(exec, { uri: own('runtime/host/x') })).map(x => x.outcome), ['created', 'created'], 'shortcuts are main\'s: nothing in the way elsewhere')
})

test('the config: create, read and delete, anywhere in main; no update', (t) => {
  t.alike(Object.keys(CONFIG.actions).sort(), ['create', 'delete', 'read'], 'no update: not there at all')
  for (const a of Object.values(CONFIG.actions)) t.alike(a.uris, ['**'])
  t.alike([CONFIG.actions.create.target, CONFIG.actions.delete.target, CONFIG.actions.read.target], [true, true, undefined], 'create and delete need a target; read takes the root too')
  t.alike([CONFIG.actions.create.args, CONFIG.actions.delete.args], [['value?'], ['recurse?']])
})
