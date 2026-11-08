# p2p-node-manager

One node's manager, on the host machine, for the node's whole life: it
starts the node's container, hands it its secret, follows and records it,
and stops it. One per node, each in the node's own folder.

On Bare. Inside a swarm: HAICC starts a swarm's own nodes; this manager
runs a node joining from another host.

```sh
bare cli.js join --invitation=<file> --folder=<node-folder> --vault=<vault-dir> \
  --name=<node> --ip=<address on the swarm's network> --aux-subnet=<a.b.c> \
  --boot=<the boot program's code: an assembled package> [--image=<tag>] [--observer=true]
```

- **Joining from an invitation** (`join`, step 6): a node on a host of its
  own, no swarm manager there. The manager makes the node's auxiliary
  network on its host (removed when the node has exited), provisions the
  node from this host's vault, and attaches it to the swarm's data plane
  at the given address. The invitation holds public facts only (the swarm,
  its network, the master's key and DHT, its packages' key and commit, the
  image). The image has no code (a plain base and Bare, HAICC's): the boot
  program's code is mounted read-only at `/app` (`--boot`); the node's own
  code comes by replication from the master's packages.

- **The container is hardened**: read-only root, every capability dropped,
  no new privileges, user 65534, memory capped with no swap, no core
  dumps, the store on a tmpfs (RAM).
- **The secret** (the node's primary key, from the vault) reaches the
  node's memory only: no file, no mount, no environment variable. The
  master gets it on its stdin; a joining node through the auxiliary swarm:
  the manager's peer authorises the ephemeral key the container logs and
  answers its request for the secret once.
- **Its tmpfs mounts**: the store noexec; `/tmp` noexec (64 MB); for a
  joining node, the code loaded by replication on a tmpfs of its own,
  exec (native addons load only from one).
- **The vault** (`vault.js`) is a stand-in for now: one owner-only key file
  per node in a folder of its own on the host, outside every repository,
  node folder and image; generated there. Not yet encrypted.
- **Records**, in the node's folder (nothing secret): topics (mycelium-topic)
  `topics/manager` (starting, provisioning, the secret handed over,
  materialised, ready, resources sampled from the container runtime,
  actions passed, exited with its code, stopped), `topics/node` (the node's
  own log), `topics/actions` (actions for the node's observer, passed over
  the management channel), `node.stderr`, `state.json`, `manager.pid`.
- SIGTERM to the manager stops the node gracefully (SIGTERM to the node).

Tests (brittle): the vault, the command line's boundary.
