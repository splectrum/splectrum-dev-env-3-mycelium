# p2p-dht

Discovery for the p2p layer: DHT nodes (HyperDHT). One of the p2p series.

```js
import { startBootstrap, startDht } from 'p2p-dht'
const boot = await startBootstrap({ host, port: 49737, size: 2, observer })  // a private DHT from nothing
const node = await startDht({ host, bootstrap: boot.bootstrap, observer })    // a node's own DHT node
node.dht            // for p2p-connect
node.metrics(), await node.close()
```

- **A private DHT** starts from a bootstrap node at a fixed address plus
  persistent nodes: two at least, since on a DHT of one node no
  announcement was found.
- **Nodes in a swarm reach each other directly**, so their DHT nodes are
  not firewalled; left to holepunching, a connection opened on one side
  only and carried nothing.
- `host` is the address others reach the node at: on a container's
  internal network, the host's gateway address on the host side, the
  container's own address inside.

**Instrumentation**: `dht-started` (role: bootstrap, persistent, node;
host, port), `dht-closed`. Metrics: the routing table's size, the DHT's
queries and command counters.

`npm test`: 1 test.
