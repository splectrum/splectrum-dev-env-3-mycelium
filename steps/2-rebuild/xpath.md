# XPath: a query as a pipeline of haicc segments and merges

In discussion with the human, started 2026-11-14. A design: nothing of
it is built. It grows as the discussion goes; what is built leaves this
file and becomes a part in `readme.md`.

Read as a task in `tasks.md` is read: **Settled** is what the human said
or confirmed; **Proposed** is ours, put to the human and not yet
answered; **To settle** is open. The syntax in the examples is
illustration only: none of it is decided.

## The picture

**Settled** (the human)

- "Our current model in main is a local data structure that may have
  remote repositories linked in various places." Where a shortcut to
  remote mrepos exists there are several layers, which XPath has to
  process, and whose results have to be merged.
- "We now have the haicc command that makes these uri segment hops up to
  the shortcuts clear", and then the parallel XPath result sets that
  need merging.
- **Two scenarios**, not one (the human's correction of our first
  example):
  - **juxtaposed**: the local structure and a linked mrepo side by side,
    each its own stretch of the URI. `crud/read host/swarms/*`: local up
    to `host`, the linked mrepo's data after it;
  - **stacked**: several layers at one position, one placed on top of
    another (several sources at a node, local data beside them: the
    overlays of `vision.md`).

## The segmentation is haicc's

The human's question: use `haicc` for the segmentation, or build a
parallel segmentation in the XPath library? Our answer: `haicc`. The
human built on it, below.

**Settled** (the human)

- **A query that comes in is rewritten** into a pipeline of `haicc`
  segments and merge operations. "Since the end result of xpath is a
  node set it is pure haicc as selecting commands and node set merging."
- **No cascading**: "the linked mrepo returns nodesets that are already
  merged as far as other linked mrepos is concerned within its data." A
  caller merges one level only: what it fanned out itself.

**Ours** (said in the discussion, not objected to)

- Why `haicc`: one cut in one place (it already cuts a URI at a
  shortcut, sends the rest on and makes the prefix from the jumps); the
  library stays inside one mrepo; each mrepo answers for its own data,
  with its own shortcuts and its own gate, nothing read behind its back.
- **The rewrite is made per mrepo**, as the query arrives there: where
  the shortcuts are is data, and a linked mrepo's own are not visible
  from outside. Each rewrites the part it sees and hands the rest on.
  The plan unfolds hop by hop; "no cascading" is the same seen from the
  answers.
- **The library reports, it does not refuse**: evaluating one segment in
  one mrepo, where it meets a shortcut it stops and says which shortcut
  and what is left of the query (today: an error naming the `haicc`
  chain to type).
- **The plan has three kinds of step**: select (one segment, inside one
  mrepo), filter (a node set made smaller), merge (node sets combined).
  An action never sees a shortcut.
- **In the request layer**, on the way in: then every protocol gets
  selections across links, not only `crud`.
- **The first small case of the pipeline engine** (`vision.md`,
  "Pipelines": each step a request, the rewrite where a plan is made).
  Build only what this needs, a fan-out of child requests and a merge at
  the end, shaped so the engine can take it over.

An example, at the boot mrepo, `host` and `host-2` shortcuts, `notes` an
ordinary node:

```
crud/read */swarms/*

1. select *            -> host, host-2 (shortcuts), notes (ordinary)
2. haicc host   crud/read swarms/*
   haicc host-2 crud/read swarms/*
   local:       crud/read notes/swarms/*
3. merge, juxtaposed   -> one node set, each part under its prefix
```

## The operations

**Settled** (the human)

- "The aim is full coverage, but in steps."
- **No parent step (`..`)**: "we don't need it as ours is forward
  looking only."
- **Full coverage is of what looks forward** (our reading, confirmed:
  "yes"): everything of XPath that looks forward (children,
  descendants, filters, set operations), nothing that looks back or up
  (the parent, the ancestors, the siblings before a node).

- **The order of a node set**: "there is system order - whichever way
  it comes out - or a set order." Our reading, to confirm: by default a
  set comes in the system's order, nothing promised about it; an order
  can be set on it (asked for in the query: a sort). What depends on
  order (a selection by position, the siblings after a node) works on
  the order the set has, and is repeatable only on a set order.
- **XPath's functions**: "if we can do it efficiently, yes functions
  please."

**Proposed** (ours: the list shown to the human, the points not
answered one by one). "Attribute" read as a field of the node's
document.

| Kind | Operation | Example | Where it runs |
|---|---|---|---|
| Step | a child by name, `*` | `swarms/*` | inside one mrepo |
| Step | descendants at any depth | `**/node-1` | inside one mrepo; the same rest handed on at each shortcut |
| Filter | on the name | `users[name=s*]` | where the node lives |
| Filter | on the document: a field equals, compares, exists | `swarms/*[size>2]` | where the node lives |
| Filter | on what the node is: a shortcut, has children | `*[shortcut]` | where the node lives |
| Filter | with a path inside | `swarms/*[nodes/*/state=started]` | a sub-query: a small pipeline of its own, may cross a link |
| Filter | and, or, not | `[size>2 and name=s*]` | with its parts |
| Set | merge, juxtaposed or stacked | | at the mrepo that fanned out |
| Set | the union of two queries | `a/* \| b/*` | a merge of two pipelines |

- **Juxtaposed, a filter can be pushed down**: each mrepo filters its own
  nodes before it answers, less data travels. **Stacked, it runs after
  the merge**: the layer on top may change the document the filter
  reads.
- At the end of the same pipeline, outside XPath proper: what comes back
  of each node (the node, its URI only, one field) and aggregates (a
  count).

**To settle**, against full coverage:

- Which XPath the forward part is taken from (its version); which of
  its functions (on strings, numbers, node sets), and what efficient
  asks of each: one that reads a node's own name and document runs
  where the node lives, as a filter does; one over the whole set (a
  count, a position, the last) runs after the merge.
- How an order is set: in the query, and by whom it is applied (after
  the merge, by the mrepo that fanned out; a linked mrepo's own order is
  lost in a merge unless the merge keeps it).

## The steps

**Settled** (the human, after the measurements of the commits)

- "I think we should do a good first implementation and measure its
  performance to see if we should go single or multiple requests
  (processing duration vs request and commit overhead)." Our reading, to
  confirm: the first implementation evaluates a query inside one mrepo
  in one request; it is measured (what the selecting and filtering
  takes, against what a request and its commits cost: about 44 ms a
  request's cycle and 7 to 9 ms a commit here); from the figures it is
  decided whether a query is cut into several requests inside one
  mrepo. Across a link a hop is a request either way.

**Proposed** (ours, not yet put to the human; written before the line
above: the cut into requests inside one mrepo now waits for the
figures). Each as a feature is
built now: a demo with the `haicc` tool first, then the real thing, the
demo kept as its how-to.

1. **The cut**: a plain URI through one shortcut rewritten to its
   `haicc` hop; one node set comes back under its prefix. No merge yet.
2. **The fan-out and the juxtaposed merge**: `*` meeting several
   shortcuts; a child request each, their answers merged. With it what
   task 1 left (`tasks.md`): `resolve` giving an array of positions, the
   jumps as segments, the prefix on an answer.
3. **Filters on the name and on the document**, pushed down.
4. **Descendants.**
5. **Stacked layers**: several sources at a node and local data; the
   merge that places one on another; filters after it.
6. **Filters with a path inside, the union**; then position, what comes
   back, aggregates.

## Parallel execution: threads

Raised by the human with the XPath pipeline, 2026-11-14; it reaches
beyond XPath, into the runtime and the request layer.

**Settled** (the human)

- "For corestore, single is for write, read can be parallel."
- "If we cut xpath in haicc segments and this is read only, then having
  multiple threads processing on input is very beneficial."
- "Furthermore all our requests can go multithreaded. What needs a
  single thread is the request train and commit to main."
- **No dirty reads**: "We fix read to a commit that has happened
  already." So whether a reader that stays open sees what is written
  after it opened is "not an issue".

- **Two requests that wrote the same path, run at once**: "Yes, the
  later one is run again on the new state - initial implementation."
  (Our proposal with it: different paths merge; the train's order says
  which is first. Read-only requests have nothing to settle.)

**Found** (tried here, 2026-11-14: Bare v1.36.0, four cores, a shared
machine; Corestore 7.16.1, Hypercore 11.39.6, rocksdb-native 3.19.3)

- **Bare runs threads in parallel**: `Bare.Thread`, in Bare itself, a
  JavaScript entry on an OS thread of its own. Four runs of a loop:
  2107 ms one after another, 859 ms a thread each. A thread has its own
  heap: nothing shared but what is passed (its `data`, a message over
  `bare-channel`, a shared buffer).
- **A thread does not load its modules from disk**: its module graph is
  bundled ahead (`bare-thread`, `Thread.prepare`; in `node_modules/`
  already, with `bare-channel`, brought by `brittle` and `bare-fs`), and
  the bundler follows only a `require` written as a plain string. Our
  packages are bundles already.
- **Threads and processes perform alike** (the human's question; three
  runs each, the spread between runs larger than the gap). Starting: 20
  empty processes 660 ms, 20 empty threads 648 ms, started together. A
  plain loop, 2 at once: processes 1021 to 1188 ms, threads 1015 to
  1164; 4 at once: 943 to 1070 against 993 to 1083. Work that allocates
  (node sets built, as JSON and back, filtered, sorted), 2 at once:
  processes 1510 to 2033, threads 1216 to 1616; 4 at once: 1786 to 2747
  against 1925 to 2120.
- **The Corestore is as the human says**: with a store open for writing
  and kept open, a second writable open is refused, from a thread and
  from a process ("File descriptor could not be locked"); a read-only
  open (`new Corestore(dir, { readOnly: true })`) reads it, from a
  second thread, from a second process, from four threads at once; one
  opened after a later write sees that write.
- **Several writers, each committing on a branch of its own, at once:
  it works** (the human's question; tried on the filesystem with the
  p2p-git engine, where the request and execute layers always are):
  eight processes, each 25 commits on its own branch of one repository,
  every commit also writing one file with the same content in every
  branch (the same object written by all): three rounds with the
  branches made beforehand, three with each worker making its own: no
  worker failed, 200 of 200 files read back each round. Branch creation
  alone, 25 more rounds of eight at once: none failed. Why it holds: an
  object is named by its content, a branch is a file of its own, and a
  branch moves only from the commit its writer saw (compare, then
  write). Tried with processes: threads have separate heaps and meet
  the same files, so the same was expected, and tried since: "Commits", below. Speed here: the
  200 commits by eight at once 1300 to 1500 ms, by one worker 1700 to
  1850 ms: little gained on commits this small, most of it start-up.
- **What is there today** (`pear-full-square/mrepo-base-request`): a
  request begins on a branch of its own (`execute/<key>/request/execute`)
  and is merged at its end, so the shape is there; but one at a time:
  "the next begins when no branch is being processed". The request and
  execute layers are on the filesystem whatever the storage, each its
  own writer. Nothing of ours uses threads: an mrepo's runtime is a
  process (`bare-subprocess`).

**Ours** (not answered)

- Our reading: the train (a request admitted, the queue, its order, a
  request begun, moved to done) and the merge into `main` stay on the
  one thread; what a request executes between its beginning and its
  merge runs on a thread, several at once. For the XPath pipeline: each
  select and filter a thread reading the store read-only.
- A thread reads one fixed state throughout, the commit of `main` its
  request began on: the same input gives the same result whenever it
  runs, so a run can still be repeated exactly.

**To settle**

- How a thread hands its result to the train (it can commit on its
  request's branch itself: tried, above).
- How many threads (the cores), and what a thread is given: a package's
  bundle, the request, the state to read.
- p2p-git's two open defects for a reader beside a writer (the handover,
  "Elsewhere") come first: they are met at once with threads.

## Commits: how often, and what git handles

The human, 2026-11-14: "What we need to find out the sweetspot frequency
for commits, what can git handle and how does multithreading affect
this."

**Settled** (the human)

- "Our high frequency commits are on filesystem layers. We squash the
  commits when merging into main so less history growth there, and much
  lower frequency. Request branches should be cleaned up under normal
  circumstance."

- **The rates** (after the measurements): "Our request rate and request
  branch commit rate will be significantly higher than the request
  branch creation rate. The number of commits per request branch will be
  low (<100)." Our reading, to confirm: a request branch carries several
  requests (a pipeline's steps) and their commits; what is paid a
  branch (made, merged into `main`, removed: the train's part) is paid
  far less often than what is paid a commit, which is cheap and runs in
  parallel.
- **The two repairs are a task**: "Yes, put them on the task list.
  Sounds like a good starting position" (`tasks.md`, task 4).
- **The same measured on the human's laptop** (twelve cores), by the
  local agent: in `prompt-local.md`.

**Against what is built** (found, 2026-11-14)

- **The merge into `main` is a plain merge today**, not a squash
  (`mrepo-base-execute`: `w.merge(...)`; `mycelium-git`'s `merge` makes
  a merge commit, and its `deleteBranch` asks that the branch's head is
  in the target's history, which a squash does not give). The squash is
  to build.
- **A request's branch is removed today, but not all of it**: its empty
  folders stay under `refs/` and its objects stay (loose objects only,
  nothing collects them; each merge also leaves one commit nothing
  refers to). Both are in the numbers below.

**Found** (measured here, 2026-11-14: the machine and versions as above;
the filesystem with the p2p-git engine unless said; each commit one
small document put at `swarms/n<x>/.node.json`, a folder of 100
children; ext4, nothing forced to disk). Kept since as a tool, to be run
again: `tools/bare tools/commit-bench.js` (one line of JSON a
measurement; about six and a half minutes here).

- **Writers at once, each on its own branch** (threads really, this
  time; branches of one layer, `execute/<id>/main`, made from `main`;
  300 commits each, three runs; no error in any). Commits a second, all
  writers together:

  | writers | threads | processes |
  |---|---|---|
  | 1 | 107 to 118 | 115 to 119 |
  | 2 | 220 to 231 | 185 to 225 |
  | 4 | 240 to 256 | 257 to 262 |
  | 8 | 262 to 266 | 283 to 349 |

  It follows the cores: this machine gives a plain loop about 2.5 times
  from its four. Separate layers (`data/w<i>`, an orphan branch each)
  were the earlier trial with processes: the same holds.
- **One commit, one writer**: 7 to 9 ms. Each object written (a blob, a
  tree, a commit) or a branch moved: 0.5 to 1.4 ms, and that does not
  change as the history grows.
- **A folder's width costs**: a commit writes again the tree of every
  folder on its path. One writer, commits a second: a folder of 10
  children 137; of 100: 119; of 1000: 55; of 10000: 11. The folder of
  100 five levels deeper: 91.
- **A long history on one branch does not slow a commit**: 12,000
  commits, 130 to 148 a second throughout. On disk: 60,205 loose
  objects, 241 MB (about 20 KB a commit: five small files of one block
  each).
- **`main` in the Corestore** (a Hyperdrive under p2p-git): 112 commits
  a second, one writer: as the filesystem.
- **Native git** (a git process an operation): 24 commits a second.
- **A request's cycle on one thread slows as requests are done** (its
  branch made from `main`, one commit, a plain merge into `main`, the
  branch removed), ms each:

  | requests | branch made | a commit | merge into main | branch removed | together |
  |---|---|---|---|---|---|
  | 1 to 50 | 7.1 | 10.3 | 21.7 | 4.8 | 44 |
  | 51 to 100 | 14.9 | 13.6 | 47.5 | 9.0 | 85 |
  | 101 to 150 | 23.2 | 17.7 | 71.3 | 12.9 | 125 |
  | 151 to 200 | 34.7 | 22.7 | 104.4 | 17.9 | 180 |

  Two causes, neither the writing:
  - **the branches listed** (six times a request: 3.2 ms a call at
    first, 16.4 after 150 requests): every removed branch leaves its
    empty folders under `refs/`, and the listing walks them all. After
    200 requests: one branch, 204 folders. It counts for the whole
    repository, every layer: a branch removed anywhere slows every
    listing;
  - **the ancestry check** (twice a request: 5.1 ms a call at first,
    33.1 after 150): `isAncestor` walks the whole history of the branch
    merged into, to find that the request's commit is not in it yet. It
    counts for that layer only.
- **Not tried**: the merge from a branch on the filesystem into `main`
  in the Corestore (the `p2p` storage's mixed backend: the objects
  carried over); writes forced to disk.

**Ours** (not answered)

- **Git is not the limit for the commits themselves**: about 110 to 140
  a second a writer, more with the cores, steady over a long history.
  Multithreading helps the executions; it does not help the train,
  which is one thread by design.
- **The limit is the train's bookkeeping**: two repairs first, then
  measure again, before a frequency is chosen:
  1. a removed branch takes its empty folders with it;
  2. the ancestry check bounded, or gone with the squash (a squashed
     request is never in `main`'s history).
  After them a request's cycle should stay near its first figure (44 ms
  with the plain merge, about 20 requests a second on the one thread);
  an expectation, not measured.
- **Keep folders narrow**: under about a thousand children a folder; a
  wider set split over subfolders. A commit a step, not a commit a node.
- **Space**: about 20 KB a commit on the filesystem and nothing
  collected. With the squash and the branches cleaned up, what a
  request wrote on its branch can go with it: a collection of objects
  nothing refers to is to build for the filesystem layers.

**To settle**

- The squash's rule in `mycelium-git` (a commit on `main` with the
  merged tree and one parent; the request's branch then removed though
  its head is not in `main`'s history) and what `main`'s commit says of
  the request (its record is in `request/done`).
- Where the two repairs go: `mycelium-git`'s adapter, or `p2p-git`
  (which has two open defects on refs already: the handover,
  "Elsewhere").
## To settle

- **The syntax**: XPath's own or ours. A URI is typed in a shell: `*`,
  `[`, `|`, `>` need quoting there.
- **The stacked merge's rule**: which layer is on top (local data, the
  sources in their order), and whether a node on top replaces the one
  below whole or their documents are combined.
- **A command that is not a read, executed at a selection** (`haicc
  swarms/* service/start`): its answers are not node sets (the human: "a
  response can contain any data type"); what the merge does with them,
  and with one that fails.
- **A hop that cannot be made**: the linked mrepo not running, the
  protocol not active there, no answer in time.
- **Where the merge lives** (an action of the `haicc` protocol, the
  request layer) and where the rewrite's code does.
- **How the plan is recorded**, so a run can be repeated exactly.
- **The read of a replica**: `tasks.md`, task 2, noted reading through a
  link as a local read of a replica, beside the `haicc` jump. By this
  design a link is crossed with `haicc`; whether the replica read
  remains as a second way.

## Where

What is there today, to start from; check it again, the code may have
moved.

- `pear-full-square/mycelium-xpath`: `select`, a plain path and `*` at
  any step, names matched exactly; generic, knows no mrepo.
- `pear-full-square/mrepo-base-xpath/internal/resolve/`: a URI resolved
  to one position; one that runs through a shortcut is refused; a
  shortcut's sources are a list, the first one in use.
- `pear-full-square/mrepo-base-haicc/external/goto/`: at a shortcut the
  command that follows is sent on, one command to one place; no fan-out.
- `pear-full-square/mrepo-base-crud`: `*` as the last name part only; a
  URI does not run through a shortcut.
- `pear-full-square/mrepo-base-request`: a command interpreted on its
  way in (`lib/command.js`), where a rewrite would sit.
- `vision.md`, "Pipelines, and mycelium as a database server" and
  "Overlays"; `tasks.md`, task 1 (the prefix, the jumps, selections as
  arrays) and "Predicates in a URI".
