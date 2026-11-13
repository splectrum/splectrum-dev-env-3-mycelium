# For the next session: where step 2 stands

Kept current by the cloud session (last: 2026-11-14, part 51). Read `CLAUDE.md`
first (what is here, how to validate), then this, then `readme.md` here
(each part's record; the latest parts last: 30 to 45 are the haicc work; 46 is a note on future design; 47 the
package check; 48 the template up to standard; 49 the test
reports; 50 the pin, `package-docs-mrepo` brought to the template; 51
`base-package-runtime`).
The documentation of what is built is in the packages:
`haiccing/package-docs-template` and `haiccing/package-docs-mrepo`, and
each folder's README.

## Starting a session

A fresh clone has no `node_modules/` and no `sources/` (both ignored by
git), so nothing runs until they are there:

```sh
sh tools/install.sh           # the dependencies, replayed from the lockfile (curl, tar; no npm)
tools/bare tools/release.js   # every package assembled and bundled into sources/, Bare's tarball
```

Then the validation in `CLAUDE.md` works. To see the whole thing run:
`sh haiccing/base-linux-haicc/test/run.sh`.

- **Work on `execute/main`**, merged into `main` with a plain merge, both
  pushed (a cloud session may be given a branch of its own: it is not
  used for the work).
- **The product repositories** are pushed from here, so a cloud session
  attaches them first (`add_repo`, with push): the modules, each
  `pear-full-square/<module>` for a folder of `pear-full-square/`
  (`sh tools/products.sh <module>...`); the packages, each
  `haiccing/<package>` for a folder of `haiccing/`
  (`sh tools/packages.sh -m "<what changed>" <package>...`). Only those
  that changed.
- **Nothing is left running** by the tests. A runtime left over from a
  failed run: `pgrep -fa "bin/bare"`, then stop it by its pid.

## Right now

- **Built and pushed**: everything through part 45. The `haicc` command
  installs, boots, deploys a host from `base-component-haicc`, starts its
  service, deploys a node inside it and chains commands through both.
  Hooks and activation decide what an mrepo offers; every protocol has
  its own package; the boot is a component.
- **With the human**: testing by hand on the local machine. The local
  agent ran `381bbae` (its note, 2026-11-13) and has not yet run what
  came after (parts 39 to 45): its prompt, `prompt-local.md`, is current.
  Its notes come back in `local-note.md`: fetch and read them when told.
- **No release yet**: on the human's word, created by the local agent
  (`handover-local.md`, "Releases").
- **Red on purpose** (2026-11-14): the package check (part 47), the
  template brought up to standard (part 48: a folder for every test, the
  generic ones too) and the test reports (part 49: `test-reports/`, a
  package's pre-release, `tools/package-test.js`) are in `main`, merged
  on the human's word once the template passed its own full set. The
  template's repository (`haiccing/package-docs-template`) and the check
  module's (`pear-full-square/pkgm-base-check`) are pushed.
  `package-docs-mrepo` (part 50) and `base-package-runtime` (part 51)
  are brought to the template and pinned, their repositories pushed; the
  human's order from here: up the protocol stack, one by one. The other
  seven bundle packages are not yet
  brought to the template (`sh tools/package-template.sh <package>`, its
  pages by hand, `tools/bare tools/package-test.js`), and six lack
  a test of their own: `tools/bare tools/code-check.js` lists it all, and
  `tasks.md` ("First") says what is left. One step at a time, each shown
  to the human; a package's repository is pushed when it passes.
- **The tools are kept well structured** (the human, 2026-11-14): soon
  packages are built for them, so they run on the haicc platform as well.
  `tools/README.md` says what each is for and how they are kept.
- **This session's focus** (the human, 2026-11-14): the generic tests and
  tests that need no test mrepo, so a new implementation is known to
  adhere to the rules; the packages' own tests in running mrepos after.
- **A package tests what it provides** (the human, firmly: it was skipped
  and that was very disappointing): custom tests in each package for its
  functionality; for a protocol a test mrepo with test data, its actions,
  hooks and configs. Tests that fail when something is forgotten: the
  platform is so flexible that without full coverage it becomes hell.
  Never leave a package's functionality to another package's test.
- **Tasks stacked, to be built in batches** (the human, 2026-11-13):
  `tasks.md` here holds what was discussed and waits: first every package
  testing what it provides (a debt, the human disappointed it was
  skipped), then relative URIs, the `crud` protocol, the rest actions removed. Each says what
  the human settled and what is only proposed: confirm the proposed with
  the human before building. More are added as they are discussed; build
  when the human says so.
- **Next, in the human's order** (each discussed first): creating
  structure in `main` (the start of `base-package-crud`: `tasks.md`, 1
  and 2), with the execution context opened at a position, so that
  `haicc /swarms/swarm-1 boot/deploy node-1` works; a node's unique URI;
  then the first demo. The list is under "The roadmap", item 2.
- **A leftover branch**: `claude/vigilant-gates-b1r8rn` on the remote
  holds nothing that is not in `main`; the human may delete it.

## How the human works with us

- **Finish the discussion before building**: a reading of what the human
  said is confirmed by the human before any of it is built ("go"). Building
  on an unconfirmed reading, even a mostly right one, costs changes after.
- **Ask point by point, briefly**: one question at a time, short; no walls
  of text. Discuss first; build what has settled; structure and design are
  decided with the human.
- **Check yourself before asking** (GitHub: `gh api -X GET search/repositories
  -f q='<name> in:name org:<org>'`; the code; the docs).
- **Few pushes** (GitHub suspended us once): one commit and one push per
  part; when a part is done, merge `execute/main` into `main` (a plain
  merge, `git merge --no-ff`) and push both at once; then the product
  repositories (`sh tools/products.sh <module>...` and
  `sh tools/packages.sh -m "..." <package>...`, from `main`).
- **Say in a few words what you are doing** when a step takes long; report
  after each step of a build, plainly, with what passed and what did not.
- **Record what settled**, in `readme.md` as a part, and keep this file and
  `CLAUDE.md` current: a context reset loses everything else.
- **The lock file by hand**: a module added or removed is written into
  `package.json` (workspaces) and `package-lock.json` (its workspace entry,
  its link entry) directly, its link made in `node_modules/`; no npm run.
- **Bare only**: npm only to change dependencies (`npm install
  --ignore-scripts`; then `chmod +x node_modules/bare-runtime-linux-x64/bin/bare`,
  npm drops its exec bit). The repo's Bare:
  `node_modules/bare-runtime-linux-x64/bin/bare` (tests:
  `bare ../../node_modules/brittle/cmd.js test/*.test.js` in a module).
- **This development repository stays as it is** (its `rules.md`,
  `pending/default`, `capability/*`): behind in structure, not to be
  migrated; the new model is for mycelium repositories.
- **The headers stay empty** until their use is planned with the human.
- **Only what is in use is here** (2026-11-11): the modules no package
  carries, the old haiccing folders, `splectral/`, `notes/`, `docs/` were
  removed (the history has them; each module has its repository). Bringing
  one back: copy it from its repository, then bring it to the rules first
  (READMEs cascading, `external/`/`internal/` methods, the code rules), as
  the checks will demand. `CLAUDE.md` describes the repository as it is:
  keep it so.
- **A test waits for a runtime's process to end** (signal 0, `kill -0`), not
  only for it to stop answering.

## What is built (`readme.md`, parts 13 to 45)

- **Packages**: a package is one bundle carrying its structure (`mrepo/`),
  its code (`modules/`, assembled), its tests and its READMEs; its main a
  generated dispatcher running every entry by path (`/run`, `/protocol`,
  `/deploy`, `/test/...`). Assembly options per package (`assemble.omit`).
- **The boot** (`base-component-boot`, the initial boot mrepo and its
  program; `base-package-boot`, the boot protocol alone): run with Bare
  from its bundle, the
  boot mrepo built, its packages placed, its runtime started; nothing
  deployed by it, no executable. Its protocol: `boot deploy`, `teardown`,
  `redeploy` of a child, inside its parent (`main/<name>/`, the shadow of
  `main`), its shortcut in the parent's `xpath` layer.
- **The haicc command** (`base-linux-haicc`, sh): one installer file;
  `haicc sources`, `haicc prereq`, `haicc boot/deploy` and
  `haicc boot/teardown` (the machine level); `haicc <URI>
  <protocol>/<action> <args>` writes a record into the boot mrepo's inbox
  folder and prints the response.
- **Commands** (parts 33, 34): a request is protocol, action, URI and a
  list of unnamed arguments; given as its parts as typed, it is
  interpreted on its way in. `haicc` is a protocol (`base-package-haicc`),
  `goto` its default action: at a shortcut the command that follows is
  sent on unchanged, at the root it is executed here. XPath
  (`mrepo-base-xpath`) is the runtime's internal: a local URI resolved to
  a position, an ordinary node or a shortcut. An mrepo has a unique URI
  (`local/boot`, `local/host`).
- **The haicc component** (`base-component-haicc`): the mrepo a host or a
  node is managed with: runtime, boot, service, haicc; `main` empty.
- **The runtime** (`base-package-runtime`): the engine of every mrepo; its
  `protocol.js` offers `runtime run` (a linked package's entry, its tests)
  and `help` (`get`, `extract`). Requests: one handler into pending;
  internal requests (the mrepo's own, not in the inbox) first, the inbox
  taken in once the mrepo is operational.
- **Help**: the READMEs of an mrepo's packages extracted into its `help`
  layer as it starts, read with `help get <uri>` at three levels.
- **Validation in every package**: `/test/help` (the README rules),
  `/test/code` (the code rules), `/test/mrepo` (the integrity of its mrepo
  side), `/test/modules` (the carried modules' own tests);
  `validate-in-situ` in a running mrepo (`help-in-situ`, `mrepo-in-situ`).
- **Documentation packages**: `package-docs-template`,
  `package-docs-mrepo`, linked into every mrepo, validating themselves.
- **The service** (`base-package-service`): an mrepo that links it is
  service managed: a state machine (booted, initialised, started) whose
  actions each run the hooks of their transition, then move the state.
- **Hooks and activation** (parts 42 to 45): a request from outside is
  accepted only for an active protocol; nothing is active by default.
  `protocol/activate` and `protocol/deactivate` (`base-package-protocol`)
  write the active set, the `protocols` layer. Hooks are files,
  `/runtime/hooks/<transition>/<name>.json`, each a command: `boot` fired
  by the runtime as it starts, the other four by the service. Runtime
  config (the hooks, the service state) is laid in from the last package
  of a list only, the one that defines the mrepo; a list ends with its
  own package. The runtime names no protocol; every protocol has its own
  package (`help` in `base-package-help`).

## The roadmap, in order

Not built yet, and the platform is not deployed until the first two are
(they were in the earlier packages plan; kept here so they are not lost):

1. **`base-package-service`**: built (part 28): the `service` protocol as
   a package, the `protocols` layer, the gate on the loaded protocols'
   configs. Rule (the human): a package creates one entity, for a base
   package a protocol. The service's door closes a selection of
   protocols, those `gated` in their config (the human); the others stay
   open. Still open from it: the runtime's status beyond "not yet
   operational".
2. **haicc**: the first build is done (parts 30 to 37): the command, the
   protocol, XPath and shortcuts, the component, deployed and started from
   the command line, a node inside it, commands chained through both.
   What haicc is and the naming are in parts 30 to 32 (read them before
   designing further): package, component, application, demo, solution,
   manager; the offset (a command executed in the context of its position,
   forward visibility only); the storage rule (only `main` on the
   Corestore).
   **Next, the human's priority**: the host's haicc mrepo is there; then a
   node's haicc mrepo, then a swarm going, the demos on top of the
   component (they bring the folders in `main`).
   **Open, each to settle with the human first**:
   - a position deeper inside `main` (`haicc /swarms/swarm-1 boot/deploy
     node-1`): `goto` refuses it for now; it needs the execution context
     opened at the position, and it comes with the first demo;
   - a node's unique URI, `<swarm>/<node>`: a child takes its parent's
     swarm today, so everything is `local/<name>`;
   - into a node's container: mapped inbox and outbox folders, or an
     equivalent, secure; `base-manager-host`, `base-manager-node`;
   - publishing (the human, 2026-11-13): a release is created on each
     package's own repository, not in a repository of sources; signing is
     off, we are not set up for it; what cannot be done from the cloud
     session (creating a GitHub release) is done on the local machine.
     For now: a local build into local sources, the repositories pushed
     for completeness; the network is not good enough for many downloads.
     Not built: `haicc sources download` fetches Bare only, and the
     mrepos do not fetch over https (the backup is recorded and passed
     on, nothing reads it). To settle: the sources folder structured to
     take everything (proposed: a folder an organisation, ours or third
     party, each with its manifest; addons by hash);
   - teardown (the human): not a worry now, it will sort itself out;
   - structure in `main` (the human): functionality to create it is
     needed before a deeper position can be used;
   - the main data of a linked mrepo seen through its shortcut;
   - composite actions (an action resuming at a label after a child
     request; `boot/install` as one), fan-out, a time limit for a child
     that never answers, dispatch to another node;
   - the layer routing in the code against the storage rule; the two-way
     sync of a folder with the Corestore.
3. **`base-package-crud`** (the human: CRUD, not rest): the generic
   actions on an mrepo's data as a protocol of its own, gated. It gets its
   full meaning with mutable and immutable implemented: an update on the
   mutable side from a stream of immutable change events. Until then the
   `rest` actions stay in `mrepo-base-execute`, unmounted, the tests' own.
4. **Release and sourcing, deferred**: bundles signed and the manifest
   checked against the publisher's key (the key tool was removed with the
   clean-up: to be rebuilt with it); a GitHub source beside the folder
   source; the Docker prerequisite used (nodes).

Then, as discussed:

5. **The terminal as a mini mrepo** (its boxes, its requests done).
6. **The dispatcher application** (like HAICC: its own API; requests to it
   processed, others routed; stray records returned to it as misdelivered;
   local subscriptions file operations, remote ones other nodes, followed
   or announced). Until then HAICC's input posts into the repository's
   inbox and reads its completed form from the outbox.
7. **The headers**: to plan with the human (the execution's metadata, the
   states a request ran on, are in the commits only meanwhile).
8. **Command help** (the help protocol's second stage; the first, the help
   layer and `runtime help`, is built). Agreed with the human:
   - **The external API, structured**: a post-processing step of the help
     parser, a view of the protocols and their actions the mrepo offers,
     each joining the package's mounting (`protocol.js`: URIs, states)
     with the module method's README (`external/<action>/`: body, returns,
     errors).
   - **URI dismantling**: what a (local) URI really points to: its layer,
     the folder or package, a mapping out.
   - **The help flag is a rewrite**: `<protocol> <action> <uri> --help`
     becomes a help command whose input is the original request; answered
     with the request's context (allowed here and now, the draft body
     checked), nothing executed. No header needed.
   Here because the dispatcher brings requests from outside. The modules
   get their `external/`/`internal/` directories as work reaches them
   (done: `mrepo-base-boot`). Third stage, later: AI enhanced help.
9. **Populating `main` and `initialise`**: a type's own actions (its
   package's functions, run as configured), documented in the same shape.
10. A request's own history in its document (step by step), when wanted.
11. **A mini tool for the modules kept here** (`tools/`), no npm run: a
   module added (brought back from its repository, or new) or removed is
   written into `package.json` (workspaces), `package-lock.json` (its
   workspace entry, its link entry) and `node_modules/` (its link); and the
   third-party code nothing here uses any more is pruned from the three
   (worked out with the closure, as the assembler does). Done by hand
   until then (part 26). Here because the swarms bring modules back.
12. Then swarms, nodes, the requests done centralised, the demos; step 3,
   the docs.

On the distant horizon (the human, 2026-11-13; `vision.md`, "Pipelines,
and mycelium as a database server"; a direction, the practicalities not
designed):

13. **The pipeline engine**: processing built from the protocols' core
   actions, each step a request, the pipeline's state its own execute
   branch of `main`, one commit in `main` at its end; execution plans;
   compiled pipelines. Then **mycelium as a database server**, which needs
   it, and **cache management** of replicated stores (a TTL). To take into
   account when earlier items are built: the headers (item 7: the
   pipeline and step identifiers), `base-package-crud` (item 3: the core
   actions), the composite actions (item 2's open list: the pipeline may
   take their place).

## Elsewhere

- **Validation, for autonomy** (step 2, parts 23-25): every package's
  `validate` checks its help (`/test/help`, the README rules) and its code
  (`/test/code`, the code rules); `validate-in-situ` in a running mrepo.
  Run before every commit: `tools/bare tools/help-extract.js` (and
  `--files`), `tools/bare tools/code-check.js`, each package's set from its
  bundle. Run the boot's test several times when the runtime or the
  repository code changed: a race shows one run in a few.
- **Open, p2p-git** (two defects for a process reading a repository
  another process writes; `mycelium-git`'s `listBranches` tolerates both
  meanwhile): a ref is written in place, for an instant unreadable (to be
  written aside and renamed); and its listing of branches returns nothing
  when a branch is removed during its walk of the refs (`readdirDeep`
  fails on the vanished file: to skip it). Request branches, made and
  removed with every request, make the second frequent.
- **Internal requests** (part 24): placed by the mrepo itself, straight to
  the handler into pending (`admit`), no mark: internal is having no
  record in the inbox (`isInternal`); the inbox waits until the mrepo's own
  are done. The runtime's status (operational) starts there.
- **Assembly options per package** (part 24): `assemble.omit` in a
  package's `package.json`, a default in the root; try and see, its
  `validate` the proof.
- **`mrepo-base-help`**: built (step 2, part 24): the help protocol, the
  extraction, the validation; documentation packages marked `docs`.
- **The local agent** builds and tests on the human's machine
  (`prompt-local.md`, `handover-local.md`, its notes in `local-note.md`,
  its record in `local-run.md`). What it runs changed with part 37: there
  is no executable and no `tools/haicc-try.sh` any more. The sources are
  built with `tools/bare tools/release.js`, and the whole flow is tried
  with `sh haiccing/base-linux-haicc/test/run.sh` (`--keep` to inspect).
  Its prompt and handover are rewritten for it (2026-11-13).
- **The seed `dev-env-3-mrepo-native`** is on `splectrum/roadmap-1`
  (`seeds/dev-env-3-mrepo-native/`, a copy in `seed-dev-env-3-mrepo-native/`
  here): the mrepo framework on native git, standalone. Its repository,
  `splectrum/dev-env-3-mrepo-native`, to be created by the human. Its
  request's step 2 (the storage setting, the opener) and the boxes as
  layers are already built here (part 7 on): open whether to update the
  seed to say so (one commit to `roadmap-1`).
- `pear-full-square/mrepo-base-log` (created empty by the human): dropped,
  to be archived by the human.
- The product repositories of removed modules (`mycelium-repo`,
  `haicc-reconcile`, `p2p-swarm-manager`) are archived.
