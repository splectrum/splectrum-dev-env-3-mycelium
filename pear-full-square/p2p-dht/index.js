// p2p-dht — discovery for the p2p layer: DHT nodes.
//   const boot = await startBootstrap({ host, port, size, observer })
//     a private DHT from nothing: its bootstrap node at a fixed address and
//     further persistent nodes (two at least: on a DHT of one node no
//     announcement was found, first build). boot.bootstrap is the list to
//     give the others.
//   const dht = await startDht({ host, bootstrap, observer })
//     a node's own DHT node, joining a DHT through its bootstrap list.
//   x.metrics(), await x.close()
//
// Nodes in a swarm reach each other directly, so their DHT nodes are not
// firewalled: left to holepunching, a connection opened on one side only
// and carried nothing (first build). A DHT node binds to `host`, the
// address the others reach it at (on a container network, the host's
// gateway; inside a container, its own address).
//
// Instrumentation: { module, kind, time, ...facts } to the observer:
// dht-started, dht-closed; metrics: the routing table's size and the DHT's
// own request counters.

import DHT from 'hyperdht'

const MODULE = 'p2p-dht'
const emitter = observer => (kind, facts) => observer && observer({ module: MODULE, kind, time: Date.now(), ...facts })

export async function startBootstrap ({ host = '127.0.0.1', port = 49737, size = 2, observer = null } = {}) {
  const emit = emitter(observer)
  const nodes = []
  for (let i = 0; i < size; i++) {
    const node = new DHT({
      ephemeral: false,
      firewalled: false,
      host,
      port: i ? 0 : port,
      bootstrap: i ? [{ host, port }] : []
    })
    await node.fullyBootstrapped()
    nodes.push(node)
    emit('dht-started', { role: i ? 'persistent' : 'bootstrap', host, port: node.address().port })
  }
  return {
    nodes,
    bootstrap: [{ host, port }],
    metrics: () => nodes.map(metrics),
    async close () {
      for (const node of [...nodes].reverse()) await node.destroy()
      emit('dht-closed', { role: 'bootstrap', nodes: nodes.length })
    }
  }
}

export async function startDht ({ host = '127.0.0.1', port = 0, bootstrap, persistent = false, observer = null }) {
  const emit = emitter(observer)
  const dht = new DHT({ bootstrap, host, port, firewalled: false, ...(persistent ? { ephemeral: false } : {}) })
  await dht.fullyBootstrapped()
  emit('dht-started', { role: persistent ? 'persistent' : 'node', host, port: dht.address().port, routingTable: dht.toArray().length })
  return {
    dht,
    metrics: () => metrics(dht),
    async close () {
      await dht.destroy()
      emit('dht-closed', { role: 'node' })
    }
  }
}

function metrics (dht) {
  const s = dht.stats
  return {
    port: dht.address().port,
    routingTable: dht.toArray().length,
    queries: { ...s.queries },
    commands: Object.fromEntries(Object.entries(s.commands || {}).map(([k, v]) => [k, { ...v }]))
  }
}
