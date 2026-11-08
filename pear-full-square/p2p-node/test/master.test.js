import test from 'brittle'
import { mkdtempSync } from 'bare-fs'
import { join } from 'bare-path'
import { tmpdir } from 'bare-os'
import crypto from 'hypercore-crypto'
import { openStore } from 'p2p-store'
import { startDht } from 'p2p-dht'
import { connect } from 'p2p-connect'
import { replicator } from 'p2p-replicate'
import { openChannel } from 'p2p-channel'
import { rnsClient } from 'p2p-rns'
import { mrepos } from 'p2p-mrepo'
import { openRepo } from '../../mycelium-git/index.js'
import { startNode, swarmTopic, askRequest, requestBundle } from '../index.js'

const dir = () => mkdtempSync(join(tmpdir(), 'p2p-node-'))
const code = new URL('../../p2p-rns', import.meta.url).pathname // a small folder to deploy as packages
const host = '127.0.0.1'

// A peer on the host: its own store, DHT node and connections.
async function peer (port) {
  const store = await openStore({ storage: dir() })
  const d = await startDht({ host, bootstrap: [{ host, port }] })
  const net = connect({ dht: d.dht, keyPair: crypto.keyPair() })
  const rep = replicator({ store })
  const channels = new Map()
  net.onConnection((stream, p) => {
    rep.replicate(stream, { peer: p.peer })
    channels.set(p.peer, {
      rns: rnsClient(openChannel(stream, { name: 'p2p-rns', peer: p.peer })),
      requests: openChannel(stream, { name: 'p2p-request', peer: p.peer })
    })
  })
  const to = async key => {
    net.connectTo(Buffer.from(key, 'hex'))
    while (!channels.has(key)) await new Promise(resolve => setTimeout(resolve, 20))
    return channels.get(key)
  }
  return { store, net, rep, to, async close () { await net.close(); await d.close(); await store.close() } }
}

test('genesis: the master serves p2p-rns, its packages and the boot repository; a peer reads them lazily', async (t) => {
  const events = []
  const primaryKey = crypto.randomBytes(32)
  const master = await startNode({ role: 'master', swarm: 'test', name: 'master', storage: dir(), primaryKey, host, dhtPort: 49851, code, observer: e => events.push(e) })
  t.is(master.uri, '/test/master')
  const p = await peer(49851)
  const { rns } = await p.to(master.key)
  t.alike((await rns.list('/test/master/*')).map(r => r.name), ['boot', 'deployment', 'node', 'packages'])
  const record = await rns.resolve('/test/master/packages')
  t.is(record.owner, master.key)
  const replica = await mrepos({ store: p.store }).replica(record.key)
  p.rep.track(replica.drive)
  await replica.drive.update({ wait: true })
  const pkg = JSON.parse((await openRepo(replica.backend).read('/capability/default/package.json')).toString())
  t.is(pkg.name, 'p2p-rns')
  const blobs = p.rep.metrics().filter(m => m.part === 'blobs').reduce((n, m) => n + m.downloaded.blocks, 0)
  t.ok(blobs < p.store.resources().find(r => r.how === 'replica').blobs.length, 'lazily')
  // The master's own repository was cloned from the boot repository.
  const node = JSON.parse((await openRepo(master.repos.node.backend).read('/main/node.json')).toString())
  t.is(node.key, master.key)
  t.is(master.repos.node.origin.id, master.repos.boot.id)
  await p.close()
  await master.stop()
  const kinds = new Set(events.map(e => `${e.module}:${e.kind}`))
  for (const k of ['p2p-node:genesis', 'p2p-node:live', 'p2p-node:node-started', 'p2p-node:node-stopped', 'p2p-rns:node-registered', 'p2p-mrepo:repo-cloned']) t.ok(kinds.has(k), k)
  t.ok(!JSON.stringify(events).includes(primaryKey.toString('hex')), 'no secret in the log')
})

test('a node joins: under its name, from the boot repository; requests to it and to the master answered', async (t) => {
  const master = await startNode({ role: 'master', swarm: 'test', name: 'master', storage: dir(), primaryKey: crypto.randomBytes(32), host, dhtPort: 49854, code })
  const joinOpts = { role: 'join', swarm: 'test', name: 'node-1', host, bootstrap: [{ host, port: 49854 }], master: master.key, packages: master.packages }
  const primaryKey = crypto.randomBytes(32)
  // Not told its packages: the master's, as p2p-rns names them.
  const n1 = await startNode({ ...joinOpts, packages: null, storage: dir(), primaryKey })
  t.is(n1.uri, '/test/node-1')
  t.is(n1.packages.key, master.packages.key, 'its packages: the master\'s, from p2p-rns')
  t.is(n1.repos.node.origin.id, master.repos.boot.id, 'cloned from the boot repository')

  const p = await peer(49854)
  const { rns } = await p.to(master.key)
  t.alike((await rns.list('/test/*')).map(r => r.uri), ['/test/master', '/test/node-1'])
  const n1Repo = await rns.resolve('/test/node-1/node')
  t.is(n1Repo.owner, n1.key)
  // A second node under a taken name is refused.
  await t.exception(startNode({ ...joinOpts, storage: dir(), primaryKey: crypto.randomBytes(32) }), /taken/)

  // A request, written in the requester's own repository, sent as a bundle.
  const outbox = await mrepos({ store: p.store }).create('outbox')
  for (const [key, uri] of [[n1.key, '/test/node-1/node'], [master.key, '/test/master/node']]) {
    const bundle = await requestBundle(outbox.backend, { 'request.md': '# Request: status\n\nStatus: node\n' })
    const { requests } = await p.to(key)
    const answer = await askRequest(requests, { name: 'status-1', bundle })
    t.alike(answer.executed, ['status-1'])
    // The response, read from a replica of the node's repository.
    const record = await rns.resolve(uri)
    const replica = await mrepos({ store: p.store }).replica(record.key)
    await replica.drive.update({ wait: true })
    const repo = openRepo(replica.backend)
    await new Promise(resolve => setTimeout(resolve, 200))
    await replica.drive.update({ wait: true })
    const response = (await repo.read('/main/responses/status-1/response.md')).toString()
    t.ok(/Status given/.test(response))
    t.ok(new RegExp(`"key": "${key}"`).test(response))
    // Taken once: the same name again is refused.
    await t.exception(askRequest(requests, { name: 'status-1', bundle }), /exists/)
    // The boundary: a name that breaks the rules is refused at the handler.
    await t.exception(askRequest(requests, { name: 'Not A Name', bundle }), /not a request name/)
  }
  await p.close()
  await n1.stop()

  // Rebuilt from a fresh store: the same identity, name and repository.
  const again = await startNode({ ...joinOpts, storage: dir(), primaryKey })
  t.is(again.key, n1.key)
  t.is(again.repos.node.key, n1.repos.node.key)
  t.is(again.repos.node.id, n1.repos.node.id)
  await again.stop()
  await master.stop()
})

test('liveness: a joined node renews its lease while it runs, and leaves on a graceful stop', async (t) => {
  const events = []
  const master = await startNode({ role: 'master', swarm: 'test', name: 'master', storage: dir(), primaryKey: crypto.randomBytes(32), host, dhtPort: 49855, code, leaseMs: 300, observer: e => events.push(e) })
  const n1 = await startNode({ role: 'join', swarm: 'test', name: 'node-1', host, bootstrap: [{ host, port: 49855 }], master: master.key, packages: master.packages, storage: dir(), primaryKey: crypto.randomBytes(32) })
  // Three leases long: the heartbeat keeps it present.
  await new Promise(resolve => setTimeout(resolve, 900))
  t.is(master.rns.resolve('/test/node-1').present, true)
  t.is(master.rns.resolve('/test/node-1/node').present, true)
  t.ok(master.rns.metrics().renew >= 4, 'renewed')
  await n1.stop()
  // Left: out, with its resources; the name free.
  t.is(master.rns.resolve('/test/node-1'), null)
  t.is(master.rns.resolve('/test/node-1/node'), null)
  t.alike(events.filter(e => e.module === 'p2p-rns' && /node-(absent|left)/.test(e.kind)).map(e => e.kind), ['node-left'])
  await master.stop()
})

test('the deployment on the swarm: empty at genesis, set by request to the master, checked at the boundary', async (t) => {
  const master = await startNode({ role: 'master', swarm: 'test', name: 'master', storage: dir(), primaryKey: crypto.randomBytes(32), host, dhtPort: 49856, code })
  const read = async () => JSON.parse((await master.read(master.repos.deployment, '/main/deployment.json')).toString())
  t.alike(await read(), { swarm: 'test', nodes: [] })
  const p = await peer(49856)
  const { rns, requests } = await p.to(master.key)
  t.is((await rns.resolve('/test/master/deployment')).type, 'deployment')
  const outbox = await mrepos({ store: p.store }).create('outbox')
  const ask = async (name, deployment) => {
    const bundle = await requestBundle(outbox.backend, { 'request.md': '# Request: the deployment\n\nDeployment: set\n', 'deployment.json': JSON.stringify(deployment) })
    await askRequest(requests, { name, bundle })
  }
  const wanted = { swarm: 'test', nodes: [{ name: 'node-1' }, { prefix: 'worker-', atLeast: 2 }] }
  await ask('deploy-1', wanted)
  t.alike(await read(), wanted)
  // Refused at the boundary: another swarm's, the master deployed, a field unknown.
  for (const [n, bad] of [['bad-1', { swarm: 'other', nodes: [] }], ['bad-2', { swarm: 'test', nodes: [{ name: 'master' }] }], ['bad-3', { swarm: 'test', nodes: [{ name: 'x', size: 3 }] }]]) {
    await ask(n, bad)
    const response = (await master.read(master.repos.node, `/main/responses/${n}/response.md`)).toString()
    t.ok(/not executed/.test(response))
  }
  t.alike(await read(), wanted, 'unchanged by what was refused')
  await p.close()
  await master.stop()
})
