import test from 'brittle'
import crypto from 'hypercore-crypto'
import { startBootstrap, startDht } from 'p2p-dht'
import { connect } from '../index.js'

test('two nodes meet on a topic; a refused node does not connect', async (t) => {
  const events = []
  const observer = e => events.push(e)
  const boot = await startBootstrap({ host: '127.0.0.1', port: 49821 })
  const nodes = []
  const node = async admit => {
    const d = await startDht({ host: '127.0.0.1', bootstrap: boot.bootstrap })
    const keyPair = crypto.keyPair()
    const n = connect({ dht: d.dht, keyPair, admit, observer })
    nodes.push({ d, n })
    return n
  }
  const outsider = crypto.keyPair()
  let refuse = null
  const a = await node(key => !refuse || !key.equals(refuse))
  const b = await node()
  const topic = crypto.randomBytes(32)
  const heard = new Promise(resolve => b.onConnection(stream => stream.once('data', d => resolve(d.toString()))))
  a.onConnection(stream => stream.write('hello'))
  await a.join(topic, { server: true, client: false })
  await b.join(topic, { server: false, client: true })
  t.is(await heard, 'hello')
  t.is(a.connections().length, 1)
  t.is(a.connections()[0].peer, b.publicKey.toString('hex'))

  // A node a refuses: its connection never opens on a.
  refuse = outsider.publicKey
  const d = await startDht({ host: '127.0.0.1', bootstrap: boot.bootstrap })
  const c = connect({ dht: d.dht, keyPair: outsider, observer })
  nodes.push({ d, n: c })
  await c.join(topic, { server: false, client: true })
  await new Promise(resolve => setTimeout(resolve, 500))
  t.is(a.connections().length, 1, 'still only b')
  t.ok(events.some(e => e.kind === 'connection-refused' && e.peer === outsider.publicKey.toString('hex')))

  for (const { n, d } of nodes.reverse()) { await n.close(); await d.close() }
  await boot.close()
  const kinds = new Set(events.map(e => e.kind))
  for (const k of ['topic-joined', 'connection-opened', 'connection-closed', 'connection-refused']) t.ok(kinds.has(k), k)
  t.ok(events.filter(e => e.kind === 'connection-closed').every(e => e.bytesReceived > 0))
})

test('a peer by its key: connected without a topic', async (t) => {
  const events = []
  const boot = await startBootstrap({ host: '127.0.0.1', port: 49822 })
  const d1 = await startDht({ host: '127.0.0.1', bootstrap: boot.bootstrap })
  const d2 = await startDht({ host: '127.0.0.1', bootstrap: boot.bootstrap })
  const server = connect({ dht: d1.dht, keyPair: crypto.keyPair() })
  await server.swarm.listen()
  const client = connect({ dht: d2.dht, keyPair: crypto.keyPair(), observer: e => events.push(e) })
  const opened = new Promise(resolve => client.onConnection((stream, peer) => resolve(peer.peer)))
  client.connectTo(server.publicKey)
  t.is(await opened, server.publicKey.toString('hex'))
  t.ok(events.some(e => e.kind === 'peer-joined'))
  await client.close(); await server.close(); await d2.close(); await d1.close(); await boot.close()
})
