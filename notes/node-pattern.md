# The node pattern

A **swarm** is the cluster: the set of nodes joined over the p2p layer.

Status: **settled in discussion, 2026-10-31**, except where marked as a
direction or open. Once proven, it becomes part of the architecture in the
main documentation. The vision beyond it (several swarm memberships,
closed-box devices) is in `multi-swarm.md`.

It replaces the shape of what was built first (`mycelium-node`,
`cluster/bootstrap`, `cluster/deployment`, removed in step 1): its records
stay (`cluster/runs/`), the evidence behind some of what follows, not as
the design.

The pattern is simple and secure: a plain runtime, every repository on
Hypercore, everything moved by replication, secrets only in memory.

## Repositories

1. **All repositories on Hypercore.** Every repository this work creates
   lives on Hypercore: a Corestore-backed Hyperdrive with p2p-git on it.
   Repositories outside (native git, hosted repositories, bundles) are
   sources and targets at the boundary only: imported once, exported as
   copies.
2. **A repository on Hypercore needs no swarm.** It is created and used
   locally (shown in step 1: the contract suite and the command set on a
   persisted Hyperdrive, Node and Bare, no network). Networking only adds
   replication, over any duplex stream; a swarm is one way to get streams.
3. **Every repository has a keypair.** The drive's key (its db core's
   public key) is its identity and, hashed, its discovery topic. The secret
   key is the right to write: whoever holds it is the single writer.
4. **The Corestore is the storage.** A Hyperdrive is built on one, and a
   node has one. By default it derives each repository's keypair from its
   primary key and the repository's name, so the primary key is the root
   secret behind everything the store writes. A repository that must move
   or change writer gets an explicit keypair of its own.

## The node

5. **A containerised node on the host, where possible.** Containers give
   resource separation (CPU, memory, I/O per node; an out-of-memory node
   dies alone), isolation, a disposable environment and observability from
   the runtime. Where containers are not available (mobile, some hosts) the
   node runs in-process; the pattern holds, only the stream between
   manager and node changes. Plain host processes serve development and
   tests.
6. **Runtime only.** A node starts from a plain base: Bare, nothing else.
   Containers are hardened: read-only root filesystem, all capabilities
   dropped, no new privileges, a non-root user, no swap (memory limit equal
   to swap limit), no core dumps. A rootless container runtime where
   possible.
7. **The repository boots the node.** A boot repository is cloned into the
   node's own Corestore under the node's own key, and execution switches
   to the clone: it goes live. The node is that repository in operation,
   active for as long as the node is. The clone records its origin (the
   boot repository's key and commit). One boot repository can start many
   nodes, each with its own clone and key.
8. **Local first, network last.** The node is complete and live on
   Hypercore before it opens a socket to its swarm.
9. **A disposable store, in RAM.** The Corestore holds its secrets: it
   writes its primary key and its cores' secret keys into its storage, in
   clear, and reopens writable with no key given (probe
   `steps/0-probes/corestore-secrets`). So the store lives in RAM, on a
   tmpfs in the container, and is rebuilt at each start from checkpoints
   (the repositories the node writes) and from the swarm (the replicas it
   holds, by key). A store too large for RAM, or one that must survive a
   restart, needs an encrypted volume unlocked from the vault, or signing
   outside the store (open).
10. **Identity in a vault, secrets in RAM only.** The node's secret (its
    Corestore primary key, and any explicit keypairs) lives in a vault on
    the host, never in a persistent store, repository, bundle, folder or
    image. It
    reaches the node only into memory, at each start. Secrets never go
    into a Hypercore either: a core is a replicated, signed, persistent
    log.

## Provisioning: the auxiliary swarm

Confirmed by probe `steps/0-probes/container-dht`: a hardened container
from the plain base, on an internal network, joins a DHT run by the host
at the network's gateway address and connects to the host's node (under
40 ms).

The node manager's side runs a small swarm local to the host, on an
internal network with no route out: the **auxiliary swarm**, the
management plane. The node's own swarm is the data plane.

1. The node manager starts the container with only a small fixed join
   closure (Bare, the swarm, Corestore, the secret stream), attached to
   the auxiliary network.
2. The container generates an ephemeral keypair and writes its public key
   to its log. The node manager, following the log, authorises exactly
   that key. No secret is needed to start.
3. The container joins the auxiliary swarm and receives its secret over
   an ephemeral channel on the Noise-encrypted connection, into memory,
   from the host's provisioning node (backed by the vault).
4. It loads its packages by replication from the capability store,
   lazily, verified by commits and the store's key.
5. It goes live (point 7) and sets up or joins its proper swarm, as its
   request says.
6. The auxiliary link stays as the management channel between the node
   manager and its node.

This works air-gapped as well: host and container always have a network
between them, even with none to the outside.

## Where things live

| Where | Holds | Lifetime |
|---|---|---|
| the container's own filesystem (read-only) | the join closure | the image's |
| a tmpfs in the container | the Corestore, secrets included (rebuildable) | RAM only, gone with the container |
| the container's memory | the node's secret | until the node stops |
| the host's vault | node secrets, long-lived keypairs | persistent, guarded |
| the host's own folders | the host side's boundary with the outside world: bundles and files brought in by hand, exports to carry elsewhere | the host's |

No folder is mapped into the container; nothing reaches it except through
the auxiliary swarm.

## The pattern elsewhere

| Pattern | Container on a host | Mobile |
|---|---|---|
| runtime | plain image with Bare | Bare in the app (a worklet) |
| isolation | the container | the app sandbox |
| manager to node | the auxiliary swarm, on the host's internal network | replication and the secret channel over the worklet's IPC pipe |
| vault | host vault, keychain or encrypted file | the OS keystore |
| secrets | process memory | process memory |
| disposable store | container filesystem | app-private storage |
| boundary with the outside world | the host's folders | share and import with other apps |

## The host side

1. **A node manager per node** (`p2p-node-manager`). A long-running process, living as long as
   its node, in the node's own folder on the host. It starts the container
   (limits, hardening, networks), provisions it (the auxiliary swarm),
   monitors it (the container's logs captured, the runtime's lifecycle
   events, resource samples), records what only the outside can see
   (crashes, out-of-memory kills, hangs), and is the node's management
   platform (status, logs, start, graceful stop, restart, rebuild). A host
   runs as many as it has nodes.
2. **No folder hierarchy.** Node folders stand side by side; nothing is
   organised by nesting. Managers talk repository to repository.
3. **A swarm manager** (`p2p-swarm-manager`) on a host that starts a swarm manages the node
   managers it controls: it starts them (the first node, then others) and
   follows them through their repositories.
4. **Independence.** A node manager and its node keep running when the
   swarm manager stops; the swarm manager picks them up again when it
   restarts.
5. **Priming.** A swarm manager may control a single node, the seed
   (the first DHT node). It is also responsible for priming the swarm
   with its capabilities: bringing them into the capability store, at the
   boundary.
6. **Scope.** A swarm manager manages only the nodes it controls. Other
   nodes join and are part of the swarm while living on other hosts,
   under their own managers: the general pattern. Such a node is given
   an invitation (public facts: the swarm, its data plane, its bootstrap,
   the master's key, the packages); its host's node manager makes its
   management plane there and provisions it from that host's vault. The
   swarm sees it (p2p-rns); its swarm manager does not control it.
7. **One data plane, a management plane per host.** A DHT node has one
   address (its identity is derived from it): a swarm's data plane is one
   network every node reaches, across hosts an overlay or the hosts' LAN.
   Each node's management plane (its auxiliary network) stays on its own
   host, with its manager.

## What a running node is

One process, the runtime with the p2p series (`p2p-store`, `p2p-dht`,
`p2p-connect`, `p2p-replicate`, `p2p-channel`, `p2p-git`; `pear-full-square`), running: a DHT node (taking part in the swarm's
DHT), a server listening on the node's keypair, the swarm with its
announcements kept alive, replication on every connection, and the
Corestore. Repositories (applications) are opened, served and joined
within it. Every module of the series is instrumented and audited
(`plan.md`, step 2). The series holds no management: the node manager and the
swarm manager are applications on the host machine (`pear-full-square`).

## Entities and names

Mycelium knows nothing of p2p. It works with entities through contracts it
defines (repositories it can reach, the inbox, identities), as it already
does for storage (the backend contract, with engines plugged in); the p2p
layer implements them.

- **A repository belongs to an owner: its node**, the single writer.
  Copies elsewhere do not change that.
- **Entities have URIs**, unique, built on the p2p layer's identities.
  The node owns the names of the repositories it creates; there is no
  instance segment:

  ```
  /<swarm>                                   the swarm
  /<swarm>/<node>                            a node
  /<swarm>/<node>/<name>                     a repository, owned by that node
  /<swarm>/<node>/<name>/<branch>/<path>     inside it, as our URIs already work
  ```

  A repository's name is its type (`node`, `capability-store`,
  `test-run`, ...) when the node holds one of that type, or a name prefixed
  with its type when it holds more than one (`test-run-r12`). The type is
  a fixed vocabulary: it says which paradigm, rules and capabilities apply.
  The naming logic runs on the node. The same URI wherever a copy is
  read.
- **Three levels of identity:**
  - the **URI**: the address, friendly, unique; it can change (a rename,
    ownership moving), with the change recorded;
  - the **internal id**: the repository's own permanent identity (a GUID,
    as our modules have), recorded inside the repository and mapped to
    its URI; it survives renames, rebuilds and key changes. This is the
    identity mycelium works with;
  - the **key**: the p2p layer's identity for the repository, current, and
    replaced when a repository is rebuilt.

  The p2p layer keeps the mappings (URI to internal id, internal id to
  key); a repository opened by key confirms its internal id. Most of the
  abstraction between mycelium and p2p sits in this.
- **Friendly names.** Each segment is a friendly name under our URI rules
  (lowercase `a-z`, `0-9`, `-`); an encoded key is always a valid name as
  well. Names are unique within their parent and resolve to identities at
  the boundary only; inside, everything works with keys, as with our URIs'
  case-insensitive lookup. Names stay stable while keys may change: a
  rebuilt node keeps its name, pointed at its new key, and the change is
  recorded.
- **A node supplies its friendly name when it joins.** The swarm checks it
  is unique and records it with the node's identity; a name already taken
  is refused, and the join is answered either way.
- **The names follow ownership**, so no central registry is needed beyond
  that:
  - the swarm's names (its nodes) are recorded by the swarm, written by
    the seed;
  - a node's names (its repositories, by type or type-prefixed name) are recorded
    by the node itself, in its own repository: it owns them and is their
    single writer.
- **A resource lookup, `p2p-rns`** (resource name service), like DNS: it
  receives a record of every resource created in the swarm (and of every
  node joining) and answers lookups by URI: a URI to its internal id and to
  what opens it, a listing by URI pattern, and the reverse. It is rooted in
  p2p (it knows keys, nodes and the swarm, and is reached as messages, the
  sender's identity from the connection) and delivers an abstracted
  resource lookup to its users: they see URIs and identities, never p2p.
  Mycelium is one of its users.
  - Registrations are accepted from owners only: a node registers names
    under itself, and a node's own name is checked unique when it joins.
  - **First an in-code implementation**: a bootstrap component on the
    master node (the seed), needing no mycelium repository, since not
    enough is built yet to base it on one. It lives in memory, for the
    lifetime of the master node only, and keeps nothing: should the master
    node restart before the in-code lookup is replaced, owners register
    again from their own records.
  - **Later a repository-based one** (a lookup repository with its inbox
    and intake), replacing the in-code lookup at the end of an install,
    behind the same contract.
- mycelium-uri validates entity URIs (their shape).
- **One addressable data world.** The resource structure (swarm, node,
  repository) together with our repository URIs (branch, path) gives one
  URI space from the swarm down to every object it holds:
  `/<swarm>/<node>/<repo>/<branch>/<path>`. `p2p-rns` resolves the first
  segments, a repository its branches and paths; replication loads lazily
  what a URI reaches, so addressing anything in the swarm is cheap.
  Selection works across all of it (`/<swarm>/*/test-run-*/main/responses/*`).
  The vision's next layers extend the same space: with AVRO a URI names a
  typed value, with Kafka topics and partitions are resources in it.

## Repository-to-repository talk

The core communication mode for now, for low-frequency exchange; higher
frequency (streaming) comes later, through dedicated channels.

- **An inbox per repository**, multi-writer: one append-only core per
  writer, signed by its key. The inbox is the set of those cores, listed in
  the repository's configuration with, per writer, a priority and a flag:
  internal or external.
- **No consensus in the inbox.** The repository's own intake process
  orders: it reads the inbox (by priority), validates each entry and
  commits accepted requests into `pending/default`, the internal queue.
  `pending/default` is the linearised view; intake is the apply step.
- **An entry is a bundle**: self-contained, verifiable by its oids, the
  same format as at every other boundary. A bundle may have prerequisites
  the repository already holds; one missing them is refused.
- **Validation at intake:** an admitted writer; a well-formed bundle; a
  request whose URIs validate (external entries meet the boundary's
  rules); a capability to execute it. Exactly once: each entry is known by
  writer key and sequence, recorded with the accepted request. Rejections
  are answered.
- **Responses** are on `main` as now; the sender reads them from its
  replica.
- **Communication patterns** (fire and forget, confirmed, handshakes) are a
  higher-level concern, built on this.
- **Future vision** (not for implementation now): like ports, a first
  message on the repository's standard inbox sets up a dedicated channel
  between the two (a pair of cores of their own, or a channel on the
  connection) for what does not fit request by request, such as
  streaming; the inbox stays the well-known entry point.

## Capabilities

- **References are gitlinks** (git's own `160000` entries: a commit in
  another repository), with the capability store's key recorded beside
  them. One capability store to start; the seed writes it.
- **Multi-module packages.** A reference is per package: a set of modules
  with one resolved dependency tree (a shared `node_modules`), e.g.
  `mycelium` with all its modules, a wholesome and consistent set of
  capabilities tested as one, so no node mixes versions. Module instances
  stay stored once, shared between packages. To start, repositories
  reference packages directly.
- **The capability store is the single point** of import (third-party code
  crosses the boundary there, once), validation (a package is available
  only once tested as a whole, with its evidence) and maintenance
  (updates, fixes, retirement). Running nodes pin exact commits and move
  only when their repository asks.
- **The repository decides what to ask for**, from what the store has made
  available; the resolution is recorded as an exact commit.
- **Later:** a categorisation of packages by capability URI; a module's
  descriptor saying which capabilities it provides and how to instantiate
  them; the repository's own map (its internal knowledge) of which
  package serves each capability URI; a repository asking the store to
  include a missing package.

## Probed

- **A node on another host** (`steps/6-other-host`, the other host
  simulated on one machine): a master on two networks is reached on one
  only, so the data plane is one network (point 7 of the host side); a
  node joins from an invitation under its own manager, vault and
  auxiliary network, is reached by URI and reaches the others, restarts
  with its identity, and stops while the swarm runs on. Nothing tells the
  swarm a node has gone: p2p-rns in code keeps its registration and peers
  wait on its address (open, point 5).

- **Explicit keypairs** (`steps/0-probes/drive-keypair`): a Hyperdrive is
  writable with an explicit keypair through its db core (Hyperdrive's
  internal `_db` option, to wrap in `p2p-store`); the drive moves to
  another store with its keypair alone; its key is derived from a manifest
  naming the signer, so a replica opens it by the drive's key; a store
  taking over the writing must first hold the whole drive.
- **Signals under Bare** (`steps/2-p2p-series/signals`, correcting step 0):
  Bare handles SIGTERM through `process.on`; npm's `bare` wrapper on a
  host suppresses signals, so long-running Bare processes on a host start
  with the runtime's binary, as containers do.
- **A node joining** (`steps/5-node-joining`): provisioned through the
  auxiliary swarm as designed (the manager authorises the ephemeral key the
  container logs; the secret on a channel, once), run from the master's
  packages by replication at a pinned commit, live from the boot
  repository. Code loaded by replication needs an exec tmpfs of its own
  (native addons do not load from Docker's default noexec tmpfs): the store
  stays noexec, the code's mount is exec, a trade-off recorded. A restart
  rebuilds the node with the same identity, but what its repositories took
  in since start is lost until checkpoints are built.
- **Genesis** (`steps/4-genesis`): the swarm manager starts the master
  through its node manager, in a hardened container with its store in
  RAM and its secret on stdin; the master starts the swarm's DHT, serves
  p2p-rns, and primes its packages from its image, reproducibly (its
  repositories' internal ids derived from its identity, so a rebuild keeps
  keys, commits and ids). From the host, its resources resolve by URI and
  read lazily. The vault is still a stand-in.
- **Repositories on Hypercore, as mycelium sees them** (`steps/3-repositories`):
  p2p-mrepo gives mycelium repositories on a p2p-store as mycelium
  backends; mycelium-git's contract suite and command sets pass on them;
  test-run instances on Hypercore, executed under Bare, record the same as
  native ones.
- **The p2p series composed** (`steps/2-p2p-series/validation`): two peers
  find each other, connect, replicate lazily and talk on a channel, on
  Node, on Bare and between the host and a hardened container with its
  store on a tmpfs; every module's events form each peer's audit.

## Authority: the swarm and the substrate

Agreed 2026-11-02. The swarm is the authority for all that is the swarm
(members, names, resources, the swarm's part of a deployment, as a
repository on the master). The swarm and node managers are the authority
for the substrate (containers, networks, images, vaults, host resources).
A 100% split: neither writes the other's domain; nodes may hold a shadow
copy of their managers' state, read-only. The exception is auto mode: a
manager in auto mode accepts updates from the swarm and acts on its
substrate for them; otherwise it reports. (`notes/haicc-reconcile.md`.)

## Open

1. **The secure processes** for the keys that need securing: the
   Corestore on the host, any transport of a secret (only vault to vault,
   encrypted to the receiving vault's key), and the code in the container
   (only verified code, the secret only in memory).
2. **Release or sign.** The vault hands the secret over into memory
   (start here), or keeps it and signs on request (stronger; depends on
   Hypercore allowing an external signer). Which vault first, and who
   generates a node's secret (proposed: the vault).
3. **The inbox:** framing large bundles in a core (or a size limit, with
   links for large data), admission of new writers, clearing accepted
   entries.
4. **The p2p series** (its instrumentation and audit included), and **starting from zero
   and joining** (the first node and its DHT, a node joining), step by
   step.
5. **Liveness** (built in step 8): a lease per node in p2p-rns, renewed
   by the node's heartbeat; absent when it runs out (flagged, not taken
   out: the name stays its owner's), present again on renewal; `leave` on
   a graceful stop. Open: how long an absent node keeps its name (a second,
   longer timeout that takes it out?), and the lease's length per swarm.
6. **The invitation**: how it travels (a file, a repository, a resource of
   the swarm), whether the master signs it, and address allocation on a
   data plane shared by hosts.

## A node's shutdown (2026-11-05)

Before a node is stopped, every party holding on to it lets go: the
shutdown is requested (a record), each party acknowledges in its own
record, and only then is the node stopped; it stays held until released.
Like programs closing before a computer shuts down. Today the one party is
the swarm manager's watcher (auto mode would bring the node back); each
application a node takes part in becomes another. Per node: the swarm runs
on. Code: `p2p-swarm-manager/shutdown.js`; record:
`steps/phase-3/1-packages-and-boot/7-shutdown/`.
