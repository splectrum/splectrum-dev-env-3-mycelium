import test from 'brittle'
import NoiseSecretStream from '@hyperswarm/secret-stream'
import { openChannel } from 'p2p-channel'
import { createRns, rnsClient } from '../index.js'

const A = 'a'.repeat(64)
const B = 'b'.repeat(64)

test('nodes and their resources, by URI', (t) => {
  const rns = createRns({ swarm: 'test', sweepEvery: null })
  rns.registerNode({ owner: A, name: 'master' })
  rns.register({ owner: A, name: 'packages', id: 'id-1', key: 'k1', type: 'packages' })
  rns.register({ owner: A, name: 'node', id: 'id-2', key: 'k2', type: 'node' })
  rns.registerNode({ owner: B, name: 'node-1' })
  rns.register({ owner: B, name: 'node', id: 'id-3', key: 'k3', type: 'node' })

  t.alike(rns.resolve('/test/master/packages'), { uri: '/test/master/packages', kind: 'resource', node: 'master', name: 'packages', type: 'packages', id: 'id-1', key: 'k1', owner: A, present: true })
  t.is(rns.resolve('/test/master').kind, 'node')
  t.is(rns.resolve('/test/nobody'), null)
  t.alike(rns.list('/test/*').map(r => r.uri), ['/test/master', '/test/node-1'])
  t.alike(rns.list('/test/*/node').map(r => r.uri), ['/test/master/node', '/test/node-1/node'])
  t.alike(rns.list('/test/master/*').map(r => r.name), ['node', 'packages'])
  t.is(rns.reverse('k3'), '/test/node-1/node')
  t.is(rns.reverse(B), '/test/node-1')
  t.alike(rns.metrics(), { records: 5, nodes: 2, absentNow: 0, registerNode: 2, register: 3, renew: 0, leave: 0, absent: 0, present: 0, refused: 0, resolve: 3, list: 3, reverse: 2 })
})

test('owners only: names are unique, a node names only its own', (t) => {
  const events = []
  const rns = createRns({ swarm: 'test', observer: e => events.push(e), sweepEvery: null })
  rns.registerNode({ owner: A, name: 'master' })
  t.exception(() => rns.registerNode({ owner: B, name: 'master' }), /taken/)
  t.exception(() => rns.registerNode({ owner: A, name: 'other' }), /already a node/)
  t.exception(() => rns.register({ owner: B, name: 'x', id: 'i', key: 'k' }), /not a node/)
  // Validation is the boundary's: the handler refuses what a peer sends.
  t.exception(() => rns.handler(B)({ op: 'registerNode', name: 'Not-Valid' }), /not a node name/)
  t.exception(() => rns.handler(B)({ op: 'resolve', uri: 'no-slash' }), /not absolute/)
  rns.registerNode({ owner: A, name: 'master' }) // again: the same owner, fine
  rns.register({ owner: A, name: 'repo', id: 'i', key: 'k1' })
  const again = rns.register({ owner: A, name: 'repo', id: 'i', key: 'k2' }) // rebuilt: a new key
  t.is(again.key, 'k2')
  t.is(events.filter(e => e.kind === 'refused').length, 5)
  t.is(events.at(-1).replaced, 'k1')
})

test('over a channel: the owner is the connection, not the message', async (t) => {
  const sa = new NoiseSecretStream(true)
  const sb = new NoiseSecretStream(false)
  sa.rawStream.pipe(sb.rawStream).pipe(sa.rawStream)
  await Promise.all([sa.opened, sb.opened])
  const rns = createRns({ swarm: 'test', sweepEvery: null })
  // The service side: requests from this connection belong to its peer.
  openChannel(sa, { name: 'p2p-rns', onrequest: rns.handler(sa.remotePublicKey.toString('hex')) })
  const client = rnsClient(openChannel(sb, { name: 'p2p-rns' }))
  await client.registerNode('node-1')
  await client.register({ name: 'notes', id: 'id-9', key: 'k9', type: 'notes' })
  const r = await client.resolve('/test/node-1/notes')
  t.is(r.owner, sb.publicKey.toString('hex'))
  t.alike((await client.list('/test/*')).map(x => x.uri), ['/test/node-1'])
  await t.exception(client.registerNode('another'), /already a node/)
  t.alike(await client.renew(), { uri: '/test/node-1', leaseMs: 15000 })
  t.alike(await client.leave(), { left: '/test/node-1' })
  t.is(await client.resolve('/test/node-1/notes'), null)
  sa.destroy()
  sb.destroy()
})

test('liveness: absent after the lease, present again on renewal, leaving frees the name', (t) => {
  let clock = 1000
  const events = []
  const rns = createRns({ swarm: 'test', leaseMs: 100, sweepEvery: null, now: () => clock, observer: e => events.push(e) })
  t.is(rns.registerNode({ owner: A, name: 'master', local: true }).leaseMs, null)
  t.is(rns.registerNode({ owner: B, name: 'node-1' }).leaseMs, 100)
  rns.register({ owner: B, name: 'node', id: 'i', key: 'k' })
  clock += 99
  t.alike(rns.sweep(), [])
  clock += 1
  t.alike(rns.sweep(), ['/test/node-1']) // the lease ran out
  t.alike(rns.sweep(), []) // flagged once
  // Flagged, not hidden: the records stay, saying it; the name stays B's.
  t.alike(rns.resolve('/test/node-1'), { uri: '/test/node-1', kind: 'node', name: 'node-1', owner: B, present: false, absentSince: 1100 })
  t.is(rns.resolve('/test/node-1/node').present, false)
  t.alike(rns.list('/test/*').map(r => [r.name, r.present]), [['master', true], ['node-1', false]])
  t.exception(() => rns.registerNode({ owner: A.replace('a', 'c'), name: 'node-1' }), /taken/)
  clock += 10000
  t.alike(rns.sweep(), []) // the master holds no lease
  // Back: the heartbeat makes it present again.
  t.alike(rns.renew(B), { uri: '/test/node-1', leaseMs: 100 })
  t.is(rns.resolve('/test/node-1/node').present, true)
  // Any operation from its owner renews, through the handler.
  clock += 90
  rns.handler(B)({ op: 'resolve', uri: '/test/master' })
  clock += 90
  t.alike(rns.sweep(), [])
  // Leaving: out, with its resources; the name is free.
  t.alike(rns.handler(B)({ op: 'leave' }), { left: '/test/node-1' })
  t.is(rns.resolve('/test/node-1'), null)
  t.is(rns.resolve('/test/node-1/node'), null)
  t.exception(() => rns.renew(B), /not a node/)
  t.is(rns.registerNode({ owner: A.replace('a', 'c'), name: 'node-1' }).present, true)
  t.alike(events.filter(e => /node-(absent|present|left)/.test(e.kind)).map(e => e.kind), ['node-absent', 'node-present', 'node-left'])
  t.is(events.find(e => e.kind === 'node-absent').lastSeen, 1000)
  const m = rns.metrics()
  t.alike([m.absent, m.present, m.leave, m.absentNow], [1, 1, 1, 0])
})

test('the sweep runs on its own timer, until closed', async (t) => {
  const rns = createRns({ swarm: 'test', leaseMs: 60, sweepEvery: 20 })
  rns.registerNode({ owner: B, name: 'node-1' })
  await new Promise(resolve => setTimeout(resolve, 150))
  t.is(rns.resolve('/test/node-1').present, false)
  rns.close()
})
