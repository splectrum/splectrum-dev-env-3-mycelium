# p2p-connect

Connections for the p2p layer: a node's keypair on a DHT (Hyperswarm). One
of the p2p series.

```js
import { connect } from 'p2p-connect'
const net = connect({ dht, keyPair, admit, observer })   // dht: p2p-dht's node.dht
net.onConnection((stream, peer) => ...)                   // an encrypted stream; peer.peer is its key (hex)
await net.join(topic, { server: true, client: false })    // announce, look up, or both
net.connectTo(publicKey)                                  // a peer by its key (it listens: swarm.listen())
net.connections(), net.metrics(), await net.close()
```

- The node's identity is `keyPair`: every connection is authenticated by
  it (Noise), so a peer is its public key.
- `admit(remotePublicKey)` is the membership hook: a peer it refuses is not
  connected (default: everyone).
- A stream carries replication (`p2p-replicate`) and channels
  (`p2p-channel`) together.

**Instrumentation**: `topic-joined`, `topic-left`, `peer-joined`, `peer-left`, `connection-opened`
(peer, initiator, remote host), `connection-refused` (peer),
`connection-closed` (peer, bytes received and sent, ms), `connect-closed`.
Metrics: open and closed connections with their bytes; the swarm's
counters.

`npm test`: 2 tests.
