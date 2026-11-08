// p2p-connect — connections for the p2p layer: a node's keypair on a DHT.
//   const net = connect({ dht, keyPair, admit, observer })
//   net.onConnection((stream, peer) => ...)   an encrypted stream per peer
//   await net.join(topic, { server, client })  announce, look up, or both
//   await net.leave(topic)
//   net.connectTo(publicKey)                   a peer by its key, kept connected
//   net.disconnectFrom(publicKey)
//   net.connections(), net.metrics(), await net.close()
//
// `dht` is a DHT node (p2p-dht's startDht().dht). `keyPair` is the node's
// identity: every connection is authenticated by it (Noise), so a peer is
// its public key. `admit(remotePublicKey)` is the membership hook: a peer
// it refuses is not connected (default: everyone).
//
// Instrumentation: { module, kind, time, ...facts } to the observer:
// connection-opened, connection-refused, connection-closed (with the bytes
// carried), topic-joined, topic-left, peer-joined, peer-left; metrics: per
// connection and the swarm's counters.

import Hyperswarm from 'hyperswarm'

const MODULE = 'p2p-connect'
const hex = b => b.toString('hex')

export function connect ({ dht, keyPair, admit = () => true, observer = null }) {
  const emit = (kind, facts) => observer && observer({ module: MODULE, kind, time: Date.now(), ...facts })
  const swarm = new Hyperswarm({
    dht,
    keyPair,
    firewall: remotePublicKey => {
      if (admit(remotePublicKey)) return false
      emit('connection-refused', { peer: hex(remotePublicKey) })
      return true
    }
  })
  const listeners = []
  const live = new Map() // stream -> { peer, opened }
  const closed = []

  swarm.on('connection', (stream, info) => {
    const peer = hex(info.publicKey)
    live.set(stream, { peer, opened: Date.now() })
    emit('connection-opened', { peer, initiator: stream.isInitiator, remoteHost: stream.rawStream?.remoteHost })
    stream.on('error', () => {})
    stream.once('close', () => {
      const c = { peer, ...bytes(stream), ms: Date.now() - live.get(stream).opened }
      live.delete(stream)
      closed.push(c)
      emit('connection-closed', c)
    })
    for (const fn of listeners) fn(stream, { publicKey: info.publicKey, peer })
  })

  return {
    swarm,
    publicKey: swarm.keyPair.publicKey,
    onConnection: fn => listeners.push(fn),
    async join (topic, { server = true, client = true } = {}) {
      const discovery = swarm.join(topic, { server, client })
      await discovery.flushed()
      if (client) await swarm.flush()
      emit('topic-joined', { topic: hex(topic), server, client })
    },
    async leave (topic) {
      await swarm.leave(topic)
      emit('topic-left', { topic: hex(topic) })
    },
    connectTo (publicKey) {
      swarm.joinPeer(publicKey)
      emit('peer-joined', { peer: hex(publicKey) })
    },
    disconnectFrom (publicKey) {
      swarm.leavePeer(publicKey)
      emit('peer-left', { peer: hex(publicKey) })
    },
    connections: () => [...live].map(([stream, c]) => ({ peer: c.peer, ...bytes(stream) })),
    metrics: () => ({
      open: [...live].map(([stream, c]) => ({ peer: c.peer, ...bytes(stream) })),
      closed: [...closed],
      swarm: JSON.parse(JSON.stringify(swarm.stats))
    }),
    async close () {
      await swarm.destroy()
      emit('connect-closed', {})
    }
  }
}

const bytes = stream => ({
  bytesReceived: stream.rawStream?.bytesReceived ?? 0,
  bytesSent: stream.rawStream?.bytesTransmitted ?? 0
})
