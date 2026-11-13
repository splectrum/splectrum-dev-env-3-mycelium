# Tasks: discussed, waiting to be built

Tasks discussed with the human and stacked here, to be built later in
batches, in this order. A task is removed from this file when it is built:
its record is then a part in `readme.md`.

How to read a task:

- **Settled** is what the human said or confirmed. Build it as written.
- **Left to us** is what the human handed over: ours to decide and to
  change while building. Say what was done.
- **Proposed** is ours, put to the human and not yet answered. Confirm it
  with the human before building ("go"), unless the task says it is ours
  to keep or change.
- **Where** names the code found when the task was discussed, to start
  from; check it again, the code may have moved.

Validation, the commit, the merge and the product repositories: as
`CLAUDE.md` and `handover-next.md` say, for every task.

## 1. Relative URIs

Discussed 2026-11-13, while designing task 2, which builds on it.

**Settled** (the human)

- A URI in a command, which today starts at `/`, is in fact the mrepo's
  `main`: a request from outside is naturally restricted to `main`.
- **Relative throughout**: a URI never has a leading slash. It is
  relative to where its writer stands.
  - From outside, the writer stands at `main`: `.` becomes `main`, `host`
    becomes `main/host`.
  - The mrepo itself stands at its root, the folder above the layers: `.`
    is that root, and its own commands name the layer first
    (`protocol/activate . help`).
- `.` is written where `/` was: the position itself. A command that
  gives no URI means `.` (`haicc host service/start`).
- **One standard, inside the code too, in the long run.** Writing to one
  standard outside and another inside leads to confusion, and certain
  patterns do not work. The easiest first is fine; the code can start to
  accept `.` and no slash, and change over gradually.
- **The current root can move away from the mrepo's root**:
  `haicc test/mydata/users users/check-addresses *` (the position
  `test/mydata/users` in `main`; there the protocol `users`, its action
  `check-addresses`, the URI `*`). An action written with relative URIs
  works wherever its root is.
- **A position can be a selection**:
  `haicc test/mydata/users[name=s*] users/check-addresses *`. The command
  is executed once for each node selected, that node the current root.
- **The rule: all node selections are arrays.** Most are singletons; the
  system is then ready for set processing, as in the example. (From an
  earlier discussion of the human's; found written nowhere in this
  repository, 2026-11-13.)
- **An action's result is an array too**, because its input is in
  essence XPath: `crud/read swarms` gives an array holding one node,
  `crud/read *` an array of all of them, the same shape. A set comes in,
  a set goes out.
- **An empty selection is not an error** inside: it gives an empty
  array, also for a plain path with a typo in it. Whether that is an
  error is for the one who submits the request to check. No rule of ours
  tells a plain path from a pattern.
- **URIs are rewritten on exit, by a prefix** (the human). There will be
  many rewrites: a linked mrepo that returns URIs needs them rewritten to
  the mrepo that links it, and so on outwards. Instead of rewriting the
  data, the output carries a prefix for its URIs: when a data set crosses
  a boundary only the prefix is updated, and any tool showing the URIs
  reconstructs them (prefix and URI).
  - The prefix may be stored as an array, because the rewrites are fixed
    chunks (the human; agreed by us: a rewrite is then an operation on
    whole elements, and the array keeps the boundaries a joined string
    loses, one chunk an mrepo crossed, so a tool can rebuild the path or
    the chain of `haicc` commands that reaches it).
- The flag `error-on-empty` is not in this round: "Future additions",
  below.

- **What an action is about is an argument**, not the request's URI
  (agreed): `help/get` and `runtime/run` take their subject, written from
  the mrepo's root (`packages/...`), as their first argument:
  `haicc . help/get . packages oneliner`. An argument is data, not
  access.
- **A `./` prefix is allowed** (the human): `./sources` is the position
  `sources`. It is how a position at the local root named like one of the
  `haicc` script's own commands is typed.

**Left to us** (the human: "you know best how it fits in")

- The changeover, in four steps; this task builds the first two:
  1. requests first: everything written or stored as a request is
     relative (commands, hooks, the form); one function at the boundary
     serves the code that still wants slash-led paths;
  2. the interface accepts both: the validator and the read and write
     calls take `.` and no leading slash as well as the old form, meaning
     the same;
  3. modules change over as they are touched, starting with `crud`,
     written relative from its first line; when none uses the old form,
     the validator refuses it;
  4. the current root moves: reads and writes relative to the
     execution's root (the roadmap's "execution context opened at a
     position"): a task of its own, after `crud`. An action at a moved
     root reaches the mrepo's own state (the service state in `runtime`)
     through the runtime's view the execution has, not through its own
     root: to settle then.
- The order of the tasks: this one first, validated end to end, then
  task 2 on top, so `crud` needs no adapter and its tests are written
  once.

**Proposed** (ours, to keep or change while building; say what was done)

- Selections as arrays, in this task: `resolve` gives an array of
  positions and `goto` executes at each (it follows from the rule; the
  code gives one position and executes once today); only singletons and
  `*` can occur until predicates are built. A command executed at
  several positions runs in the one execution: one failure, nothing
  merged.
- The prefix, as put to the human (the array answered, the rest not):
  - it is the execution's current root: an action answers relative to
    its root without knowing where it stands, and the framework supplies
    the prefix; no action sets it;
  - it is a header on the envelope, not part of the data: every
    hand-over already makes a new envelope around the unchanged core.
    The first planned use of the record's headers;
  - its chunks, outermost first; the first is the holder's layer. For
    `haicc host haicc node-1 crud/read swarms`, the URI in the data
    `swarms` throughout: inside `node-1` `["main"]`; handed to `host`
    `["main", "node-1"]`; handed to the boot mrepo
    `["main", "host", "node-1"]`; out to the sender `["host", "node-1"]`.
    A boundary replaces the first chunk with its own layer and the
    link's position; the way out drops it.
- A leading slash is refused in a request's URI.
- `./` is accepted wherever a URI is written and is not part of its
  canonical form (`./host` is `host`).
- A subject left out is the root: `haicc host help/get` is help on the
  mrepo itself.
- The `haicc` script: a first word that is one of its own commands
  (`sources`, `prereq`) is that command; `.`, a word starting with `./`,
  and anything else is a URI. The machine level stays: `haicc boot/deploy`,
  `haicc boot/teardown`, a protocol and action with no URI before them.

| Today | Relative |
|---|---|
| `haicc / boot/deploy host <package>` | `haicc . boot/deploy host <package>` |
| `haicc /host service/start` | `haicc host service/start` |
| `haicc /host haicc /node-1 service/start` | `haicc host haicc node-1 service/start` |
| `haicc / help/get /packages oneliner` | `haicc . help/get . packages oneliner` |
| `haicc /host help/get /` | `haicc host help/get` |
| a hook: `protocol/activate / help` | `protocol/activate . help` |

**Where**

- `pear-full-square/mrepo-base-request/lib/command.js`: `interpret` adds
  the leading slash to a URI given without one.
- `pear-full-square/mrepo-base-request/index.js`: `check` (the URI
  canonical, matched against the action's `uris`), `matches`, `missing`
  (`target`: the URI is not `/`).
- The protocols' configs, their `uris` patterns (`/`, `/<name>`, `/**`):
  each module's `internal/config.js`, each package's `protocol.js`. Only
  requests from outside are matched against them.
- `pear-full-square/mrepo-base-haicc/external/goto/`,
  `pear-full-square/mrepo-base-xpath/internal/resolve/` (a URI resolved
  to a position in `main`), `pear-full-square/mrepo-base-boot` (the
  target's name from the URI), `mrepo-base-help` (`get`) and
  `mrepo-base-runtime/lib/protocol.js` (`run`): the two whose subject
  becomes an argument.
- `haiccing/base-linux-haicc/bin/haicc` (a first part starting with `/`
  goes to `haicc-request`) and `bin/haicc-request` (`/` sent as it is,
  another URI as `haicc <uri> ...`).
- The hooks' files in the components' `mrepo/runtime/hooks/`.
- The tests that type commands: `haiccing/base-linux-haicc/test/run.sh`
  (107 asserts), `haiccing/base-component-boot/test/boot/`, the modules'
  tests; the READMEs that show commands.

## 2. The crud protocol

Discussed 2026-11-13. The start of `base-package-crud` (the roadmap's
item 3), wanted for creating structure in `main`.

**Settled** (the human)

- The `crud` protocol is implemented; `update` is left not implemented.
- For visible state, `crud` operates only on `main`. It may be used by
  internal requests on other layers: those changes are then audited (a
  request each). The human's consideration: with `main` only there is no
  natural auditing on the layers, where it could be useful.
- **The stored form** (agreed 2026-11-13, replacing the human's earlier
  suggestion of a file turned into a folder when needed): every node is
  a folder holding `.node.json`, its document, `{}` when no value is
  given. `main/swarms/swarm-1` is `swarms/swarm-1/.node.json` in `main`.
  - The folder is created straight away, with the file in it: it is the
    "dummy" that keeps the folder in git.
  - The system name starts with a dot (the human): it is naturally
    hidden, our URIs do not allow it.
  - Why: one stored form, no conversion; a write touches only its own
    node (a file turned into a folder would have a create rewrite its
    parent, where parallel steps would collide).
  - Its costs, accepted: two git objects a node; the existing files on
    other layers (`runtime/service.json`) are not in this form, so `crud`
    does not see them as nodes: they move to it when an internal use
    comes.
  - The two repositories exist (checked on GitHub, 2026-11-13).
- With task 1, `crud` gets the URI from the mrepo's root, layer first
  (`main/swarms/swarm-1`, `runtime/log`), and nothing from outside can
  name another layer.
- **Idempotent** (the human): repeating a request is safe.
  - `create` ensures the node exists, and creates the whole path, not
    just the leaf: missing parents are made too, each with an empty
    document. A node already there is left untouched, also when a
    different value is given (changing it is `update`'s); the request
    succeeds and the result says what was created and what was there.
  - `delete` ensures the node is gone: one that is not there selects
    nothing, and the request succeeds with an empty result (the empty
    selection, task 1).
  - Why: a step retried or a run replayed does not fail on its own first
    attempt; parallel steps that need the same node do not collide.
- **`delete` recurses only with a flag**; the default is no (the human).
  Without it a node that still has children is not removed.
- **A linked mrepo is data that comes from elsewhere** (the human): a
  shortcut is a node, and deleting it deletes the link, not what it
  leads to, as deleting a shortcut does not delete the file. Removing a
  linked mrepo's link is not a teardown. So `recurse` needs no exception
  for what is linked below: it removes the nodes and the links, one
  change to this mrepo, undoable. Whoever wants the linked mrepo itself
  gone tears it down first (`boot/teardown`): the sender's matter, not
  something `crud` guards against.
- **A URI in a result is in the internal format** (the human): an action
  cannot know a sender's standpoint; there are internal requests that
  never see the outbox. With the prefix of task 1: the URI in the data is
  relative to the execution's root, and the prefix says where that is.
- The names (agreed): protocol `crud`, module
  `pear-full-square/mrepo-base-crud`, package
  `haiccing/base-package-crud`.
- The actions (agreed): `create`, `read`, `delete`. `update` is not there
  at all: asking for it answers
  `no action: crud update (create, delete, read)`.
- The two repositories, created by the human (2026-11-13, public), with
  these descriptions:
  - `pear-full-square/mrepo-base-crud`: "Module: the mrepo crud protocol,
    an mrepo's nodes created, read and deleted by URI."
  - `haiccing/base-package-crud`: "Package: the crud protocol, the
    generic actions on an mrepo's data: its nodes created, read and
    deleted by URI."

**Proposed** (put to the human, not yet answered)

- A node's name is a plain name, no extension (`isName`,
  `mycelium-uri`).
- The flag is written as the word `recurse` after the URI:
  `crud/delete swarms recurse` (an optional argument: commands have no
  named options yet).
- A node with children deleted without `recurse`: refused, saying so.
- The result, an array, an entry for each node (the rule of task 1):
  `{ "uri": "swarms", "value": {}, "children": ["swarm-1"] }` (the
  prefix `["main"]` on the envelope) for
  `read`, the children by name only (`crud/read swarms/*` reads them);
  `create` and `delete` answer in the same shape, saying for each node
  what happened: created, already there, deleted.
- `read` at a shortcut shows a node that is a link, with where it leads.
  A URI still does not run through a shortcut: the way across is `haicc`
  at it.
- Where it is open: in `base-component-haicc`, behind the service's door
  as `boot` is: activated by a `start` hook, deactivated by a `stop`
  hook.
- Not in this task: `goto` at a position deeper inside `main` (the
  execution context opened at a position); it is the next item on the
  roadmap.

**Where**

- The model for the package: `haiccing/base-package-help` (`protocol.js`
  mounting the module's actions, `package.json` with its `modules`, its
  `test/` sets). For the module: `pear-full-square/mrepo-base-protocol`
  (`external/<action>/` with a README each, `internal/config.js`,
  `test/`).
- An action takes `(exec, form)`: `exec.read`, `exec.select`, `exec.put`,
  `exec.remove`, all on full URIs (`pear-full-square/mrepo-base-execute/index.js`;
  its `TARGETS` are the layers an action may write). Reads and writes
  inside do not validate names, so `.node.json` can be read and written;
  a request's URI is validated at the boundary, where a leading dot is
  refused (`pear-full-square/mycelium-uri/lib/uri.js`, checked).
- A shortcut: `resolve` in `pear-full-square/mrepo-base-xpath`; it has no
  presence in `main`, its entry is in the `xpath` layer.
- The activation hooks: `haiccing/base-component-haicc/mrepo/runtime/hooks/`
  and the component's list of packages.
- A new module and a new package are written into `package.json`
  (workspaces) and `package-lock.json` by hand, the module linked in
  `node_modules/` (`handover-next.md`, "The lock file by hand");
  `tools/release.js` builds every package.
- Building and testing here does not need the two new repositories; the
  product pushes do.

## 3. The rest actions removed

Follows task 2.

**Settled**: nothing yet. The human asked whether the rest actions are a
protocol. The answer given: in shape yes, in practice no: a table named
`rest` (`get`, `put`, `delete`) in `mrepo-base-execute`, mounted by no
package, so no deployed mrepo offers it.

**Proposed** (not answered): once `crud` is validated, `rest` is removed
and the tests that use it are moved to `crud`.

**Where**: `pear-full-square/mrepo-base-execute/lib/actions.js` (the
table, the default of `execute`'s `actions`);
`pear-full-square/mrepo-base-execute/test/execute.test.js` and
`pear-full-square/mrepo-base-boot/test/build.test.js` (its users); the
roadmap's item 3 in `handover-next.md`, which says they stay until then.

## Future additions

Not for this round. Noted so they are not lost; each is discussed again
before it is built.

### The flag error-on-empty

The human, 2026-11-13: of no importance at the moment.

**Settled** (the human)

- A flag `error-on-empty` for the XPath: with it, a selection that
  matches nothing fails the request. Without it an empty selection gives
  an empty array (task 1).
- It is needed for a subset of commands only. It can be added to a
  request by the user, or set for specific protocols (like `service`).
- It is a local matter: how a package is made, and what type of mrepo it
  is for. The configs must be well documented.

**Proposed** (not answered: the human set the whole flag aside)

- In the form: a property of the request, `errorOnEmpty: true`, applying
  to every selection evaluated for it.
- At the command line: an option before the URI, where `--raw` and
  `--output` go: `haicc --error-on-empty hots service/start`.
- In a config: the same property on a protocol, or on one of its actions.

### Predicates in a URI

`haicc test/mydata/users[name=s*] users/check-addresses *` (the human's
example, task 1). Not valid in our URIs today; `mycelium-xpath` knows
only `*`. Task 1 is built so that it does not block them.
