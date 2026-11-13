# Tasks: discussed, waiting to be built

Tasks discussed with the human and stacked here, to be built later in
batches, in this order. A task is removed from this file when it is built:
its record is then a part in `readme.md`.

How to read a task:

- **Settled** is what the human said or confirmed. Build it as written.
- **Proposed** is ours, put to the human and not yet answered. Confirm it
  with the human before building ("go"); do not build on it as it is.
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

**Proposed** (put to the human, not yet answered)

- The changeover, in this order:
  1. requests first: everything written or stored as a request is
     relative (commands, hooks, the form); one function at the boundary
     serves the code that still wants slash-led paths;
  2. the interface accepts both: the validator and the read and write
     calls take `.` and no leading slash as well as the old form, meaning
     the same;
  3. modules change over as they are touched; when none uses the old
     form, the validator refuses it;
  4. the current root moves: reads and writes relative to the
     execution's root (the roadmap's "execution context opened at a
     position"). An action at a moved root reaches the mrepo's own state
     (the service state in `runtime`) through the runtime's view the
     execution has, not through its own root: to settle then.
- Predicates (`[name=s*]`) are a later task of their own: not valid in
  our URIs today, and `mycelium-xpath` knows only `*`. This task must not
  block them: a relative URI is XPath's relative path, the current root
  its context node, `.` its self.
- Selections as arrays, in this task: `resolve` gives an array of
  positions and `goto` executes at each; only singletons and `*` can
  occur until predicates are built.
- What an action is about is an argument, not the request's URI:
  `help/get` and `runtime/run` take their subject (`packages/...`, from
  the mrepo's root) as an argument after the URI:
  `haicc . help/get . packages oneliner`. An argument is data, not
  access.
- The `haicc` script tells an mrepo command from its own commands
  (`haicc sources`, `haicc prereq`) by the leading slash today. Without
  it: a first word that is one of the script's own commands is that
  command, anything else is a URI. A position at the local root named
  like one of them is reached as `haicc . haicc <name> ...`.
- The order of the tasks: this one first, validated end to end, then
  task 2 on top, so `crud` needs no adapter and its tests are written
  once.

| Today | Relative |
|---|---|
| `haicc / boot/deploy host <package>` | `haicc . boot/deploy host <package>` |
| `haicc /host service/start` | `haicc host service/start` |
| `haicc /host haicc /node-1 service/start` | `haicc host haicc node-1 service/start` |
| `haicc / help/get /packages oneliner` | `haicc . help/get . packages oneliner` |
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
- A folder needs a file in it; the convention for the "dummy":
  - an empty folder is created as a file, and changed into a folder when
    needed;
  - with folder metadata as part of the structure: a JSON document with
    the folder's name while it is empty, and an agreed system name when
    it is not;
  - the system name starts with a dot: it is naturally hidden, our URIs
    do not allow it.
- With task 1, `crud` gets the full URI, layer first, and nothing from
  outside can name another layer.

**Proposed** (put to the human, not yet answered; the first two lines were
not objected to)

- Names: protocol `crud`, module `pear-full-square/mrepo-base-crud`,
  package `haiccing/base-package-crud` (the package's name is the
  roadmap's).
- Actions: `create`, `read`, `delete`. `update` is not there: asking for
  it answers `no action: crud update (create, delete, read)`.
- The stored form:
  - a node without children is the file `<name>.json`, holding its
    document (`{}` when none is given): `/main/swarms/swarm-1` is
    `swarms/swarm-1.json` in `main`;
  - creating its first child turns it into the folder `<name>/`, its
    document moved inside as `.node.json` (the exact system name is
    ours; the leading dot is the human's);
  - deleting its last child turns it back into the file: one stored form
    for each case;
  - a node's name is a plain name, no extension (`isName`,
    `mycelium-uri`): the URI never shows how it is stored;
  - on another layer the same holds: `/runtime/service` is
    `service.json`; a folder there has no document of its own.
- Strict by default: `create` refuses a position that exists, or one
  whose parent does not; `delete` refuses a node that still has children,
  or a shortcut below it; `read` returns the node's value and the names
  of its children.
- A URI at or through a shortcut is refused, with the way across named
  (`haicc` at the shortcut).
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
- The repositories `pear-full-square/mrepo-base-crud` and
  `haiccing/base-package-crud` do not exist on GitHub (checked
  2026-11-13): to be created by the human before the product pushes.
  Building and testing here does not need them.

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
