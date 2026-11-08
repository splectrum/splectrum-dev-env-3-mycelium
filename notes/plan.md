# Phase 2: plan

Status: **proposed, 2026-10-31**. The request's phase, reworked along the
design (`node-pattern.md`; `multi-swarm.md` stays vision). Step by step,
one thin path end to end before generalising; each step is a request whose
execution is recorded, with metrics at the boundary, and nothing moves on
before its step is validated. Where a step settles a design choice, the
rules follow (`rules.md`): the rules constrain the implementation.

**Start simple, prove viability, then move on.** We are going to build many
resources (the lookup, the swarm's record, request delivery, the capability
store, ...). Each comes **in code first**: plain code behind the contract
it will keep, enough to prove the pattern end to end. Its
**repository-based implementation** (a mycelium repository with inbox and
intake) comes further down the roadmap, behind the same contract, so what
uses it does not change.

## The layers being built

A **swarm** is the cluster: the set of nodes joined over the p2p layer.
"Host" means the host machine only. The **master node** is the swarm's
first node (the seed), controlled by the swarm manager. All our modules are
in `pear-full-square`; from the top down:

| Layer | Modules | Concern |
|---|---|---|
| management, on the host machine | `p2p-node-manager`, `p2p-swarm-manager` | a node; the swarm (the nodes it controls, priming, genesis): starting, provisioning, monitoring, recording |
| the node | the node application | the node repository in operation; composes the layers below |
| resources | `p2p-rns` (the resource name service), first | rooted in p2p, delivering abstracted services (URIs and identities) to their users, mycelium among them |
| the data fabric | mycelium (`mycelium-uri`, `-xpath`, `-git`, `-layer`, `-repo`) | repositories and their rules over contracts; p2p-git is one engine; knows nothing of p2p |
| git on Hypercore | `p2p-git` | git objects and refs on a Hyperdrive (its `hyperdrive-fs`) |
| the p2p series | `p2p-store`, `p2p-dht`, `p2p-connect`, `p2p-replicate`, `p2p-channel` | storage, discovery, connections, replication, messages; no git, no repositories, no management |
| Holepunch | Hypercore, Corestore, Hyperdrive, Hyperswarm, HyperDHT | storage, replication, discovery |

Managing happens only at the top, in the two managers; everything below is
mechanism.

## Steps

### 0. Probes (local, small) — done

Record: `steps/0-probes/`. The store lives in RAM (it holds its secrets);
explicit keypairs work; the auxiliary swarm works.

1. What Corestore and Hypercore persist when the primary key is passed in
   at open: does a secret reach the disk?
2. A container (plain base, Bare) joining a DHT and a node on the host,
   over an internal network.
3. A Hyperdrive opened writable with an explicit keypair.

They decide whether "secrets in memory only" and the auxiliary swarm hold
as designed.

### 1. Mycelium back to its own concern — done

Record: `steps/1-mycelium/`. Test run r2: 507 of 507 met; the product
repository at `pear-full-square/mycelium-git@c97f3a0`.

- mycelium-git returns to the backend contract over a given filesystem:
  `openHyperdrive`, the Hyperdrive engine and the Corestore and Hyperdrive
  dependencies leave it (their tests move down with them). Its engine
  adapters, p2p-git's included, stay: it uses p2p-git as an engine and
  knows nothing of Hypercore.
- git on a Hyperdrive sits below, in p2p-git: its Hyperdrive adapter
  (`hyperdrive-fs`) is what makes it p2p.
- mycelium-git's dependency names `pear-full-square/p2p-git`.
- The product repository `pear-full-square/mycelium-git` is updated.

### 2. The p2p series, minimal and instrumented — done

Record: `steps/2-p2p-series/`. Five modules, instrumented; two peers
validated on Node, on Bare and host to container; the product
repositories at their first versions.

| Module | Concern | Capability |
|---|---|---|
| `p2p-store` | local storage: the Corestore opened with a given primary key (nothing secret on disk), resources by name or key, explicit keypairs; works with no peer at all | `state/hyperdrive` |
| `p2p-dht` | discovery: a persistent DHT node, a private DHT's bootstrap (two persistent nodes at least), announce and lookup | `p2p/discover` |
| `p2p-connect` | connections: the server on the node's keypair, outgoing connections, the membership hook; yields encrypted streams | `p2p/connect` |
| `p2p-replicate` | moving data between stores: which resources may replicate to which peers, accounting per peer and resource, explicit transfers (hold, pin, prefetch, mirror), over any stream | `p2p/replicate` |
| `p2p-channel` | messages on a connection, not stored: the secret handover, requests and lookups in code, later dedicated channels | (new) |

- Each usable alone or in combination; the application composes them.
- **Instrumentation and audit in every module**, by one shared contract:
  structured events (what, when, which peer key, which resource key,
  bytes, outcome) and counters, through an observer the application gives
  it; never a secret, only facts about one. Audit (who did what,
  append-only) and metrics (summarised per interval).
- Only what the next steps need, first; more as they ask for it.
- Validated: two peers on one machine, then one on the host machine and
  one in a container; the audit and metrics of each recorded.

### 3. Repositories on the p2p layer — done

Record: `steps/3-repositories/`. p2p-mrepo; test-run instances on
Hypercore under Bare: r5 and r6 627 of 627, identical to the native runs;
the machinery pinned at `dba3214e`.

- Create a repository (its keypair, owned by its node), import one from
  the boundary (a bundle or a native repository), open one by key, clone
  (a new key, its origin recorded); reopen on start.
- The contract suite and the command set on a repository and on a replica
  (reads).
- **Test-run instances on Hypercore**, executed under Bare: this completes
  the request's first done item as intended.

### 4. The swarm: genesis — done

Record: `steps/4-genesis/`. p2p-rns in code, p2p-node (master), the
image, minimal node and swarm managers; a swarm from zero, its master's
resources resolved by URI from the host, read lazily, restarted with the
same identity, stopped gracefully. The master's code comes in its image
and its secret on stdin from a vault stand-in (an owner-only file, not yet
encrypted).

From zero: the swarm comes first, everything else joins it.

- `p2p-swarm-manager` starts the master node (through a node manager, as
  every node is started): genesis from non-P2P repositories, the first
  DHT (two persistent nodes), the packages primed.
- **The lookup, `p2p-rns`, in code**, on the master node, in memory, for its lifetime
  only: register (owners only: a node under its own name; a node's name
  checked unique when it joins), resolve a URI (`/<swarm>/<node>/<name>/...`)
  to its internal id and key, list by URI pattern, reverse. Its users see
  URIs and identities only; registrations and lookups are carried as
  messages (`p2p-channel`), the sender's identity from the connection.
- **Packages in code first:** the master node serves the node packages as
  a resource (pinned, a multi-module package with one dependency tree).
- The swarm's record in code first (the lookup and the managers' own
  records), reached through requests.

### 5. A node joining — done

Record: `steps/5-node-joining/`. A node provisioned through the auxiliary
swarm, run from the master's packages by replication, live from the boot
repository under its name; requests in code answered; restarted with the
same identity. Not yet: an image with the join closure only, the master
provisioned the same way, admitting request writers, rebuilding a node's
repositories from checkpoints.

- `p2p-node-manager` on the host machine starts the node: containerised
  and hardened, from the plain base with the join closure only; provisions
  it through the auxiliary swarm (the secret into memory from the vault,
  an encrypted file first); monitors it (logs, lifecycle events, resource
  samples) and records it; graceful stop, restart, rebuild.
- The boot repository cloned live into the node's Corestore under its own
  key; the node repository in operation.
- The node joins with its friendly name, loads its packages from the
  master node by replication and materialises them, and registers what it
  creates in the lookup.
- **Requests in code first:** delivered as bundles over `p2p-channel` into
  the receiving repository's intake, which commits them into
  `pending/default`; responses read from the replica.
- Validated: nodes resolving each other's repositories by URI.

### 6. A node on another host — done

Record: `steps/6-other-host/`. The other host simulated on this session's
machine: its own node manager, vault and auxiliary network, given only an
invitation; one data plane shared by the hosts (a DHT node has one
address). Found: nothing tells the swarm a node has gone (liveness, open).

- A node on another host joining under its own node manager: the general
  pattern (a swarm manager manages only the nodes it controls).

### 7. Splectral and data in topics — done

Record: `steps/7-splectral/`. Validation in one place; `mycelium-topic`
and the managers on topics; a management channel and an observer on every
node; the Splectral platform, its p2p adapters and two applications; the
step 6 scenario watched live in a browser, recorded and replayed.

Design: `splectral.md`, `topics.md`. A platform, its first use a viewer: a browser app showing swarm and node activity live,
for demos and explainers alongside the closed-box tests: an observer
application on every node, piping through the management channel to its
manager and on to a host-local Splectral server; watchers mapping to topics,
pages and scenarios as extensions, the menu following what is available.
Its request is written when the step starts.

### 8. Liveness — done

Record: `steps/8-liveness/`. p2p-rns holds a lease per node and flags a
node absent when its lease runs out (records kept, flagged; the name its
owner's), present again on renewal; a graceful stop leaves. Nodes renew at
a third of the lease, drop a stale connection to the master; requesters
refuse an absent node at once. Splectral shows presence; the scenario "A
node goes quiet" watched live and replayed. Found and fixed: a graceful
stop's last log lines were lost (the node manager's blocking stop), and
the swarm manager read a cache half written.

### 9. Click and run — done

Request: `pending/phase-2/step-9-click-and-run/request.md` (`9c16387`). A
demo is a project (`haiccing`) brought up with one command, then clicks:
`haicc-reconcile` and `haicc-deployment` (`haicc-reconcile.md`: the
engine, configuration apart from running, the lifecycle), Splectral as
part of a project and spoken to through topics, tabs, the demo projects,
the local run's fixes. Record: `steps/9-click-and-run/`.

### 10. The deployment on the swarm — done

Request: `pending/phase-2/step-10-deployment-on-swarm/request.md` (`b67fae5`).

The swarm's part of a deployment as a repository on the master,
replicated; the managers the authority for the substrate, a 100% split but
for auto mode; nodes shadowing their managers (`node-pattern.md`,
authority). The roadmap's "swarm's record as a deployment repository".

**Phase 2's request is met** (steps 0 to 10; the mapping below).

## Phase 3 (begun 2026-11-05)

Design: `packages.md`. Its own request is written as its scope settles.

- **Step 1, packages and the boot** — done in the session
  (`pending/phase-3/step-1-packages-and-boot/request.md`); the `haiccing`
  repositories published by the local agent (`handover-packages.md`).
  Record: `steps/phase-3/1-packages-and-boot/`.
- **Step 2, the demos again** (the phase's last) — built
  (`pending/phase-3/step-2-the-demos-again/request.md`): swarms made from
  packages and deployed through the root, nodes running the codebase in
  containers, Splectral on Bare, both demos. Closes with the tenth release,
  the local agent's check and the phase's report.
- Then, as agreed: the p2p version (one code repository per swarm),
  pinning once the system works, Android (a Termux probe).

## Proposed next phase: applications on mycelium repositories

Proposed by the human (2026-11-07), to be designed step by step, each
decision made with the human; nothing decided yet. The context applications
run in: mycelium repositories, and execution in the node's container.

- **A repository's visible state is composed**: its own layers, and
  read-only mounts of data structures from other repositories (links, not
  copies).
- **Sync changes visible state**: a mounted source's change, replicated,
  changes the visible state of the repositories mounting it.
- **Visible state changes trigger internal processing requests**: the
  repository's node writes a request into its own `pending/default` as a
  consequence of the change (nothing is sent between nodes), executed by
  the existing flow in the node's container, on fixed states, as a unit
  (rerunnable); its result the repository's own state, which others may
  mount in turn.
- **Self-contained**, as everything else.
- Open, to design: where a mount is declared and what it names; whether it
  follows the source or a pinned commit; the trigger rules; what executes
  a request (the swarm's codebase, by capability); the data's form at the
  start (files in layers, then records); the first application, shown in
  Splectral.

## Further down the roadmap

- **Teardown with checkpointing and backup** (the human, 2026-11-06). The
  first teardowns are a plain remove (a manager's: leave the swarm, shut
  its container down, remove what it made, keeping its HAICC setup; the
  root's: each manager's, then its own, keeping `haiccing/`). Later: the
  state saved before removal (the vaults, the swarm's repositories, the
  deployments), so a teardown can be undone or its state restored.
- **The documentation as a swarm app** (the human, 2026-11-07): a Splectral
  component that reads the documentation from the packages in the master's
  package repository, so the platform's documentation (`docs/`: the design,
  the rules, the guides; the platform's user guide is for people and agents
  alike, the rest mostly for agents) is read where the code runs, at the
  version deployed. Where `docs/` lives and how the packages carry it: to be
  decided with it.
- **The development environment as the whole pipeline** (the human,
  2026-11-07): this repository as the code-development repository for the
  modules of every organisation, implementing the pipeline's processes end
  to end, from three angles: cloud (a session on a GitHub checkout, in a
  sandbox), local (an always-on Linux machine, a swarm node, with agents that
  take part in the local test automatically while cloud development goes
  on), and the swarm. Under discussion; built over time. Agreed so far
  (`docs/design/pipeline.md`): the modules as the source of truth; cloud
  and local through GitHub; candidates rebuilt and compared; tailored
  development environments, one per set of requirements, from a template,
  discarded when done (its open questions there).
- **The host on Bare** (the human, 2026-11-06: where we need to get to). **Done
  for the platform (2026-11-07)**: `notes/packages.md`, "On Bare"; each later
  package on Bare from the start.
  Today the host side runs on Node.js (the root's HAICC, the package
  manager, the managers, Splectral's server); Bare only in the nodes. One
  runtime everywhere: Bare at the root instead of Node.js (one binary; the
  full one kept in the root folder), the host's processes on Bare. A probe
  first (what Bare's modules give for child processes sharing the terminal,
  reading from it, tests, fetch), then the root, then the host's processes.

Each replacing its in-code version behind the same contract, once enough
is built and proven:

- `p2p-rns` on a repository (inbox and intake), replacing the in-code
  lookup at the end of an install;
- the inbox as writer cores (priority, internal or external), for
  repository-to-repository talk without a live connection;
- the capability store as a repository: packages as commits of gitlinks,
  validation by test runs, availability, a repository's `capability/default`
  as gitlinks; kept runs holding links into it;
- the swarm's record as a deployment repository (step 10).

## The request's done, mapped

| Request's done | Where |
|---|---|
| 1. contract suite and test-run model on a persisted Hyperdrive under Bare | steps 1 and 3 |
| 2. two Bare nodes in containers, Hyperswarm, a replicated repository | steps 2, 3, 4 and 5 |
| 3. a node from a plain Bare base through a bootstrap repository, packages loaded lazily | steps 4 and 5 (packages in code first) |
| 4. a deployment repository bringing up a seed and a joining node, recording them | steps 4 and 5, in code first; the deployment repository: step 10 (record: `steps/10-deployment-on-swarm/`) |
| 5. every step recorded and rerunnable, metrics at the boundary, small runs | every step; small runs with the capability store, further down |

## Not in this phase

The vision in `multi-swarm.md` (boot, management and destination
memberships as separate swarms, closed-box devices), mobile, streaming
channels, zero knowledge, AVRO and Kafka.

## Needs the human

- Created in `pear-full-square`: `p2p-store`, `p2p-dht`, `p2p-connect`,
  `p2p-replicate`, `p2p-channel`, `p2p-node-manager`,
  `p2p-swarm-manager`, `p2p-node`, `p2p-rns`, `p2p-mrepo`; `p2p-git`
  moved there.
- Open in step 2: where audit goes (proposed: an append-only, signed core
  per node, replicated to its node manager over the management plane;
  facts only, never secrets) and how detailed it is.
