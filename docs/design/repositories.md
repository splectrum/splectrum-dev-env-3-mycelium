# Mycelium repositories: the truth, views, branches, execution

Status marks: **built** (in the code, tested), **agreed** (decided, not
built), **open** (to settle). Decided with the human, 2026-11-08 (phase 3,
step 1's review); to be built in step 3, step by step.

## The repository is the truth; a working tree is a view

**Agreed.** Our code reads and writes repositories through mycelium (the
backend contract: `select`, `read`, a writer's change, commits), by path from
the branch root; it never needs files. A working tree is a view, made only at
the boundary, for what cannot go through mycelium: a person, Bare loading
code, Docker's mounts, the browser. Inside, repositories only.

- **Reading**: a view shows a layer at a commit; extracted by mycelium
  (`extract`), incrementally (by tree differences: unchanged subtrees share
  their ids), atomically where readers must not see half a commit (written
  aside, then renamed); later a read-only, lazy mount. The view records the
  commit it shows, in plain sight.
- **Writing**: only as commits (a writer's change, or a folder deployed as a
  layer), never by editing a view in place; the views follow.
- **Sync**: replication moves the repository; each view is refreshed from
  the new commit by its owner. Nobody syncs folders: a `.git` folder synced
  file by file is not atomic (a ref can arrive before its objects), the
  working tree does not follow (the index and the files stay behind), and
  hooks and config would come along (code that runs).

*Why*: the code needs no working tree; one truth, its views derived and
refreshed, never edited, so a view can always be made again.

## Storage on the p2p layer

**Built** (as phase 2 left it). A repository on the p2p layer is a
Hyperdrive holding the git directory (p2p-git's: loose objects, refs), in its
Corestore, persisted by `hypercore-storage` in RocksDB: on disk, durable,
replicable, but not as readable files; reached only through Hypercore's API
and mycelium's backend on it. A git directory on disk would need a mirror (a
second copy of every object) or a FUSE mount; neither is needed, since the
code reads the repository and views are extracted.

## The git engine is handed in by the storage's owner

**Agreed.** `mycelium-git` holds the contract, the iso-style adapter (any
engine with isomorphic-git's API, given as a parameter) and the native
backend; it imports no engine. The owner of a storage kind chooses its engine
once, when it makes a repository's backend: `p2p-mrepo` for a Hyperdrive
(p2p-git, the only engine that writes there), whatever opens repositories on
disk (native git). Everything above works on backends. *Why*: mycelium knows
no p2p; the engine follows the storage, not the package.

## The branch model: one writer per branch

**Agreed** (the starting point; crucial to make portable execution work).
**One writer per branch, full stop** (the human, 2026-11-09): no
multi-writer layer (Autobase); a multi-writer of our own, tied in with git
merge, may come later, not a concern now. Hypercore has one writer per core, so a repository on a Hyperdrive has one
writer, and the branch model follows the writers: **each branch is written by
exactly one party**, in a store of its own. What looks like one repository is
a composition of layers from several writers (`rules.md`, Layers: disjoint,
never merged into each other, only referenced; local, imported or virtual).
Nothing is merged across writers; each side moves only its own branches.

### Passive and active repositories

**Direction, not an initial concern** (the human, 2026-11-09: it needs a
design of its own, later; not part of the repository implementation now).
The sketch, kept as the starting point for that design:

| | the passive repository (requester) | the active repository (executor) |
|---|---|---|
| writes | `request/pending` only | `request/executing`, `request/done`, `execute/main`, `main` |
| reads, by replication, as read-only layers | the active one's `main`, `request/executing`, `request/done` | the passive one's `request/pending` |

The flow: a request committed to `request/pending`; replicated, an imported
layer on the active side; taken (recorded on `request/executing`: its name,
the pending commit it was taken at); executed as a unit on `execute/main`,
the request layer's commit among the unit's fixed states (so it reruns
exactly); merged into `main`; closed on `request/done` (its outcome, the
`main` commit with its response, or why there is none); replicated back, the
passive side's composed view showing it. A request's state is read by
composing the branches; nothing moves from one writer to another.

- **Several requesters are several request layers**, one per writer: the
  request manager's sources (a source being a layer of another repository).
- **One repository both requester and executor** (active for its own
  requests) is a configuration of the same model.

### The request branches

**Agreed** (the human, 2026-11-08 and 09). `pending/default` (today: the
requests and their notes, the record of all requests) is restructured, data
and metadata kept apart:

| Branch | Holds |
|---|---|
| `request/pending/default` | the local queue: requests waiting (one queue per source: `request/pending/<source>`, `default` the local one; no branch `request/pending` itself, a name never both a branch and a prefix) |
| `request/executing` | the request being executed, with its metadata gathered as it runs: the unit's record (invocation, the states it ran on by commit, environment, nondeterministic inputs), its outcome, the `execute/main` commit it produced; cleared when it ends |
| `request/done` | each completed request with its full record: the request as submitted, the unit's record (rerun exactly by it), its outcome (a failure included), the `execute/main` commit and its merge into `main` |
| `execute/main` | only the visible change to `main`: the data the request produced; merged plainly into `main` |

`main` and `execute/main` hold data only; the request branches hold the
requests and the metadata around producing the visible state (`rules.md`:
outcomes are data on `main`). Today's `executeRequests` writes the unit's
record into `main` beside the response: changed when rebuilt. In one
repository with one writer, taking a request is a commit moving it from the
queue to `request/executing`, finishing one moving it with its record to
`request/done`. The passive and active split of these branches comes with
that design, later. The reserved segment `pending` becomes `request`;
`rules.md` (its branches and commit references) is changed when it is
built.

### The packages layer

**Agreed** (the human, 2026-11-09; changed twice: from a layer of links,
decided 2026-11-08, once packages became bundles; then from
`packages/<purpose>` to one layer). `packages`, a layer of its own like
`main`, in place of `capability/<purpose>`, is the code store: it holds the
bundles themselves as objects, by `[org]/[package]`
(`/packages/haiccing/base-package-haicc.bundle`), their native addons by
hash (`/packages/addons/<sha256>`) and the pinned manifest
(`/packages/manifest.json`): laid out as a source, so a repository's
packages layer is itself a source for others. A bundle is a blob, its id
its content's hash: the same bundle in many repositories is one object,
replication moves only what a peer lacks. Mycelium browses a bundle's
contents by URI, as if extracted (`values.md`); a level runs a bundle from
its view (`structure.md`). Releases outside git history stay where the
outside world meets us (GitHub's haiccing releases, built by local).

**No purposes in the layer, no test organisations**: a level's packages
layer holds what that level runs. Testing is **a separate instance** (a
test HAICC platform, its own repository), composing what it needs by
reference (`rules.md`, Layers): its packages a mix of production and
development builds, by **a custom manifest** listing them (production
entries exactly as the publisher's, the same id and hash; development
builds beside them), marked `mixed` (`packages.md`: validated and mixed),
signed by a development key that only a level set up for testing accepts
(its `boot.json`); its sources may include a production level's packages
layer. Every bundle still checked by its hash: mixing changes who vouches
for the list, not how bundles are checked. Promotion: a tested build
published under its organisation, through the release path.

### Naming another writer's layer: pinned, then resolved by URI

**Agreed** (the human, 2026-11-09). Another writer's layer is named by URI
(the most powerful form). Pinning comes first and stays fixed: the reading
repository's commit is fixed before anything is resolved; a URI is then
resolved through the mappings as they are at that commit (which repository,
which layer, a URI points to: part of the repository's own state, the
resource name service resolving names on the swarm). Mappings may change
across commits, only by new commits; at a pinned commit every URI means one
thing, so a pinned commit fully determines what its URIs refer to, and a
read or a unit is reproducible from it. (`mycelium-xpath` already reads
below a branch in one commit's tree; `pinned(backend, state)` fixes
branches to commits.)

### Open

- The request manager (the human, 2026-11-09): it runs where the requests
  are generated, one manager (and queue) per source; settled with the
  repository implementation.

## Portable execution, triggered by data

**Agreed** (the direction the structure must allow; the triggering itself is
out of phase 3's scope: "triggers and internal processing requests" are not
in this phase). With every level set up the same way (`structure.md`),
execution is portable; with self-contained repositories, it is triggered by
data: code executing puts a request into a repository; an active repository
(an executor attached) runs it as a unit and writes the response; a passive
one syncs to an active one, the execution happens there, the result syncs
back. Where something executes is a matter of which repository is active,
not of the code; a unit gives the same result wherever it ran.

## Near real time: RPC as the signal, replication as the record

**Direction**, with passive and active repositories (their own design, later). On the connection replication already uses (`values.md`): the
passive side commits its request and sends "request `<name>` at commit
`<id>`"; the active side fetches exactly those objects at once, executes, and
answers "response at `main` commit `<id>`". No polling, no reader having to
notice. A small request may travel in the RPC message, so the work starts
before replication completes; but the unit runs only on what is in the
replica: what is recorded, and what a rerun uses, is always the replicated
commit.

## A running repository: mycelium's framework

**Agreed** (the human, 2026-11-09). A repository's own behaviour is
mycelium's, not HAICC's: HAICC sets a level up (`init`) and starts it; the
package manager puts bundles in its packages layer.

- **An always-on process per repository**, the repository's main thread:
  `mycelium-repo-main` (the human; module and process names are one
  namespace, git layers another): it holds the store as its single writer, keeps the required
  watchers running (the local queue, the sources it follows, replication),
  serves the local connection (short-lived and long-lived readers,
  submits), and restarts what stops.
- **Submit** (`mycelium-request-submit`): a request placed in the queue
  (`request/pending/<source>`) by the repository's own code, from a message
  taken in from its inbox and validated there (below); the queue inside the
  boundary.
- **Execute** (`mycelium-request-execute`): the queue watched; a request
  taken (`request/executing`); the command it contains launched as a unit,
  the repository's state pinned; the command writes the data it changes into
  the execute layer (`execute/main`); on completion the framework commits,
  merges into `main`, and moves the request with its record to
  `request/done` (the command as launched, the states it ran on, its exit
  code and output, the environment); then the next request. One at a time,
  in queue order: each starts from the `main` the previous left.
- **The first bundles**: `packages` starts with `haiccing/base-package-boot`
  and `haiccing/base-package-haicc`, committed at `init`.

## Layers by their writes: atomic or not, visible or local

**Agreed** (the human, 2026-11-09). A layer's kind says how it is written,
so its storage follows from its name; an extension layer declares both
when it is made.

| | atomic (one commit) | not atomic (records, each whole) |
|---|---|---|
| **visible** (replicated) | `main`, `packages`: in the store (Corestore), committed by the main thread only | `request/done`, logs: topics, each appended by its own writer, held by reference |
| **local** | (none yet) | `execute/*`, `request/pending/*`, `request/executing`, the local inbox and outbox: on disk (native git, plain folders) |

- **Only atomic layers go through the main thread**; it moves a result in
  (`transfer`: the same object ids, nothing copied twice) and merges it.
- **The disk layers take parallel writers** (threads, processes), one per
  branch: objects content-addressed and renamed into place, a ref moved
  under its own lock only from the commit expected, a message written under
  a temporary name and renamed.
- *Why*: git gives the consistency, our use needs no indexes; RocksDB (and
  the single writer it brings) only where replication needs it.

## How repositories communicate: inbox, outbox, dispatcher

**Agreed** (the human, 2026-11-09; the details at implementation).
Nothing in a repository is callable from outside by default: its
functionality (the bundles in `packages/`) is not exposed.

- **Each repository has an inbox and an outbox**, two topics outside the
  repository's boundary (inside the swarm). One writer per core, without
  exception: the outbox is written by its repository (what it sends), the
  inbox by the dispatcher (what was sent to it).
- **A dispatcher** reads the outboxes and appends each message to the inbox
  of the repository it is addressed to: it routes, it does not process.
- **Each repository watches its boxes**: from its inbox, each message is
  validated where it crosses into the repository, then processed by the
  repository's own code (which may place a request in its queue: the queue
  is fed from inside only); on its outbox, it follows what it sent.
- **A root is set by a validation boundary** (the human, 2026-11-09;
  replaces validation at both edges): where data is validated, a URI space
  begins. All input on the host (the terminal, the web) is validated, so
  the host is a root; all data entering a swarm is validated, so the swarm
  is a root (a node inside it, `p2p-rns`'s `/<swarm>/<node>/…`). Input from
  outside (no root of its own) enters the host's repository: validated
  there once, and translated into the host's URIs. Inside a root, the
  happy path: the dispatcher matches prefixes, a repository takes a
  message unchecked. Between roots (host and swarm), traffic crosses a
  boundary both ways: validated, translated, and where a security policy
  goes, in each direction.
- **Everyone the same way**: the owner's terminal (`haicc request add`)
  posts a message, through the dispatcher, to the repository's inbox, as
  any sender does.
- **An external API** (later, opt-in): mounted in a repository as data
  (pinned, versioned), declaring which commands are accepted, with their
  arguments, from whom (capability URIs mapped to commands: `rules.md`,
  Layers, deferred to that level); a policy over the inbox.
- **The boxes, placed** (the human, 2026-11-09; supersedes the two topics
  per repository above): a repository has a **file inbox** only; a node has
  a **file outbox**, written directly by its repositories (each message
  under a temporary name, then renamed), copied by the node into its
  **outbox topic**, and an **inbox topic**, written by the node with what
  it takes from other nodes' outbox topics. The node's **local
  dispatcher** delivers from its inbox topic into the addressed
  repository's file inbox. One core per node crosses the network; a
  repository never handles a topic.
- **Two modes between nodes**, chosen by the receiver: **followed** (the
  sender's outbox topic kept open and replicated live: Hypercore's own
  notice of an append is the signal; for regular partners) and
  **announced** (the sender signals the addressee only, by `p2p-request`,
  the outbox's key and length, the latest length standing for a burst; the
  receiver fetches those blocks sparsely and checks them; for occasional
  senders). Both land in the receiver's inbox topic.
- **Posting is `PUT <inbox URI> {message}`** (the human, 2026-11-09). The
  host's root is the HAICC repository (the level's), so its inbox is
  `/inbox`; from outside a root, through its mapping, only `PUT /inbox` is
  allowed (the gate); inside, code writes any layer under the layer rules.
  **Built**, for now as folders in the view, no layer kind: `/inbox` at
  `<work>/haicc/inbox/`, `/outbox` at `<work>/haicc/outbox/` (`{ to, body }`,
  PUT by the dispatcher); more advanced implementations later.
- **The boxes are a level's** (the human, 2026-11-09): the host (the first
  level) as any swarm or node; "node" above stands for any level. Each
  level has its own root; a URI is read in its level's URI space, its
  dispatcher matching its own root by prefix (local: a repository's file
  inbox) and sending anything else out. Translating between roots is done
  mostly by repository referencing (the mappings). **Open**: each
  context's root (the host's differs from a swarm node's, `p2p-rns`'s
  `/<swarm>/<node>/…`).
- **A crossing is a mapping** (the human, 2026-11-09): from a root (none,
  for input from outside) to a root; the prefix translated; validation
  required or not, and its type (full: the content; the envelope only;
  none: a trusted translation); a policy per direction. Host input: none →
  host, full. Where roots sit is then configuration, not design.
- **A repository's URIs are its own** (the human, 2026-11-09): stored data
  names by repository-scoped URIs (`/main/x/y`), never by a swarm's or a
  host's; a mapping at the repository's boundary translates (inside a root,
  validation none). The naming scope (the repository) and the trust root
  (the validation boundary: host, swarm) are two things. *Why*: a
  repository moves, is restored and replicated across roots unchanged, and a
  recorded unit reruns exactly wherever it is; host- and swarm-scoped URIs
  exist only for addressing (the dispatcher, the RNS).
- At implementation: the addressee by URI, resolved by the resource name
  service; a message as a Kafka record (its value the message; headers:
  from, to, a correlation id).

## Backup at the repository level

**Agreed** (the human, 2026-11-09). With every level's state in mycelium
repositories, a backup is the repository's own, in its own terms, knowing
nothing of the store beneath (Corestore, RocksDB):

- **by replication**: a backup peer follows the repository's cores in full:
  a live, verified copy; restored by replicating back;
- **by export**: the repository as a git bundle (`mycelium-layer`'s export;
  `vision.md`: bundles the transport between repositories outside
  replication, self-contained, immutable, verifiable): a checkpoint at a
  commit; restored by importing it. (A git bundle, not Bare's code bundle.)

Backups may happen at different levels, for different purposes (a node's
state, a swarm's, the host's install), each by its own policy; the
important point is that they are **disjoint** (the human): a backup covers
its own repositories only, never another level's, so each can be taken and
restored on its own. The roadmap's teardown with checkpointing and backup
builds on it.

## The node's own repository

**Agreed.** Every level's config, state and events in its own repository,
the node's first: the manager writes what it decides (container, image,
address) there, the node reads its own data and knows no manager; the
manager and Splectral subscribe by replication, knowing no event kinds (in
place of today's shadow on stdin and the manager knowing the node's event
kinds). **Logs** (direction, the human, 2026-11-09; the design in detail
when the implementation starts): individual topics (records appended, not a
commit per line), which the swarm can centralise, and which are added to
the local mycelium repository as well; state as git objects.
