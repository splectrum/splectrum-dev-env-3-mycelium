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

**Proposed** (ours, not yet put to the human). Each as a feature is
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
- **Parallel work: processes or threads** (the human's question; our
  opinion, not answered). Across mrepos: processes, as it is: every
  linked mrepo has its runtime, so a fan-out over links runs in
  parallel already. Inside one mrepo: its store has one owner (RocksDB
  under the Corestore is opened by one process), so a second process on
  the same mrepo is not the way; reading is asynchronous in the one
  process already; threads only where a step computes heavily over a
  large set (a function, a sort), fed by the runtime that owns the
  store. Neither until a measurement asks for it.
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
- **Bare runs threads in parallel** (the human's question, tried here
  2026-11-14, Bare v1.36.0, four cores): `Bare.Thread`, in Bare itself,
  a JavaScript entry on an OS thread of its own; `bare-thread` (an entry
  bundled with its modules) and `bare-channel` (messages between
  threads) are in `node_modules/` already, brought by `brittle` and
  `bare-fs`. Four runs of a loop: 2107 ms one after another, 859 ms a
  thread each. A thread has its own heap: nothing shared but what is
  passed (a message, a shared buffer). Nothing of ours uses threads: an
  mrepo's runtime is a process (`bare-subprocess`). Starting one costs
  the same either way: 20 empty processes 660 ms, 20 empty threads
  648 ms, started together. **Running, no difference to speak of** (the
  human's question: do two processes in parallel perform better than
  two threads; three runs each, a shared machine, the spread between
  runs larger than the gap): a plain loop, 2 at once: processes 1021 to
  1188 ms, threads 1015 to 1164; 4 at once: 943 to 1070 against 993 to
  1083. Work that allocates (node sets built, as JSON and back,
  filtered, sorted), 2 at once: processes 1510 to 2033, threads 1216 to
  1616; 4 at once: 1786 to 2747 against 1925 to 2120.
- `vision.md`, "Pipelines, and mycelium as a database server" and
  "Overlays"; `tasks.md`, task 1 (the prefix, the jumps, selections as
  arrays) and "Predicates in a URI".
