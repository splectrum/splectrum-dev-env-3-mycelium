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
Hypercore has one writer per core, so a repository on a Hyperdrive has one
writer, and the branch model follows the writers: **each branch is written by
exactly one party**, in a store of its own. What looks like one repository is
a composition of layers from several writers (`rules.md`, Layers: disjoint,
never merged into each other, only referenced; local, imported or virtual).
Nothing is merged across writers; each side moves only its own branches.

### Passive and active repositories

**Agreed.**

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

**Agreed.** `pending/default` (today: the requests and their notes, the
record of all requests) is restructured into `request/pending` (the passive
side's, append-only: the requests as submitted), `request/executing` and
`request/done` (the active side's). The reserved segment `pending` becomes
`request`; the notes and metadata go to the side that writes them. `rules.md`
is changed when it is built.

### The packages layer

**Agreed** (the human, 2026-11-09; changed from a layer of links, decided
2026-11-08, once packages became bundles: `structure.md`). `packages/<purpose>`,
in place of `capability/<purpose>`, is the code store: it holds the bundles
themselves as objects (`packages/<purpose>/<package>/<entry>.bundle`). A
bundle is a blob, its id its content's hash: the same bundle in many
repositories is one object, replication moves only what a peer lacks, and
the check is the object id (with the hash in the release's manifest).
`packages/default` operates the repository's own functionality,
`packages/test` is where development deploys and tests; promotion (test to
default) and rollback are commits. Mycelium browses a bundle's contents by
URI, as if extracted (`values.md`, "URIs name a logical structure":
`/packages/default/haicc/haicc.bundle/app/page.html`); an execution scope
gets a bundle as a file, a plain copy out of the layer, since Bare runs a
bundle from its file. Releases outside git history stay where the outside
world meets us (GitHub's haiccing releases, built by local). The reserved
segment `capability` becomes `packages`; `rules.md` is changed when it is
built.

### Open

- How a composed repository names another writer's layer (by key, by URI),
  and whether a layer is pinned to a commit or follows the latest.
- Where the request manager runs (proposed: in the active repository, over
  the request layers it subscribes to).
- Whether any branch needs several writers (Autobase), or one writer per
  branch is enough (proposed: one writer per branch to start).

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

**Agreed.** On the connection replication already uses (`values.md`): the
passive side commits its request and sends "request `<name>` at commit
`<id>`"; the active side fetches exactly those objects at once, executes, and
answers "response at `main` commit `<id>`". No polling, no reader having to
notice. A small request may travel in the RPC message, so the work starts
before replication completes; but the unit runs only on what is in the
replica: what is recorded, and what a rerun uses, is always the replicated
commit.

## The node's own repository

**Agreed.** Every level's config, state and events in its own repository,
the node's first: the manager writes what it decides (container, image,
address) there, the node reads its own data and knows no manager; the
manager and Splectral subscribe by replication, knowing no event kinds (in
place of today's shadow on stdin and the manager knowing the node's event
kinds). Logs as topics (records appended) rather than a commit per line:
**open**, with state as git objects.
