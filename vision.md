# Vision

References here to `docs/` and `notes/` point into this repository's
history: those folders were removed on 2026-11-11.

Status: **directions, not settled** (2026-10-30; taken from phase 2,
2026-11-07, where parts were agreed with the human and say so). Kept so
decisions take them into account, and added to every seed for
information. Details: `splectrum/dev-env-1-mycelium-git@33634de:notes/vision.md`,
`splectrum/dev-env-2-p2p-cluster@c6b73bb:vision.md` and its `notes/`.

## The mycelium base layer

From the bottom:

- **Hypercore:** storage and replication. Hyperdrive, and the
  filesystems git engines run on, sit here.
- **mycelium-git:** objects, trees, checkpoints and the repository rules,
  over a backend contract with several engines. p2p-git on Hyperdrive is
  one of the main components.
- **AVRO:** objects become data structures, with schemas and typed values.
  From here up, a URI names a typed value, not stored bytes.
- **Kafka:** streaming and high-volume data: records and topics. On
  Hypercore, a partition is a core, an offset a block index; no central
  broker, its functions taken on by peers.
- **Topics from the ground up:** a Kafka record is the elementary data
  container (the data in its `value`, whose schema is the data's schema;
  metadata in its `headers`; only the properties needed so far). Data
  lives in topics in Kafka's sense, single-partition to start, with
  Kafka's functionality and names, built basic and evolving into
  mycelium's p2p Kafka; state is built from topics, never written
  directly (`notes/topics.md` in `splectrum/dev-env-2-p2p-cluster`,
  `mycelium-topic`).
- **Multi-paradigm data:** records in topics are the lower level, objects
  (files, documents, any git object) the higher, side by side in a
  repository; an object may be generated from a change log of records,
  or exist in its own right. Built up as mycelium matures.

`mycelium-uri` and `mycelium-xpath` are the shared vocabulary across all
four. On top sit the **repository paradigms**: the dev env, the test-run
instance, the module repository, data instance repositories. Each is its
own set of rules and capabilities; the request flow, deploy, publish and
sync belong to the paradigms that use them.

## P2P and the outside world

Fetch and push are the outside world's way: a client reaches a server.
Inside P2P the same needs are met by subscription and replication. The
boundary is found, not assumed, once Hypercore is understood. Links over
copies follow naturally from the cluster: a node holds links and loads
lazily what it reads.

## Values on the wire and at rest

Agreed with the human, 2026-11-08: `docs/design/values.md` (the data type,
encodings and containers; compact-encoding the envelope, AVRO the content;
RPC on the replication connection). Mycelium repositories, the branch model
and portable execution: `docs/design/repositories.md`; the levels'
structure and Pear below HAICC: `docs/design/structure.md`.

## Packages, deployments and the cluster

- No npm inside P2P: a package comes in once, at the boundary, and then
  lives in P2P under its own identity, as a repository.
- A deployment links to packages (gitlinks or a manifest; on Hypercore a
  key and a commit) rather than containing them.
- A package repository holds the bytes; everything else holds links.
  Towards a single code repository: run repositories stay self-contained
  by holding links the cluster resolves, so kept runs get small.
- A seed node starts from a plain base with the runtime (Bare) only; a
  self-contained bootstrap repository sets it up. It is the first
  always-on peer; later nodes need only the bootstrap repository and its
  key.
- A cluster has a deployment repository, alive while the cluster runs:
  what it is, its nodes, its state and its monitoring.

## Operators

Single-concern repositories: each does one step of a multistep process
and keeps the record of it. Input is a request, output its response on
`main`; the next one takes it in itself. Every step can be traced and
rerun on its own. The test-run instance was the first.

## Bundles and storage

Bundles are the transport between repositories outside replication:
self-contained, immutable, verifiable, shared by hash. Loose objects stay
the working store; deltas are an optimisation for later.

## Organisations: infrastructure and language

Agreed 2026-11-02. The layers: the p2p and language substrate, mycelium
the repository layer, splectrum the language layer, haicc the project
layer; Splectral for interaction alongside them. **One rule: engines (all
code) in `pear-full-square`; what is made with an engine in its layer's
organisation.** A module's prefix names its layer (`mycelium-`,
`splectral-`, `haicc-`); the organisation says what kind of thing it is.
Dependencies run one way: everything depends on `pear-full-square`, which
depends on nothing outside itself.

- **Splectrum's tool**: the language layer will have a tool of its own,
  its modules (engines) in `pear-full-square`; the `splectrum`
  organisation holds the language modules made with it.
- **`haiccing`: projects**, run with HAICC's tools. Demo projects first
  (`demo-liveness`, `demo-other-host`: a test cluster, a Splectral install
  with its components, a scenario), deployed with `haicc-deployment` and
  `haicc-reconcile`. A development repository moves there only once the
  project tool can be used: today's, this one included, are manual
  collaboration, not structured by tooling, and stay where they are.

- **`pear-full-square`: the p2p infrastructure.** The p2p series, p2p-git,
  mycelium on the p2p layer, the node and its managers, and the Splectral
  platform (for seeing and working with running systems, the swarm
  first).
- **`splectral`: (interaction) components on the Splectral platform**, completely
  agnostic of p2p: they work in the platform's abstract world (hosts,
  nodes, resources by URI, activity), as mycelium works with the p2p
  layer's abstractions.
- **Splectral, the future vision** (the human, 2026-11-02): a platform for
  multiple functional components that are part of a solution. Approached
  step by step. First feedback towards it, from the local run of the
  demos (`steps/9-click-and-run/demos-local-run.md`): a solution (the demo
  app) as one tab with its own menu, its components as tabs inside it;
  time shown on every screen, not only the timeline.
- **`splectrum`: the language layer**: language modules, for building real applications on
  the mycelium p2p platform. What exists now as URI-expressed capabilities,
  together with AVRO (typed values named by URI), becomes a DSL platform:
  that is where splectrum lives.
- **HAICC, human–AI creative collaboration (in `splectrum`)**: the
  eventual tool for the whole cycle: ideas discussed, designed, requested,
  implemented, validated, released and deployed, with the records and the
  repositories as its memory. It is what this repository's process does by
  hand, made explicit and runnable, stage by stage. Its first module is
  the deployment stage, `haicc-reconcile` (`notes/haicc-reconcile.md`):
  declare what a module needs, check it, make it so.
- **`p2p-propagate`**: later, a desired state (node types and their
  configurations) carried across a swarm, each node reconciling its part.

## Authority, configurable

The split of authority between the swarm (its configuration, on the
master) and the managers (the substrate: containers, networks, ...) is the
current default, and the one implemented. It will be configurable: the
human sees scenarios for other settings, for example a passive swarm whose
configuration a host manages (the swarm cannot manage itself), or an (IoT)
node in a swarm where the node or the swarm manages the OS. Not designed
further yet.

## Packages

Modules are used as packages: sets referenced as one unit (below
mycelium, `third-party` and ours, `p2p`; then `mycelium`; `splectral`;
`haicc`). Third-party
code comes in once, at the boundary, and is ours from then on. Projects
layer as cascading click and runs (`notes/packages.md`).

## Releases and Pear

- Pear (Holepunch's runtime and platform for p2p applications: staged,
  seeded and released from a `pear://` link) comes in when versions are
  fixed: released versions of Splectral and the tools, run from a link.
  Until then, everything runs from the development tree.
- There is always a public component (Pear's platform, a first fetch), and
  air-gapping is possible: our swarms keep their own DHTs, and what is
  fetched once can be seeded on our own network.
- Nodes keep getting their code by replication of the swarm's packages
  repository, inside the swarm: that is mycelium's, and becomes the
  capability store.


## Pipelines, and mycelium as a database server

Discussed with the human, 2026-11-13: a direction for the distant horizon.
What the human said is stated as it is; what is marked proposed or open is
not agreed. The practicalities are designed when the work reaches it.

### The pipeline engine

A platform to run processing pipelines (as StreamSets does), our own, on
p2p, tied in with our request processing.

- **Built from core actions:** the protocols provide core actions; more
  complex processing is built from them, typically the output of one the
  input of the next. New functionality is tried out as a pipeline; a
  protocol package is created only where needed.
- **Run as requests:** each step is a request, executed completely on its
  own, so a pipeline runs asynchronously and in parallel. Which pipeline
  and which step is metadata on the record.
- **Its start:** one ordinary request, of a single type, the only one that
  can come from outside. It is rewritten with the pipeline and step
  identifiers and executed; every other request of the pipeline is
  internal.
- **Its state:** the pipeline's request branch, an execute branch of
  `main` named by the unique pipeline request id. A step merges into that
  branch at its end; the pipeline merges into `main` at its end, as one
  commit, the pipeline request's. The steps' history stays out of `main`.
  A plain request stays as it is (it could be seen as a pipeline of one
  step).
- **Its data:** what passes between steps is the record; larger data is
  on the pipeline's branch, referred to by URI. The pipeline cleans up as
  it runs, so that at merge time only the data that needs merging is
  there.
- **Errors:** handled by the pipeline's definition, for example diverting
  to an error handling path. What happens to the request branch after a
  failure is configuration: discarded, or kept for debugging.
- **Execution plans:** the rewrite is where a plan is made, fixed or on
  the fly.
- **Compiled:** a pipeline written in code, loaded and executed: for
  heavy processing, to gain speed; or for complex jobs over distributed
  remote data, where a plan optimised for the installation can be created
  (long-running batch processing).
- **Written** in a graphical UI or a scripted language. AVRO between the
  steps (schemas: an output checked against the next input).

Proposed, not agreed: the completion of a step places the next one, read
from the definition (no coordinator process); compiled code as a generated
protocol package; the pipeline taking the place of the composite actions
on the roadmap. Open: joins, parallel steps writing the same path, the
definition's format, the grain (a request costs several commits: a step
works on a batch, not on one record).

### A database server

The human: the pipeline engine is a necessity when mycelium is implemented
as a database server. A reading of how they meet, not designed: a query a
pipeline, its operators steps on the core actions (CRUD first); the
execution plan the query plan; the pipeline's branch the transaction (a
snapshot of `main`, one commit at the end, the branch discarded a
rollback); AVRO the rows' schema.

### Data is local

- **Processing is over local stores**, which may be replicas of stores
  from elsewhere. Replicated lazily, such a store works as a cache: a
  block fetched on first read, verified, local from then on.
- **Cache management with a TTL** can be a process on it. Hypercore
  (11.39.6, the one pinned) has `clear` (blocks dropped, fetched again
  when read) and mark and sweep (`startMarking`, `sweep`: what was not
  read since is cleared); it keeps no time per block, so the TTL is ours:
  the period between sweeps, or our own record of use. Only replicas of
  others' cores are cleared, never our own. Open: a TTL per store or per
  source.
- **Applications are designed in local data terms:** a classical
  distributed application is logically one central application, and
  physically runs on each node that has signed into it. To design per
  application: the order of writes (no single place where they arrive),
  global constraints, authority (who is accepted as a writer; every node
  validating what it applies).
- **The atomic commits of `main` come in handy here:** a replica is seen
  only at commit boundaries; a commit is the unit of change, one per
  pipeline request, and names what it was based on; a pipeline reads one
  snapshot throughout. The atomicity is per node: combining two nodes'
  `main` is a merge whose rule is the application's.
