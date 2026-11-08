# p2p-rns

The resource name service: a swarm's nodes and resources by URI. Rooted in
p2p (it knows keys, nodes and the swarm); its users get URIs and
identities. Part of the p2p series. In code for now: in memory, for the
life of the node running it (the swarm's master); a repository-based
version comes later, behind the same operations.

```js
import { createRns, rnsClient } from 'p2p-rns'
const rns = createRns({ swarm: 'demo', observer, leaseMs: 15000 })
rns.registerNode({ owner, name: 'master', local: true })    // owner: the node's public key; local: no lease
rns.register({ owner, name: 'packages', id, key, type })    // under the owner's node
rns.renew(owner), rns.leave(owner)                          // the heartbeat; gracefully out
rns.resolve('/demo/master/packages'), rns.list('/demo/*/*'), rns.reverse(key)
openChannel(stream, { name: 'p2p-rns', onrequest: rns.handler(peerKey) })   // serving
const client = rnsClient(openChannel(stream, { name: 'p2p-rns' }))           // asking
```

- **Owners only.** The owner is the connection's key, never the message's
  claim. A node has one name, unique in the swarm; it names its own
  resources, unique under it, and may change what a name points to (a
  rebuilt repository's new key).
- **URIs**: `/<swarm>/<node>` and `/<swarm>/<node>/<name>`, segments
  lowercase `a-z`, `0-9`, `-`; `list` takes `*` for any one segment.
- **Liveness.** A node registered from a peer holds a lease (`leaseMs`,
  15 s by default); any operation from its owner renews it, `renew` is the
  heartbeat, and registering answers with the lease. A sweep (a third of
  the lease, on its own timer until `close()`) flags a node whose lease
  ran out: `present: false`, `absentSince`. Its records stay, flagged,
  and its name stays its owner's; renewing makes it present again.
  `leave` takes the node and its resources out, freeing its name. Every
  record says its node's `present`.
- **Nothing is kept**: when the node running it restarts, owners register
  again from their own records.

**Instrumentation**: `node-registered`, `registered` (with the key
replaced, if any), `node-absent`, `node-present`, `node-left`, `refused`
(why); metrics: records, nodes, absent now, and counts per operation.

`npm test`: 5 tests.
