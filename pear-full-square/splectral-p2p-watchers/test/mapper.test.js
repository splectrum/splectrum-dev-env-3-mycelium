// The p2p records mapped into the abstract world, without p2p words in it.
import test from 'brittle'
import createMapper from '../mapper.js'

const ctx = { host: 'host-a', uri: '/hosts/node-1', container: 'c1' }
const log = { holds: 'haicc-node/log', context: ctx }
const box = { holds: 'haicc-node/container', context: ctx }
const r = value => ({ value: { time: 1, ...value } })

test('a node\'s container and its log into nodes, resources, links, presence and requests', (t) => {
  const map = createMapper()
  const out = []
  out.push(...map(r({ kind: 'following' }), box))
  out.push(...map(r({ module: 'p2p-node', kind: 'node-started', owner: 'ka' }), log))
  out.push(...map(r({ module: 'p2p-node', kind: 'live', uri: '/hosts/node-1/node' }), log))
  out.push(...map(r({ module: 'p2p-connect', kind: 'connection-opened', peer: 'kb' }), log))
  out.push(...map(r({ module: 'p2p-rns', kind: 'node-absent', uri: '/hosts/node-2', lastSeen: 10, leaseMs: 5 }), log))
  out.push(...map(r({ module: 'p2p-rns', kind: 'node-present', uri: '/hosts/node-2' }), log))
  out.push(...map(r({ module: 'p2p-rns', kind: 'node-left', uri: '/hosts/node-2' }), log))
  out.push(...map(r({ module: 'p2p-node', kind: 'node-absent', uri: '/x' }), log)) // only p2p-rns says presence
  out.push(...map(r({ kind: 'request-taken', name: 'q1', sender: 'kc', repository: 'node' }), log))
  out.push(...map(r({ kind: 'requests-executed', executed: ['q1'] }), log))
  out.push(...map(r({ kind: 'connection-closed', peer: 'kb', bytesReceived: 10, bytesSent: 5 }), log))
  out.push(...map(r({ kind: 'exited', exitCode: 0 }), box))
  t.alike(out.map(e => e.kind), ['nodeStarting', 'joined', 'resource', 'connected', 'absent', 'present', 'left', 'requestSent', 'requestAnswered', 'disconnected', 'gone'])
  t.alike(out[1], { kind: 'joined', uri: '/hosts/node-1', host: 'host-a', key: 'ka', controlled: true, time: 1 })
  t.is(out[4].since, 15)
  t.is(out[9].bytes, 15)
})

test('the master\'s genesis: its repositories as resources', (t) => {
  const map = createMapper()
  const m = { holds: 'haicc-node/log', context: { host: 'host-a', uri: '/hosts/master' } }
  t.alike(map(r({ module: 'p2p-node', kind: 'genesis', packages: {}, boot: {}, deployment: {} }), m).map(e => e.uri), ['/hosts/master/packages', '/hosts/master/boot', '/hosts/master/deployment'])
  t.alike(map(r({ kind: 'something-else' }), { holds: 'other', context: {} }), [])
})

test('a node a node manager runs, on a host of its own: not controlled; its lines wait for its manager', (t) => {
  const map = createMapper()
  const mgr = { holds: 'p2p-node-manager/manager', context: { host: 'host-b', folder: 'hosts-remote-1' } }
  const nl = { holds: 'p2p-node/log', context: { host: 'host-b', folder: 'hosts-remote-1' } }
  const out = []
  out.push(...map(r({ module: 'p2p-connect', kind: 'connection-opened', peer: 'kb' }), nl))
  t.is(out.length, 0, 'waits for its manager')
  out.push(...map(r({ kind: 'starting', swarm: 'hosts', name: 'remote-1' }), mgr))
  out.push(...map(r({ module: 'p2p-node', kind: 'node-started', owner: 'kr' }), nl))
  out.push(...map(r({ kind: 'node-ready', uri: '/hosts/remote-1', key: 'kr' }), mgr))
  out.push(...map({ value: { time: 1, kind: 'action-result', action: 'write', ok: true, result: { uri: '/hosts/remote-1/node', path: '/main/notes/hello.md' } }, headers: [{ key: 'correlation', value: '3' }] }, nl))
  out.push(...map(r({ kind: 'container-exited', exitCode: 0 }), mgr))
  t.alike(out.map(e => e.kind), ['nodeStarting', 'connected', 'joined', 'actionResult', 'changed', 'gone'])
  t.is(out[0].controlled, false)
  t.is(out[2].controlled, false)
  t.is(out[3].correlation, '3')
  t.is(out[5].uri, '/hosts/remote-1')
})
