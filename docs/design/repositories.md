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
made; `request/done` and logs as visible, non-atomic topics (each appended
by its own writer, held in the repository by reference: `values.md`, "A
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
| `request/done` | each finished request with its full record (below) | non-atomic (agreed: visible, as a topic) |
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
shaped by configuration (log level, timeouts) as new variants of the same
protocols.

| Protocol | Layer | It owns | Module |
|---|---|---|---|
| runtime | `/runtime` | the always-alive process; its data, the service state | `mrepo-base-runtime` (**built**) |
| request | `/request` | the inbox taken in, the queue, the moves between request layers, the answers | `mrepo-base-request` (**built**) |
| execute | `/execute` | a request executed in execution branches, its record, the merges back | `mrepo-base-execute` (**built**) |
| log | `/log` | records appended by one writer, a topic held by reference | `mrepo-base-log` (agreed) |

- **The runtime** is always alive while the service is: it holds the store
  as its single writer, serves the local connection (`<work>/runtime.sock`,
  owner only: `status`, `stop`), runs one poller firing the protocols in
  turn, logs to `<work>/log/runtime.log`, and may place requests itself
  (straight into `request/pending`: inside the root, nothing to validate).
  Once the service is shut down (booted, nothing waiting) it ends; an input
  posting a request starts it again (HAICC's does). Started through the
  shell, detached (`bare-subprocess` ends its own children when its process
  ends).
- **Protocols meet in data, never by calls**: each watches data states and
  writes the next; a restart picks up where the data stands.

| Data state | Who reacts | What it does |
|---|---|---|
| new records in the `inbox` layer (its head moved; records in no request layer, not answered) | request | checked (below); a request in `request/pending/default`, or refused and answered |
| pending not empty, `request/execute` empty | request | the next request moved into `request/execute` |
| a request in `request/execute`, not completed | execute | its execution branches made from their targets or brought up to them; checked again against the state now; its action run, reading a target overlaid by its execution branch, writing only execution branches; its record written into `execute/request/execute` (the states it ran on, its result, the merges it made); each branch merged back into its own target, `main` and `runtime` first, `request/execute` last (completing it) |
| a completed request in `request/execute` | request | copied into `request/done`, then cleared from `request/execute` (a restart in between finishes the clearing); answered into the `outbox` layer; the next cycle |

- **Checked twice, for what each moment can know**: at the inbox what does
  not change (not misdelivered: its `api` this repository's type; its URI
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
  as it travels and as it is recorded (an action unique today may not stay
  so; a recorded request keeps its meaning for an exact rerun). The URI
  names the object, its type decides what an action means there.
- **At the terminal**: `haicc [protocol] <action> <uri> [body]`; an action
  unique among the protocols may be given alone (`haicc put /main/x.json
  '{…}'`), expanded where it enters, an ambiguous one refused. The input
  reads it (the URI canonical, the body JSON), posts it, starts the runtime
  if it is not running, and prints the answer (exit 0 answered ok, 1
  refused or failed, 2 a bad call).
- **Every message is a Kafka record**: the record is the dispatch wrapper.
  `topic` the URI where it lives, rewritten as it moves (`/inbox`,
  `/request/pending/default`, `/request/execute`, `/request/done`): a
  record is fully qualified in its context; `value` the message or request,
  unchanged as it travels; `headers` JSON, namespaced (`mrepo` the
  framework's: `from`, `to`, `execute`), reachable by URI, for any metadata
  (`vision.md`; their schemas with AVRO); `timestamp`. A record keeps its
  name through its moves; an answer names it. Agreed, not in the base:
  `key`, a URI (where it first entered, `/inbox/<name>`).

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
  moving, taking the records not yet in a request layer nor answered.
- **Answers are commits into `outbox`**, by the runtime (its single
  writer); an input reads its answer there by the request's name.
- **The local dispatcher** posts an `outbox` record addressed to `/inbox`
  into the inbox (once, under the same name), leaves one addressed to the
  outside (`to` null) for its input, and holds any other.
- Found: on the p2p host's disk side (p2p-git), a ref is written in place,
  not atomically, so a reader in another process (an input reading its
  answer while the runtime writes) may find a ref missing for a moment: it
  reads again. The runtime's own reads and writes are sequential.

**Agreed** (the human, 2026-11-10): **routing by subscription, through a
dispatcher.** Replaces the dispatcher inside the request protocol, the input
writing into a repository's inbox and reading its outbox (built for now).

- **Every party has an inbox and an outbox**: a repository, the terminal
  (a mini mrepo of its own: its boxes, its local log), the dispatcher. A
  party writes only its own boxes.
- **Every connection is one subscription**: an inbox subscribing to one
  outbox, pulled by its owner (the new records copied in, its position kept:
  the commit it last took, as a Kafka consumer's offset). Every inbox has
  one writer, its owner.
- **The dispatcher** (a level's): its one inbox (on the filesystem)
  subscribes to every party's outbox; its outboxes are one per destination
  (each repository, the terminal, each peer's dispatcher); routing is moving
  each record from its inbox to the outbox for the record's `to`. The one
  place where traffic is monitored and managed (a priority field ordering
  it, counts, holding back).
- **Each inbox subscribes to its outbox at the dispatcher**: a repository's
  to the dispatcher's outbox for it, the terminal's (its postbox) to the
  dispatcher's outbox for the terminal; a peer's dispatcher to ours for it
  (by replication or a topic, `p2p-request` announcing).
- **A request's round trip**: the terminal's outbox, the dispatcher's
  inbox, the dispatcher's outbox for the repository, the repository's inbox;
  executed; its output record into the repository's outbox, the dispatcher's
  inbox, the dispatcher's outbox for the terminal, the terminal's inbox.
- **Processing makes an output record from an input record** (the human,
  2026-11-10): the input record never changes (its value the message as
  sent, incomplete: a request); the output record is a new record, its value
  the payload completed (the request and its output, later more), its
  headers `from` this repository, `to` the input's sender (flipped), `re`
  the input record. Both kept in `request/done`; the output into the
  outbox. (Built for now: the result in the input record's headers, the
  answer its own record in the outbox.)
- **What the terminal shows are records**: requests, outputs and log
  events as Kafka records.
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
**Logs** (direction): individual topics (records appended, not a commit per
line), which the swarm can centralise, held in the local repository by
reference; state as git objects.

## Open

- The request manager: one manager and queue per source, where the requests
  are generated.
- Each context's root (the host's, a swarm's, a node's).
- `request/done` as a topic: its replication and the reference's commits.
- A type's own actions: how its package maps them to its functions, and the
  configuration that shapes their execution.
