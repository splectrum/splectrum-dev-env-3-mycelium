# p2p-swarm-manager

A swarm's manager, on the host machine: it manages the nodes it controls
(possibly only the master) through their node managers, and keeps the
swarm's record.

```sh
node cli.js genesis --swarm=<name> --folder=<swarm-folder> --nodes=<parent> --vault=<dir> --code=<dev-repo>
node cli.js join    --folder=<swarm-folder> --node=<name>
node cli.js status  --folder=<swarm-folder>
node cli.js restart --folder=<swarm-folder> --node=<name>
node cli.js stop    --folder=<swarm-folder>
node cli.js invite  --folder=<swarm-folder>
```

- **Genesis**: the images, the swarm's internal network, the master's node
  manager (its secret generated in the vault); the swarm's record
  (`swarm.json`, `swarm.jsonl`) in its own folder.
- **Folders stand side by side** under `--nodes`: the swarm manager's and
  one per node. The vault is a folder of its own.
- **Node managers run detached**: a node keeps running when the swarm
  manager is not.
- **Status** asks p2p-rns as a peer of the swarm, from the host, on the
  swarm's internal network (the host's address there is the gateway).

- **Join** (step 5): a node added on both of the swarm's internal networks
  (its data plane and the auxiliary one, where its manager provisions it),
  run from the master's packages at the commit the swarm records.

- **Status** lists the swarm's nodes as p2p-rns knows them, each marked
  `controlled` (started by this manager) or not (joined from elsewhere,
  under a manager of its own).
- **Invite** (step 6): what another host is given to join, public facts
  only: the swarm, its data plane (network, subnet), its bootstrap, the
  master's key, the packages' URI, key and commit, the image. That host's
  node manager joins its node from it (`p2p-node-manager`'s `join`).
- **One data plane.** A DHT node has one address: across hosts the
  swarm's network is one every node reaches (an overlay or the hosts'
  LAN); each host's management plane is its own.

`npm test`: 1 test (the invitation).
