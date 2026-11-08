# p2p-node

The node application: a node of a swarm, composed from the p2p series
(store, DHT, connections, replication, channels), its repositories
(p2p-mrepo, with mycelium) and the resource name service (p2p-rns). It is
what runs in a node's container (`cli.js`, Bare).

```js
import { startNode, swarmTopic } from 'p2p-node'
const node = await startNode({ role: 'master', swarm, name, storage, primaryKey, host, code, observer })
node.uri, node.key, node.repos, node.metrics(), await node.stop()
```

**Role join** (step 5): a node joining the swarm: it takes part in its DHT,
connects to the master by key for p2p-rns, joins under its name, and goes
live like the master. It runs from the swarm's code: its container starts
`boot.js` (the boot program, from the image), which is provisioned through
the auxiliary swarm, materialises the master's packages at the pinned
commit, and starts the node from them.

**Every node** goes live the same way: the swarm's boot repository cloned
into its own `node` repository (origin recorded), its record and its
capability (a link to the packages it runs) committed, registered and
served; requests to it come as bundles on a channel (`requests.js`), are
taken into `pending/default`, executed and answered on `main`.

**Role master** (step 4), the swarm's first node, from zero:

- the swarm's DHT (two persistent nodes at its address), connections on
  its identity (a keypair derived from its primary key), replication,
  p2p-rns in memory, served on a channel to every peer that connects on
  the swarm's topic (`swarmTopic(swarm)`);
- genesis: its repositories, `boot` (the template every node's repository
  is cloned from), `packages` (the
  node's code, the folder `code`, deployed into `capability/default`, the
  code crossing the boundary once), reproducibly: fixed author and time,
  ids derived from its identity and the names, so the same primary key and
  code give the same keys, commits and ids after a rebuild;
- registered in p2p-rns and announced.

**Liveness** (p2p-rns's lease): a joining node renews its registration
every third of the lease p2p-rns tells it, on the master's current
connection, each renewal bounded by that third; a renewal not answered
drops the connection as stale (the master closed it while the node was
frozen), and the new connection is taken again and renewed at once, and a registry that forgot the node is told again. On
a graceful stop it leaves (bounded: 2 s). The master runs p2p-rns (option
`leaseMs`) and holds no lease.

The store is for RAM (it holds the node's secrets). The primary key comes
from the node manager on stdin (`cli.js`), never from a file the node
keeps. Its log (stdout, JSON lines) is every module's audit and its
metrics at intervals. SIGTERM stops it gracefully (leaving p2p-rns).

A failed start (a name refused, the master unreachable) closes what it
opened.

`npm test`: 3 tests.
