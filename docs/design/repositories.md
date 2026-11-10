# Mycelium repositories: storage, layers, the framework, the API

Status marks: **built** (in the code, tested), **agreed** (decided, not
built), **direction** (the way to go, its design later), **open** (to
settle). Decided with the human in phase 3 (2026-11-08 to 10); how each
decision was reached is in the step records (`steps/1-review/`,
`steps/2-rebuild/readme.md`). This file says what holds now.

## The repository is the truth; a working tree is a view

**Agreed.** Our code reads and writes repositories through mycelium (the
backend contract: `select`, `read`, a writer's change, commits), by URI from
the branch root; it never needs files. Files exist only where a process
needs them (Bare running a bundle, `dlopen`, Docker's mounts) or where a
layer is stored on disk by its kind (below).

- **Reading**: by URI, at a pinned commit (`pinned(backend, state)`); a copy
  of a layer as files is extracted from a commit, never edited, replaced
  when the layer moves.
- **Writing**: only as commits (a writer's change, a merge), never by
  editing files in place.
- **Sync**: replication moves the repository, never a folder synced file by
  file (not atomic: a ref can arrive before its objects).

## One repository over two stores

**Built** (2026-11-10). A repository's layers are stored by how they are
written, in one of three modes:

| Mode | Where | Written | Layers |
|---|---|---|---|
| **atomic** | the Corestore (a Hyperdrive holding the git directory, p2p-git's) | one commit at a time, by the store's single writer (the runtime) | `main`, `runtime` |
| **replicated** | the Corestore, and copied out as files for the process that needs them | as atomic | `packages` (its files at `<work>/mrepos/<name>/packages/`: Bare, `dlopen`) |
| **non-atomic** | git on disk, `<work>/mrepos/<name>/.git` | by its own writers, in parallel, one per branch | `request/*`, `inbox`, `outbox`, `execute/*` |

- **One repository to everything above it**: `mycelium-git`'s
  `mixedBackend` wraps the two stores behind the backend contract (it
  passes the contract's tests), routed by the branch's layer (`isLocal`:
  `request/*`, `inbox`, `outbox` and `execute/*` on disk); the branches of both are listed
  together. `p2p-mrepo` opens a repository with its disk side when given a
  folder for it (`local`).
- **Objects**: written to the disk side; a commit or a tree written there
  gets what it refers to first, so the disk side holds the whole history of
  what it has. When an atomic branch moves, its commit's objects are
  transferred into the Corestore (`transfer`: the same ids, those there
  skipped) before its ref, so the Corestore always holds its layers whole
  on its own. Reads take an object from whichever side has it; history and
  merges are computed on the disk side.
- **One engine**: p2p-git on both sides (on a Hyperdrive; on `bare-fs`), so
  no `git` binary is needed and both behave alike. The storage's owner
  chooses the engine (`p2p-mrepo`); `mycelium-git` imports none.
- **What replicates**: the Corestore only. A peer holding a replica sees
  the atomic and replicated layers; the non-atomic ones are the repository's
  own working state. (`request/done` replicated as a topic: below, open.)
- **One writer per store, parallel writers on disk**: the Corestore opens
  writable once (`structure.md`, "One writer per store"); git on disk takes
  parallel writers, one per branch (objects content-addressed and renamed
  into place, a ref moved under its own lock only from the commit expected).
- *Why*: git gives the consistency and our use needs no indexes, so RocksDB
  (and the single writer it brings) only where replication needs it.

**Built** too (2026-11-10): **a repository on native git**, standalone,
every layer on the filesystem (`native.md` in the seed
`roadmap-1/seeds/dev-env-3-mrepo-native/`): the runtime opens its
repository by the setting beside it, `<work>/mrepo.json`
(`{ "storage": "git" | "p2p", "name" }`; without it, the p2p host): `git`,
`mycelium-git`'s native backend on `<work>/mrepos/<name>/.git` (a bare
repository); `p2p`, the hybrid. The same runtime, protocols and inputs on
both (the cycle tested on both).

**Agreed**, not built: an extension layer declaring its mode when it is
made; `request/done` as a visible, non-atomic topic (appended by its own
writer, held in the repository by reference: `values.md`, "A
topic in git").

## Layers

**Built** for those the host's repository has (the boot creates them).

| Layer | Holds | Mode |
|---|---|---|
| `main` | the repository's data | atomic |
| `packages` | the code store: bundles as objects by `[org]/[package]` (`/packages/haiccing/base-package-haicc.bundle`), native addons by hash (`/packages/addons/<sha256>`), the pinned manifest (`/packages/manifest.json`); laid out as a source, so it is a source for others | replicated |
| `runtime` | the runtime's data: `/runtime/service.json` (the service state, the type), `/runtime/api.json` (the type's API, once initialised); later its settings and signals | atomic |
| `request/pending/default` | the local queue: requests waiting, one record each (one queue per source, `request/pending/<source>`, later) | non-atomic |
| `request/execute` | the request being executed, its record completed by the execute protocol | non-atomic |
| `request/done` | each finished request with its full record, in the order done (its commit chain): the repository's history (below, "No log") | non-atomic (agreed: visible, as a topic) |
| `inbox` | the records posted to the repository, as they came; nothing removed (housekeeping later) | non-atomic |
| `outbox` | the answers and what the repository sends, its single writer the runtime | non-atomic |
| `execute/<target>` | an execution branch: made from its target, written by the execute protocol, merged back into its target (`execute/main`, `execute/runtime`, `execute/request/execute`) | non-atomic |

- **Layers are disjoint, never merged into each other**; a layer's
  execution branch is merged back into its own layer only. A move between
  layers (`request/execute` to `request/done`) is the owning protocol's, by
  writes. (`rules.md`, Layers.)
- **`packages`, no purposes in it** (agreed): a level's packages layer holds
  what that level runs. Testing is a separate instance (its own
  repository) composing what it needs by reference: its packages a mix of
  production and development builds by a custom manifest marked `mixed`,
  signed by a development key only a test level accepts (`packages.md`).
  Every bundle checked by its hash either way. A bundle is one blob: the
  same bundle in many repositories is one object; replication moves only
  what a peer lacks.
- **Another writer's layer is named by URI, pinned first** (agreed): the
  reading repository's commit is fixed before anything is resolved; a URI
  is then resolved through the mappings as they are at that commit (which
  repository, which layer: part of the repository's own state, the resource
  name service resolving names on a swarm). At a pinned commit every URI
  means one thing, so a read or a unit is reproducible from it.
- **A repository's URIs are its own** (agreed): stored data names by
  repository-scoped URIs (`/main/x/y`), never by a host's or a swarm's; a
  mapping at the repository's boundary translates. *Why*: a repository
  moves, is restored and replicated across roots unchanged, and a recorded
  unit reruns exactly wherever it is.

## The branch model: one writer per branch

**Agreed.** Each branch is written by exactly one party; no multi-writer
layer (Autobase); a multi-writer of our own, tied in with git merge, may
come later. What looks like one repository is a composition of layers from
several writers (`rules.md`: local, imported or virtual). Nothing is merged
across writers.

**Direction** (its own design, later): **passive and active repositories**.
A requester (passive) writes only its `request/pending`; an executor
(active) reads it by replication, executes, and writes `request/execute`,
`request/done`, `execute/main` and `main`, which the requester reads back.
Several requesters are several request layers (one queue per source); one
repository both requester and executor is a configuration of the same
model. With it: **portable execution**, triggered by data (where something
executes is which repository is active, not the code; a unit gives the same
result wherever it ran), and **near real time** (RPC as the signal,
"request `<name>` at commit `<id>`", replication as the record: what a unit
runs on and a rerun uses is always the replicated commit).

## A running repository: the mrepo framework

**Built**, the base (2026-11-10). A repository's own behaviour is the
framework's: `mrepo`, apart from `mycelium` (the data layer: values, URIs,
containers, git). Its API is a set of **protocols**, a module per protocol;
the base variant (`mrepo-base-*`) is a simple implementation, others later
shaped by configuration (timeouts, say) as new variants of the same
protocols.

| Protocol | Layer | It owns | Module |
|---|---|---|---|
| runtime | `/runtime` | the always-alive process; its data, the service state | `mrepo-base-runtime` (**built**) |
| request | `/request` | the inbox taken in, the queue, the moves between request layers, the answers | `mrepo-base-request` (**built**) |
| execute | `/execute` | a request executed in execution branches, its record, the merges back | `mrepo-base-execute` (**built**) |

- **The runtime** is always alive while the service is: it holds the store
  as its single writer, serves the local connection (`<work>/runtime.sock`,
  owner only: `status`, `stop`), runs one poller firing the protocols in
  turn, and may place requests itself
  (straight into `request/pending`: inside the root, nothing to validate).
  Once the service is shut down (booted, nothing waiting) it ends; an input
  posting a request starts it again (HAICC's does). Started through the
  shell, detached (`bare-subprocess` ends its own children when its process
  ends). No log of its own: a pass that fails puts its error in the request
  executing (below, "No log").
- **Protocols meet in data, never by calls**: each watches data states and
  writes the next; a restart picks up where the data stands.

| Data state | Who reacts | What it does |
|---|---|---|
| new envelopes in the `inbox` layer (its head moved; records in no request layer) | request | checked (below); the core, in a new envelope, in `request/pending/default`; or refused: the form completed with its error, in `request/done`, sent back |
| pending not empty, `request/execute` empty | request | the next core moved into `request/execute`, in a new envelope |
| a form in `request/execute`, not completed | execute | its execution branches made from their targets or brought up to them; checked again against the state now; its action run, reading a target overlaid by its execution branch, writing only execution branches (the visible state), inside the execution context (read-only to it; the runtime's context read through it, for config later); each branch merged back into its own target, `main` and `runtime` first; the form completed with its output (or the error that stopped it), merged into `request/execute` last |
| a completed form in `request/execute` | request | its core, in a new envelope, in `request/done`, then cleared from `request/execute` (a restart in between finishes the clearing); sent back: in the `outbox`, in an envelope, when the core names where it is to arrive; the next cycle |

- **The boot is a request too** (the human, 2026-11-10; **built**):
  `service boot /`, with the command as typed. The boot completes its form
  with what it did (or the error that stopped it) and hands it into
  `request/execute` as the execute protocol hands one (through
  `execute/request/execute`, merged back), before the runtime starts. The
  request protocol's first pass finds it completed, moves it to
  `request/done`, then starts the next pending request, the preloaded
  `initialise`: `request/done` begins boot, initialise. The boot prints its
  completed request, one record (no step by step output).
- **Checked twice, for what each moment can know**: at the inbox what does
  not change (not misdelivered: the envelope addressed to this repository's
  inbox, the form's `api` its type; its URI
  canonical; its protocol and action offered there, once the API is
  extracted); as it executes, the service state then (a request queued may
  change it first: a `start` queued behind the preloaded `initialise` is
  allowed in, and runs after it).
- **Simplified in the base**: the protocols run in the runtime's process
  and are handed its writer (agreed: a protocol signals the runtime, which
  writes; threads, each started with its protocol and context, later); one
  poller, no threads; the signals are the data states themselves.

### A repository's type is a package

**Built.** `haiccing/base-package-haicc` is the type `haicc`, requiring
`haiccing/base-package-mrepo` (the framework). Its API is data in the
package (`/api.json` in its bundle, from `haiccing/base-package-haicc/api.json`):
the URI types, the protocols and actions each offers. `boot` assembles the
repository (its layers, its packages, `/runtime/service.json` booted, of
type `haicc`) and preloads it with one request, `service initialise /`;
`initialise` extracts the API into `/runtime/api.json`. The framework never
imports a type's code: it reads its declaration. The base offers the
framework's generic actions only (`rest`: get, put, delete; `service`:
initialise, start, stop, shutdown); a type's own actions, mapped to its
package's functions and run as its configuration says, come later.

### The service state gates the API

**Built** (pause and resume agreed). booted: `initialise` (`teardown`,
agreed); initialised: `start`, `shutdown`; started: the type's API, `stop`
(`pause`, agreed); paused: `resume`, `stop`. The runtime takes `initialise`
and `start` in; `start` makes the type's API available.

## The external API

**Built** for the base (2026-11-10).

- **HAICC is a repository's API**: the host's repository is of type
  `haicc`, instance `host`; it is the host, the node bridgehead; a node's
  repository the same type. Every command is a request to its inbox, from
  any input: the terminal is one (`haicc-base-cli`), a node, a peer, the
  web others. **No command stays outside**: starting and stopping included,
  each passes through the inbox and is recorded.
- **A protocol gives an API's actions their meaning**, the same word for
  the same meaning in every context (the framework's protocols are the
  internal API's). The external API's first protocols, generic, to see how
  far they get us:
  - **`rest`**: `get`, `put` (at a URI the caller names: create or
    replace), `post` (to a collection, which names the item), `delete`. No
    update: a URI goes deep (into a JSON document, to one value: agreed),
    so a `put` at a deeper URI is the partial update. **The verbs are the
    transport between repositories** (agreed): an RPC server has a fixed
    set of messages, the verbs; a real request travels wrapped, the body of
    a `post` to an inbox.
  - **`service`**, the lifecycle of a service, four pairs, each the other's
    inverse: `boot` (brought into existence from a source; was the cold
    boot) and `teardown` (removed entirely); `initialise` (configuration and
    state set up, checked, ready to run; was the warm boot) and `shutdown`
    (undone, back to booted); `start` (its processes running) and `stop`
    (halted between requests, everything kept); `pause` (halted
    mid-request) and `resume`. And `run`: the whole cycle, boot to teardown
    (a test's run, a one-off execution). A thing without some of them
    offers only those it has, by its type.
- **A request is fully qualified**: `{ api, protocol, action, uri, body }`,
  and the command as typed, unparsed, beside it (`command`: the human,
  2026-11-10, easier to read; **built** for HAICC's terminal),
  as it travels and as it is recorded (an action unique today may not stay
  so; a recorded request keeps its meaning for an exact rerun). The URI
  names the object, its type decides what an action means there.
- **At the terminal**: `haicc [protocol] <action> <uri> [body]`; an action
  unique among the protocols may be given alone (`haicc put /main/x.json
  '{…}'`), expanded where it enters, an ambiguous one refused. The input
  reads it (the URI canonical, the body JSON), posts it, starts the runtime
  if it is not running, and prints the answer (exit 0 answered ok, 1
  refused or failed, 2 a bad call).
- **Every message is a Kafka record, and records are an onion** (**built**,
  2026-11-10): a pre-filled form in a pre-addressed envelope. The **core**
  record's `topic` is where the completed form is to arrive (the sender
  itself, `/haicc/terminal` for the terminal; none: nobody waits for it),
  its `value` the form: the request. The sender wraps it in an **envelope**
  whose `topic` is the destination (`/host/inbox`). Each hand-over replaces
  the envelope (its topic the new place: `/request/pending/default`,
  `/request/execute`, `/request/done`, `/outbox`); the core is never
  rewrapped or changed on the way. **Processing completes the form**: its
  value the request with its `output` (or the `error` that stopped it); the
  completed form goes back in an envelope, its core's topic saying where.
  What a terminal shows is the completed form, a record.
- **The key: a GUID** (the human, 2026-11-10; **built**), set by the sender
  on the core when it makes the request, carried by every envelope around
  it, and the name of its document in every
  layer: a request traced everywhere by one key.
- **Order is the commit chain** (the human, 2026-11-10; **built**): taking
  in follows the `inbox` layer's commits, the queue the `pending` layer's
  (first parent, from the layer's first commit; within one commit, by
  name): the order requests arrived in the repository, no sender's clock
  involved. One writer moving a branch only from the commit it started from
  (compare-and-swap) keeps each chain a line.
- **Headers left empty for now** (the human, 2026-11-10: their use to be
  planned carefully): JSON, namespaced, reachable by URI, for metadata
  (`vision.md`; their schemas with AVRO). So for now no record carries the
  execution's metadata (the states it ran on, the merges it made: in the
  commits).

## Roots, boundaries, mappings

**Agreed**; the host's part **built**.

- **A root is set by a validation boundary**: where data is validated, a URI
  space begins. All input on the host (the terminal, the web) is validated:
  the host is a root, its root the host's repository (`/inbox` its inbox).
  All data entering a swarm is validated: a swarm is a root, a node inside
  it (`p2p-rns`'s `/<swarm>/<node>/…`). Input from outside (no root of its
  own) enters the host's repository. **Open**: each context's root.
- **Every repository's inbox is a validation point**; inside a root, the
  happy path (the dispatcher matches prefixes, a request checked at the
  inbox is not checked again for what cannot change).
- **A crossing is a mapping**: from a root (none, for input from outside) to
  a root; the prefix translated; validation required or not, and of which
  type (full: the content; the envelope only; none: a trusted translation);
  a policy per direction, so traffic between host and swarm can be secured
  both ways. Host input: none → host, full. Where roots sit is then
  configuration. From outside, only `post /inbox` is allowed (the gate);
  inside, code writes any layer under the layer rules.
- **The naming scope and the trust root are two things**: the repository
  names its data (its own URIs); the root (host, swarm) is where it is
  validated. Host- and swarm-scoped URIs exist only for addressing (the
  dispatcher, the RNS); translating between roots is done mostly by
  repository referencing (the mappings).

## The boxes and the dispatcher

**Built** as layers (2026-11-10), the same on the p2p host and on native
git: `inbox` and `outbox`, non-atomic, a record a document (`<name>.json`),
nothing removed (housekeeping later).

- **Posting is a commit into `inbox`**: `post(message?)`
  (`mrepo-base-request`). Given a message, it adds it and commits (native
  git, no working tree: HAICC's input commits it itself; a commit lost to
  another writer, compare-and-swap, made again on the new head). Without
  one, it commits the inbox folder's new files: on the p2p host the folder
  `<work>/mrepos/<name>/inbox/` is the `inbox` layer's working tree, many
  inputs add files to it, the runtime commits them (the folder watched by
  its poller).
- **Taken in by commit**: the request protocol reacts to the `inbox` head
  moving, taking the records not yet in a request layer (every one taken in
  ends in `request/done`, a refused one too).
- **The completed forms are commits into `outbox`**, by the runtime (its
  single writer); until the dispatcher application (below), an input reads
  its own there by the request's name.
- Found: on the p2p host's disk side (p2p-git), a ref is written in place,
  not atomically, so a reader in another process (an input reading its
  answer while the runtime writes) may find a ref missing for a moment: it
  reads again. The runtime's own reads and writes are sequential.

**Agreed** (the human, 2026-11-10): **routing by subscription, through a
dispatcher.** Replaces the dispatcher inside the request protocol, the input
writing into a repository's inbox and reading its outbox (built for now).

- **Every party has an inbox and an outbox**: a repository, the terminal
  (a mini mrepo of its own: its boxes, its requests done), the dispatcher. A
  party writes only its own boxes.
- **Every connection is one subscription**: an inbox subscribing to one
  outbox, pulled by its owner (the new records copied in, its position kept:
  the commit it last took, as a Kafka consumer's offset). Every inbox has
  one writer, its owner.
- **The dispatcher is an application, like HAICC** (the human,
  2026-11-10): a repository type of its own (its package, its API declared
  as data) on the same framework, a level's. Its one inbox (on the
  filesystem) subscribes to every party's outbox; its outboxes are one per
  destination (each repository, the terminal, each peer's dispatcher). A
  record addressed to the dispatcher is a request to its API, processed by
  it (as HAICC processes its own); any other is routed: moved from its inbox
  to the outbox for the record's `to`. The one place where traffic is
  monitored and managed (a priority field ordering it, counts, holding
  back).
- **A stray record goes back to the dispatcher**: an application receiving
  a record addressed to another destination returns it to the dispatcher,
  as misdelivered, through the dispatcher's API (not answered as refused).
- **Each inbox subscribes to its outbox at the dispatcher**: a repository's
  to the dispatcher's outbox for it, the terminal's (its postbox) to the
  dispatcher's outbox for the terminal. **A local subscription is a file
  operation**: the boxes' folders are their layers' working trees, so the
  new files of the outbox followed are copied into one's inbox folder, then
  committed by its owner. **A remote subscription is another node**: a
  peer's dispatcher following ours for it, in one of two modes chosen by the
  receiver: **followed** (kept open and replicated live: Hypercore's notice
  of an append the signal; for regular partners) or **announced** (the
  sender signals the addressee only, by `p2p-request`, the outbox's key and
  length, the latest standing for a burst; the receiver fetches those blocks
  sparsely and checks them; for occasional senders).
- **A request's round trip**: the terminal's outbox, the dispatcher's
  inbox, the dispatcher's outbox for the repository, the repository's inbox;
  executed; its output record into the repository's outbox, the dispatcher's
  inbox, the dispatcher's outbox for the terminal, the terminal's inbox.
- **Routing reads the onion**: the dispatcher routes a record by its
  envelope's topic, and a completed form back by its core's topic.
- **What the terminal shows are records** (**built**): the completed form,
  the end of the execution. The tests show a request's journey (its input in
  `inbox`, its record in `request/done`, its output in `outbox`, one key
  throughout); the release check the requests done, in order.

## No log: a request is its own record

**Built** (the human, 2026-11-10; replaced a log layer and log folder, built
and then removed the same day: too complicated). What happened to a request
is in its document, and the documents done, in order, are the repository's
history:

- **`request/done` is the history**: each request completed, the refused
  ones too, in the order done (its commit chain), each move between request
  layers a commit. The boot's own request first, then `initialise`.
  Agreed: a visible topic (above, "One repository over two stores").
- **An error goes into the request it happened to**: an action failing, its
  form completed with the error; a record failing to be taken in, refused
  with it (`runtime: <message>`); a runtime's pass failing, the request
  executing completed with it (`runtime: <message>`), then done and sent
  back like any other. Only what has no request, or no repository, goes to
  stderr: a runtime that cannot start (the caller also says it did not
  start), an error failing to be recorded.
- **What a terminal shows** is the completed form, the end of execution;
  no step by step output.
- **Open**: a request's own history in its document (the events of its
  journey, in the envelope or the completed form), when step by step
  logging is wanted; the runtime's own events (started, stopped) dropped
  meanwhile (its status checked by signal).
- Watching is the same everywhere: on git, a branch head moving; on p2p,
  Hypercore's notice of an append.
- Nothing in a repository is callable from outside by default: its
  functionality (its packages) is exposed only through its API.

## Backup at the repository level

**Agreed.** A backup is the repository's own, knowing nothing of the store
beneath: by replication (a backup peer following its cores; restored by
replicating back) or by export (a git bundle at a commit; restored by
importing it). Backups happen at different levels for different purposes,
each by its own policy, and are **disjoint**: a backup covers its own
repositories only, never another level's. The service protocol's `teardown`
with checkpointing builds on it.

## The node's own repository

**Agreed.** Every level's config, state and events in its own repository,
the node's first: the manager writes what it decides (container, image,
address) there, the node reads its own data and knows no manager; the
manager and Splectral subscribe by replication, knowing no event kinds.
**Its history** (direction): its requests done, a topic the swarm can
centralise, held in the local repository by reference; state as git
objects.

## Open

- The request manager: one manager and queue per source, where the requests
  are generated.
- Each context's root (the host's, a swarm's, a node's).
- `request/done` as a topic: its replication and the reference's commits.
- A type's own actions: how its package maps them to its functions, and the
  configuration that shapes their execution.
