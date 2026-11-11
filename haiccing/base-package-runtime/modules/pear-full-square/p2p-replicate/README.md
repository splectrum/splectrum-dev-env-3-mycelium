# p2p-replicate

Replication for the p2p layer: moving data between stores, over any
stream, with its accounting. One of the p2p series.

```js
import { replicator } from 'p2p-replicate'
const rep = replicator({ store, observer })    // store: p2p-store's
rep.replicate(stream, { peer })                // a connection, a pipe, a socket; or true/false for a new stream
rep.track(drive)                               // count what moves for this drive, per peer, both ways
await rep.hold(drive)                          // take the drive whole
rep.metrics()
```

- A replica holds only what it has read. A store that serves a drive in
  another's place, or takes over its writing, holds it whole first
  (`hold`).
- Not yet: **policy**. A peer that knows a resource's key can ask for it,
  and Corestore serves any core it holds; which resources may replicate to
  which peers comes with membership.

**Instrumentation**: `replication-started`, `replication-ended` (peer),
`held` (resource, sizes, blocks fetched, ms). Metrics: per resource, core
(db, blobs) and peer: blocks and bytes uploaded and downloaded.

`npm test`: 1 test.
