import test from 'brittle'
import { createModel } from '../index.js'

test('events fold into hosts, nodes, resources and links; changes are told', (t) => {
  const m = createModel()
  const seen = []
  m.subscribe((e, v) => seen.push([e.kind, v]))
  m.apply({ kind: 'nodeStarting', uri: '/s/a', host: 'host-a', controlled: true })
  m.apply({ kind: 'joined', uri: '/s/a', host: 'host-a', key: 'ka', controlled: true })
  m.apply({ kind: 'joined', uri: '/s/b', host: 'host-b', key: 'kb', controlled: false })
  m.apply({ kind: 'resource', uri: '/s/a/node', node: '/s/a', type: 'node' })
  m.apply({ kind: 'connected', from: '/s/a', toKey: 'kb' })
  m.apply({ kind: 'disconnected', from: '/s/a', toKey: 'kb', bytes: 100 })
  m.apply({ kind: 'changed', uri: '/s/a/node', path: '/main/notes/x.md' })
  m.apply({ kind: 'gone', uri: '/s/b' })
  const s = m.snapshot()
  t.alike(Object.keys(s.hosts), ['host-a', 'host-b'])
  t.is(s.nodes['/s/a'].status, 'running')
  t.is(s.nodes['/s/b'].status, 'gone')
  t.is(s.nodes['/s/b'].controlled, false)
  t.is(s.resources['/s/a/node'].changes, 1)
  const [link] = Object.values(s.links)
  t.alike([link.from, link.to, link.open, link.bytes, link.opened], ['/s/a', '/s/b', false, 100, 1])
  t.is(s.version, 8)
  t.is(seen.length, 8)
})

test('presence, apart from status: absent, present again, left', (t) => {
  const m = createModel()
  m.apply({ kind: 'joined', uri: '/s/a', host: 'h', key: 'ka', controlled: true })
  t.is(m.snapshot().nodes['/s/a'].presence, 'present')
  m.apply({ kind: 'absent', uri: '/s/a', since: 5 })
  t.alike([m.snapshot().nodes['/s/a'].status, m.snapshot().nodes['/s/a'].presence, m.snapshot().nodes['/s/a'].absentSince], ['running', 'absent', 5])
  m.apply({ kind: 'present', uri: '/s/a' })
  t.is(m.snapshot().nodes['/s/a'].presence, 'present')
  t.is(m.snapshot().nodes['/s/a'].absentSince, undefined)
  m.apply({ kind: 'left', uri: '/s/a' })
  m.apply({ kind: 'gone', uri: '/s/a' })
  t.alike([m.snapshot().nodes['/s/a'].status, m.snapshot().nodes['/s/a'].presence], ['gone', 'left'])
  m.apply({ kind: 'absent', uri: '/s/nobody', since: 1 }) // unknown: ignored, still told
  t.is(m.snapshot().nodes['/s/nobody'], undefined)
})
