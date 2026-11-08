import test from 'brittle'
import { startBootstrap, startDht } from '../index.js'

test('a private DHT from nothing, and a node joining it', async (t) => {
  const events = []
  const observer = e => events.push(e)
  const boot = await startBootstrap({ host: '127.0.0.1', port: 49811, observer })
  t.is(boot.nodes.length, 2)
  t.alike(boot.bootstrap, [{ host: '127.0.0.1', port: 49811 }])
  const node = await startDht({ host: '127.0.0.1', bootstrap: boot.bootstrap, observer })
  const m = node.metrics()
  t.ok(m.routingTable >= 1, 'the node knows the DHT')
  t.is(typeof m.queries.total, 'number')
  await node.close()
  await boot.close()
  t.alike(events.map(e => `${e.kind}:${e.role}`), ['dht-started:bootstrap', 'dht-started:persistent', 'dht-started:node', 'dht-closed:node', 'dht-closed:bootstrap'])
  t.ok(events.every(e => e.module === 'p2p-dht'))
})
