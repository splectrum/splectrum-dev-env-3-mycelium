# Phase 3: plan

The phase's request: `pending/phase-3/request.md` on `pending/default`.
Planned here as the work goes (the request: "the work is planned here, as
it goes"); each step a request of its own, its record in `steps/<step>/`.

## Steps

| Step | What | Status |
|---|---|---|
| 0 | The setup: the seed planted, the development state from phase 2 (`0-setup/`) | done |
| 1 | The review of phase 2's code, and the refactor (`1-review/`) | the review discussed with the human, decisions in `1-review/findings.md`; the dead layer and the unused CLIs removed; the fixes and new modules next |
| 2 | The documentation: the stale notes cleaned up, the documentation split into clear sections | to come |
| 3 | Mycelium repositories on a swarm: data hives, mounting, a repository for the logs | to come, designed with the human step by step; needed everywhere (the human): every level's config and state in its own repository, the node's first; the branch model for portable execution at its core |

## Direction: the folder structure and mycelium repositories

Discussed with the human, 2026-11-08; to start in this phase, designed step
by step with the human.

- **Every level set up as a node is.** The host, a swarm's master, a node:
  the same layout; its code a folder (a view of the packages repository);
  its config, state and log in its own p2p repositories, in a store of its
  own; its own HAICC. Then it does not matter where HAICC runs (a
  container, the host, another machine): one structure, one set of
  commands, one test path. HAICC is mainly a wrapper (of the package
  manager, `docker-manager`, mycelium's operations) with what a wrapper
  needs (config, the levels); `haicc-base-boot` and `haicc-deployment`
  converge into one HAICC; host B simply runs a node setup.
- **What differs is what is provided, an organisational matter**: Docker, a
  person at a terminal, the network, the runtime. HAICC asks what is
  provided, not where it is (the agreed `host.json`, generalised). A
  capability may be provided from elsewhere: a node managing Docker
  through a proxy on the host (`docker-manager` exposed to authorised
  peers, narrowly: its swarm's containers, hardened), as `vision.md`'s
  configurable authority.
- **The repository is the truth; a working tree is a view at the
  boundary.** Our code reads and writes repositories through mycelium,
  never files; a working tree is only for what cannot go through mycelium:
  a person, Bare loading code, Docker's mounts, the browser. A repository
  on the p2p layer is stored in its Corestore (RocksDB through
  `hypercore-storage`: on disk, not as readable files; a Hyperdrive holding
  the git directory), so a view is made from it: extracted by mycelium
  (incrementally, by tree differences; atomically where readers must not
  see half a commit), later a read-only, lazy mount. Changes go back only
  as commits. Syncing a `.git` folder file by file is not a way: not
  atomic, the working tree does not follow, hooks would come along.
- **Code reaches a level by replication, then a view**: extracted today
  (host B already does: `p2p-node/boot.js`); later perhaps a module
  loader for Bare reading through mycelium (as Pear loads from a
  Hyperdrive), to be probed. The host's mounted `packages/` is a
  transitional shortcut for one host.
- **Portable execution, triggered by data** (the human): the equivalence of
  structure makes execution portable. With self-contained repositories,
  execution is triggered by data: code executing puts a request into a
  repository; an active repository (an executor attached) takes it, runs
  it as a unit and writes the response; a passive one syncs to an active
  one, the execution happens there, and the result syncs back. Where
  something executes is a matter of which repository is active, not of the
  code; a unit gives the same result wherever it ran. The structure built
  in this phase must allow it; the triggering itself is out of this
  phase's scope (the request: "Triggers and internal processing requests"
  not in this phase).
- **The branch model for portable execution** (the human: crucial to make
  it work; the starting point, worked out in step 3). Hypercore has one
  writer per core, so a repository on a Hyperdrive has one writer: the
  branch model follows the writers. Each branch is written by exactly one
  party, in a store of its own; what looks like one repository is a
  composition of layers from several writers (`rules.md`, Layers: disjoint
  layers, never merged, only referenced; local, imported or virtual).
  - The passive repository writes only its requests (`pending/<…>`); it has
    no `main` and no `execute/*` of its own; it reads the active one's
    `main` by replication, as a read-only layer.
  - The active repository writes only `execute/main` and `main`; it reads
    the passive one's requests by replication, as a read-only layer.
  - The flow: a request committed on the passive side; replicated, an
    imported layer on the active side; executed as a unit on
    `execute/main` (the request layer's commit among the unit's fixed
    states, so it reruns exactly); merged into `main`; replicated back, the
    passive side's composed view showing the response. Nothing merged
    across writers; each side moves only its own branches.
  - Several requesters are several request layers, one per writer: the
    request manager's "several source types", a source being a layer of
    another repository. Composition (read-only references into another
    repository's data) is this phase's hives and mounting; the request
    flow is its first user. One repository both requester and executor
    (active for its own requests) is a configuration of the same model.
  - Near real time (the human): RPC with the replication, on the same
    connection (`vision.md`, "Values on the wire and at rest"): RPC as the
    signal, replication as the record. The passive side commits its
    request and sends "request <name> at commit <id>"; the active side
    fetches exactly those objects at once, executes, and answers "response
    at main commit <id>"; no polling, no reader having to notice. A small
    request may travel in the RPC message itself, so the work starts before
    replication completes; but the unit runs only on what is in the
    replica (the request layer at its commit): what is recorded, and what a
    rerun uses, is always the replicated commit.
  - Open: how a composed repository names another writer's layer (by key,
    by URI) and whether it is pinned to a commit or follows the latest;
    where the request manager runs (in the active repository, over the
    request layers it subscribes to); whether any branch needs several
    writers (Autobase) or one writer per branch is enough (proposed: one
    writer per branch to start).
- **The rename held** (`haicc-deployment` to `haicc-base-node`): until the
  two HAICCs converge (the human).
- Open, to settle with the human: logs as topics (records appended, Kafka
  style) rather than a commit per line, state as git objects; how config
  is changed (a `haicc` command, or a view edited and committed); a
  minimal plain-file log kept for the cold boot and the store's own
  failures.

## To pick up when the work touches the area

Recommendations and decisions waiting for the area to be worked on; each
taken up then, with the human, and the code there reviewed further for
improvements as the work builds on it.

- **Splectral, done properly** (the human, 2026-11-08: it was plumbed in for
  the demos only; to be done properly in this phase). Recommended:
  - `p2p-node` knows no Splectral and no manager: it offers one general way
    to attach an application to a running node (the node and its input
    handed to it), naming none; what is attached comes from the node's
    configuration, started through the node's HAICC; the observer
    (`splectral-p2p-observer`) and the manager's shadow attach themselves.
    Today `p2p-node/cli.js` imports the observer under `--observer=true`
    (undeclared) and reads the shadow from stdin.
  - Splectral wrapped in HAICC: the server and its `act` through HAICC
    (findings, decided 5).
  - Splectral's p2p side asking the owners: Docker through
    `docker-manager`, the swarm's nodes through HAICC, the node manager's
    topic layout from `p2p-node-manager` (findings, decided 8).
  - The review's Splectral findings (`1-review/findings.md`, 3, 6, 8):
    p2p keys in the contract's abstract world and the model, the whole
    config (vaults) given to every action, action arguments not validated
    at the boundary, the browser side without tests.
  - Its real-time communication: the RPC server on AVRO, on the replication
    connection (`vision.md`, "Values on the wire and at rest").
- **The node's own repository** (the human, 2026-11-08: why a mycelium
  repository operational matters, it is needed everywhere): the node's
  config and state, and its events as a topic, in the node's own
  repository (the node has one, `node.repos.node`). The manager writes
  what it decides there (container, image, address) instead of a shadow on
  stdin; the node reads its own data and knows no manager; the manager and
  Splectral subscribe by replication, knowing no event kinds. Today
  `p2p-node` keeps the manager's shadow (`index.js:259`, `:293`) and
  `p2p-node-manager` knows `p2p-node`'s and the observer's event kinds
  (`index.js:166-182`): findings, decided 12.
- **HAICC in the container**: the node's program started through the
  node's HAICC (findings, decided 5).
- **The cold boots**: the initial one may use the module directly; every
  other wrapped in HAICC; the shell commands analysed and wrapped (findings,
  decided 5).
- **The log writer**: when the logs are a mycelium repository (findings,
  decided 1).
- **The request queue**: the request manager, several source types
  (findings, decided 9).
- **Host B**: whether it runs HAICC (findings, decided 2).
