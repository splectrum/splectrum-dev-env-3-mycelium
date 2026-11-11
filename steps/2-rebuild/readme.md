# Step 2. The rebuild

Request: `c0e14a4:pending/phase-3/step-2-rebuild/request.md` on
`pending/default`. Design: `docs/design/`. Collaborative: decided with the
human as it moves along. The thin path first: (1) boot creates the
repository; (2) the functional framework added (the mycelium bundle); (3)
`mycelium-repo-main` started; (4) the inbox and outbox, a minimal
dispatcher; (5) requests flowing, demo functionality, `haicc request add`.
Then `main` populated and the warm boot (repository functionality); swarms,
nodes, centralised logs, the demos.

## 1. Boot creates the repository: done

(the first release, `setup-a6d039296165`, published and checked by local:
`local-run.md`)

**The bundle release** (2026-11-09):

- `haicc-base-boot` reset (the old module and `haiccing/base-package-haicc`'s
  hand-written parts removed; their product repositories renamed and
  archived by the human, new ones created): a new module, `index.js` (the
  commands, a library) and `haicc.js` (the command line, the package's
  entry); `version` for now; its tests 6 of 6.
- `packages.json`: the `haicc` package its module and its entry point
  (`entries`); no pair (`together` gone).
- The package writer (`tools/package-writer/bundle.js`): a package with
  entries is written as its release: `<repo>.bundle` (the full package: the
  closure of its entry by `bare-pack`, the Bare resolver, paths
  canonicalised, the package's other files as files), `addons/<sha256>`
  beside it (offloaded; named `/../addons/<sha256>`), `manifest.json`.
  `bare-pack` 3.0.2 a dependency of this repository (the development side).
  The writer's tests 3 of 3 (a release written and run).
- `base-package-haicc`'s release: a 374 KB bundle (107 files: the code
  reached from the entry, the package's README, LICENSE, its module's tests,
  its named tests and sets), 12 addons; `bare base-package-haicc.bundle
  version` answers here and in the node image with only Bare and the release
  folder (read-only).

**The cold boot release, manifest loading, bundle loading** (2026-11-09):

- Two packages, two concerns: `boot` (`base-package-boot`: the cold boot,
  module `haicc-base-boot`, its release the setup) and `haicc`
  (`base-package-haicc`: HAICC's commands, a new module `haicc-base-cli`,
  `version` for now), each one bundle; `base-package-haicc` travels inside
  the setup, no release of its own yet.
- Sources and signing in the package manager (`lib/sources.js`,
  `lib/sign.js`): a source a folder or the web (`curl`), laid out flat
  (`manifest.json`, `<repo>.bundle`, `addons/<sha256>`); the newest manifest
  its publisher signed (ed25519, sodium; the canonical form), never older
  than the one pinned; a package's bundle and missing addons, each checked
  by hash, from the first source that matches. Tests 17 of the module's 64.
- The writer: the bundle's `id` (`bare-bundle-id`) in its header; the
  released packages written together as a source (`<out>/source/`), one
  manifest (sequence, commit, runtime, per package its id, hash, bytes,
  main, commit, addons), signed with the publisher's key (`--sign-key=<file>`,
  never an argument, never printed). Rebuilt identically from the same
  content (`09cc2053…` twice).
- The cold boot (`haicc-base-boot`): `boot --work=<folder>`: the machine
  checked, the manifest loaded from the sources (the setup's own folder
  first, then `boot.json`'s), checked and pinned (`<work>/manifest.json`),
  `base-package-haicc` loaded lazily into the scope and run once; `fetch
  <package>` later, from the pinned manifest. Tests 12 of 12.
- The setup (`tools/setup/`): the signed source, Bare (stripped) and
  `boot.json` (the publisher's public key, the other sources), packed behind
  a shell header that unpacks into `<work>/setup`, checks the boot bundle's
  hash and hands over to the boot. 24 MB.
- End to end, a fresh folder, only the system's tools on the PATH: `sh
  haicc-setup.sh <work>`: machine, manifest (signature checked, pinned),
  `base-package-haicc` and its 12 addons loaded, HAICC answering
  (`haicc-base-cli 0.1.0`). The publisher's key for the test generated in
  the scratch folder; local holds the real one, never in a repository.

**init: the level's repository** (2026-11-09):

- The cold boot creates the level: the store (`<work>/store`, `p2p-store`)
  and the repository (`level`, `p2p-mrepo`), its layers `main` (empty),
  `packages/default`, `execute/main` (from `main`),
  `request/pending/default`, `request/executing`, `request/done`;
  `packages/default` laid out as a source (the pinned manifest, the boot's
  and HAICC's bundles, their addons): a repository's packages layer is
  itself a source. HAICC's package deployed into the scope from the layer.
  A level already booted is not booted again (a restore later); `fetch`
  adds a package to the layer and the scope, the pin untouched. Tests 25 of
  25.
- `mycelium-git`: `request` and `packages` layer segments (`pending` and
  `capability` until the code using them is rebuilt); its tests 341 of 341.
  `p2p-store`: a read-only store (no lock; a short-lived reader); 20 of 20.
- HAICC's commands (`haicc-base-cli`): `read <uri>`, the level's
  repository read-only by URI (validated at the terminal's boundary): a
  file's size and small text, a folder's or a branch's entries, `*`
  steps; JSON. Tests 14 of 14.
- The writer carries this repository's aliases for Node's built-ins (`util`
  to `bare-node-util`, ...) into every package: third-party code imports
  them by those names, listed nowhere. 33 of 33.
- End to end, a fresh folder, only the system's tools on the PATH: the 29 MB
  setup boots; machine, manifest, both packages loaded (3.4 MB bundles, 25
  addons each), init, installed, deployed; `haicc read /` the branches,
  `/packages/default` the installed source, `/main` empty.

- The level's folder is the repository's root (the human): the layer
  deployed at its own path (`<work>/packages/default/`, not a separate
  scope); the reserved first segments reserved as folder names at the root;
  the substrate in `store/` and `setup/`. HAICC finds its level by walking
  up to `store/`. End to end again: called from `/` by its bundle's path,
  it reads `/packages/default`.

**The layout, the visible proof, the first release round** (2026-11-09):

- The repository mounted at `<work>/haicc/` (the human): one `packages`
  layer (a layer of its own, like `main`), bundles by `[org]/[package]`
  (`haiccing/base-package-boot`, `haiccing/base-package-haicc`), the addons
  store two levels up (`/../../addons/<sha256>`); a source, the packages
  layer and its view one format; the substrate beside the mount point
  (`store/`, `setup/`). Testing as a separate instance with a custom
  `mixed` manifest (design only).
- `haicc status`: the level at a glance (its repository's name, id, key;
  its layers; the pinned manifest; each package installed, deployed or
  not). Tests 21 of 21.
- `tools/setup/keygen.js` (the publisher's key pair) and `tools/publish.sh`
  rewritten for the new release: written, signed, the setup built, checked
  from a fresh folder with Node.js off the PATH (`haicc status`), published
  only with `--push`. Run here without `--push`: the setup checked, the
  tag `setup-a6d039296165`; the bundles identical to the build before
  (reproducible).
- For local: `handover-local.md` (the key, the build and check, publishing
  with the human's word, the check from GitHub, the record).

**Bare only, no Node.js** (2026-11-09, the human):

- `tools/install.sh`: the dependencies from `package-lock.json` without
  Node.js or npm: Bare's runtime ensured by the shell from its pinned
  tarball (`tools/ensure-bare.sh`: `curl`, `sha512sum`, `tar`); Bare,
  with no addon (its core reads the lockfile, embedded in its script),
  lists the packages; the shell fetches each with `curl`, checks its
  sha512, unpacks it; the git dependency at its commit; the 29 workspaces
  linked. From a fresh clone, no Node.js on the PATH: 228 fetched, 21 s;
  the same 258 package paths, versions and links as npm's `node_modules`.
- The recording scripts off Node.js: `steps/record.sh` (JSON checked by
  `tools/json-check.js`, Bare's version in a unit's record),
  `steps/0-setup/modules.sh` (each module's tests run on Bare directly),
  `steps/0-setup/packages.sh`. From the fresh clone, no Node.js: the
  modules' tests 26 passed (6 without tests), the package writer ok.
- The setup without Bare's binary: its shell ensures Bare (the same
  script, inlined), fetched from npm's registry and checked; an air-gapped
  setup carries the tarball (`--with-bare`). Online 7.8 MB, air-gapped
  35 MB; both boot from a fresh folder with no Node.js on the PATH.
- npm is needed only to change the dependencies. `docs/rules.md` 27,
  `docs/design/packages.md`, `structure.md`, the guides, the handover and
  the prompt updated.

## 2. The functional framework: done (2026-11-09)

- A new module, `mycelium-repo-main` (`index.js` the library, `main.js`
  the command line; `version` for now), packaged as
  `haiccing/base-package-mycelium` (to be reset on GitHub before it is
  published: the old code-only package is there still).
- The boot installs the boot's, HAICC's and mycelium's packages into
  `packages`, and deploys HAICC's and mycelium's into the view; the boot's
  own is installed only. Tests 28 of 28.
- `tools/publish.sh` writes the three. Run without `--push`: the setup
  7.9 MB, Bare fetched at setup; `haicc status` three packages, two
  deployed; the framework's bundle answering from its place
  (`mycelium-repo-main 0.1.0`). The tag it would publish:
  `setup-3a5c9a551c31`.

## 3. The main thread: done (2026-11-09)

- `mycelium-repo-main` runs the level's main thread: it opens the store as
  its single writer, serves `<work>/main.sock` (owner only, JSON lines;
  `status`, `stop`), logs to `<work>/log/main.log`, stops on `stop`,
  SIGTERM or SIGINT. `start` launches it detached and waits for its answer;
  `ask` talks to it.
- The boot starts it after closing its own store; HAICC gets `start`,
  `stop`, and `status` shows it (asked through the socket).
- Found: `bare-subprocess` ends its own children when its process ends,
  detached or not; main is started through the shell (`sh -c '… &'`, with
  `setsid` where there is one), so it outlives the boot.
- Tests: boot 28, HAICC 21, main 18 (a second writer refused, a read-only
  reader meanwhile, the store writable again after stop). `tools/publish.sh`
  without `--push`: the boot's step `main` running, `haicc status` main
  running, `haicc stop` stopped it, no process left. The tag it would
  publish: `setup-f3062550a1b6`.

## 4. The boxes and the local dispatcher: done (2026-11-09)

Discussed first (recorded in `docs/design/repositories.md`): layers by their
writes (atomic or not, visible or local: only atomic layers through the main
thread, the disk layers taking parallel writers); the boxes placed (a
repository a file inbox; a level a file outbox, an outbox and an inbox
topic, followed or announced between levels, a local dispatcher); a root set
by a validation boundary (outside input entering the host's repository); a
crossing a mapping; a repository's URIs its own.

- Two new modules, agreed in `values.md`: `mycelium-value-json` (an
  encoding, a handler) and `mycelium-container-document` (one value per
  file, written under a temporary name then renamed; time-ordered names).
  Their product repositories to be created by the human.
- `mycelium-repo-main`'s `lib/boxes.js` (reworked after a second
  discussion: the host's root is the HAICC repository; posting is
  `PUT /inbox`; folders for now): `/inbox` at `<work>/haicc/inbox/`,
  `/outbox` at `<work>/haicc/outbox/` (`{ to, body }`); the dispatcher PUTs
  a message to `/inbox`, holds any other; the repository takes its inbox in
  (logged `received`; step 5 makes it a request). Run by the main thread
  every 200 ms.
- `haicc put <uri> <json>`: the mapping none -> host, validated at the
  terminal, only `PUT /inbox` allowed; `haicc status` shows the messages
  waiting.
- Tests: value-json 1, container-document 1, main 6 (the boxes, dispatch,
  take-in, the main thread taking a message in), HAICC 5. `tools/publish.sh`
  checks a message taken in; run without `--push`: passed, nothing left
  running. The tag it would publish: `setup-fe821759a88c`.

## 4b. The runtime, the host, its folder: done (2026-11-09)

Discussed first (recorded in `docs/design/`): the REST verbs, in their
meaning, the transport between repositories (requests wrapped, `POST` to an
inbox); HAICC a repository's API, the host's repository of type `haicc`,
instance `host` (it is the host, the node bridgehead); every inbox a
validation point, no command outside; three storage modes (atomic,
replicated, non-atomic); `<work>/mrepos/<name>/`, one Corestore per host;
the mrepo framework, its API a set of protocols (request, execute, log), a
module per protocol, mapped to its layer.

- `mycelium-repo-main` renamed `mrepo-base-runtime` (`runtime.js` its
  command line; `<work>/runtime.sock`, `<work>/log/runtime.log`); its
  package `haiccing/base-package-mrepo` (was `-mycelium`). Their product
  and release repositories renamed or created by the human
  (`mycelium-repo-main`, `-request-submit`, `-request-execute` renamed to
  `mrepo-base-runtime`, `-request`, `-execute`; `mrepo-base-log` created;
  `base-package-mycelium` renamed to `base-package-mrepo`).
- The host's repository `host` (was `level`); its folder
  `<work>/mrepos/host/` (was `<work>/haicc/`): `inbox/`, `outbox/`,
  `packages/`.
- `haicc post /inbox <json>` (was `put`); `haicc status` shows `host` and
  `runtime`.
- Tests: runtime 6, HAICC 5, boot 2 files (all pass), package writer 3
  files. `tools/publish.sh` without `--push`: passed, nothing left running.
  The tag it would publish: `setup-405b3456017f`.

## 5. Requests flowing: done (2026-11-10)

Discussed first (recorded in `docs/design/repositories.md`): protocols (a
protocol gives an API's actions their meaning); the external API's `rest`
(get, put, post, delete; no update: a put at a deeper URI) and `service`
(boot/teardown, initialise/shutdown, start/stop, pause/resume, run; the cold
boot is `boot`, the warm boot `initialise`); a request fully qualified,
`{ api, protocol, action, uri, body }`; every message a Kafka record (the
base: topic, timestamp, headers, value); a repository's type a package, its
API data, extracted by `initialise`; the runtime protocol and its atomic
`runtime` layer; the service state gating the API; the request and execute
protocols meeting in data (`request/pending` -> `request/execute` ->
`request/done`; execution branches merged back into their own targets).

- New modules: `mrepo-base-request` (the records, the boxes, the local
  dispatcher, the request protocol) and `mrepo-base-execute` (the execute
  protocol, the framework's generic actions); `mrepo-base-runtime` fires
  them by one poller, and ends once the service is shut down.
- `mycelium-git`: the `runtime` layer (on its own, like `main`).
- `haiccing/base-package-haicc/api.json`: HAICC's API, the type `haicc`.
- The boot: layers `main`, `packages`, `runtime`, `request/pending/default`,
  `request/execute`, `request/done`; `/runtime/service.json` booted, of
  type `haicc`; preloaded with `service initialise /`.
- `haicc [protocol] <action> <uri> [body]`: every command a request posted
  to the inbox, the runtime started when not running, the answer printed.
- Found: the service state gates a request as it executes, not at the inbox
  (a `start` queued behind the preloaded `initialise` was refused at
  first); a module's tests run inside its packages too (a test fixture
  reading the development tree failed there).
- Tests: request 6, execute 1, runtime 4 (the whole cycle among them), HAICC
  4, boot 2 files: all pass. `tools/publish.sh` without `--push`: the
  cycle through the real bundles (start, put, get, get /, stop, shutdown,
  the runtime ending), nothing left running. The tag it would publish:
  `setup-9ab0fcc85e2c`.

## 6. One repository over two stores: done (2026-11-10)

The keystone the design had agreed but not built (found asking why the
request layers were in the Corestore): a repository's layers stored by
their writes.

- `mycelium-git`: `mixedBackend` (the backend contract over two backends,
  routed by layer: `isLocal`, `request/*` and `execute/*` on disk) and its
  tests (its own, and the whole backend contract on it: 23 tests).
- `p2p-mrepo`: `local`, a folder for the repositories' disk sides
  (`<local>/<name>/.git`, the same engine on the filesystem); the boot, the
  runtime and the tests open `host` with `<work>/mrepos`.
- The cycle test checks where each layer lives: in the store `main`,
  `packages`, `runtime`; on disk the request layers and the execution
  branches.
- Tests: mycelium-git 114, p2p-mrepo 28, the mrepo modules, HAICC and the
  boot: all pass. `tools/publish.sh` without `--push`: the cycle through the
  real bundles, `mrepos/host/.git` beside the boxes and packages, nothing
  left running. The tag it would publish: `setup-c06d0725ddde`.

## 7. The boxes as layers; a repository on native git: done (2026-11-10)

Discussed first: the mrepo framework run standalone on an ordinary git
repository (the seed `roadmap-1/seeds/dev-env-3-mrepo-native/`); what it
needs put in place here first, so the modules need no change there. The
boxes as layers, not folders: posting is a commit (`post(message?)`: given a
message it adds it and commits; without one it commits the inbox folder,
the layer's working tree on the p2p host, many adding files, one
committing); taken in by commit; nothing removed.

- `mycelium-git`: the `inbox` and `outbox` layers (non-atomic, on disk).
- `mrepo-base-request`: `post`, the boxes as layers, taking in when the
  `inbox` head moves (records in no request layer, not answered), answers
  committed into `outbox`; `setting(work)` (`<work>/mrepo.json`).
- `mrepo-base-runtime`: its repository opened by the setting (`git`: the
  native backend on `<work>/mrepos/<name>/.git`; `p2p`: as before).
- `haicc-base-cli`: posting by commit on native git, by file on the p2p
  host; the answer read from `outbox`; its work folder found walking up.
- `haicc-base-boot`: the `inbox` and `outbox` layers created.
- Found: on the p2p host's disk side a ref is written in place, so an input
  reading its answer while the runtime writes may find a ref missing for a
  moment (it reads again); the runtime's own "nothing waiting" counted the
  inbox folder's files, which now stay (fixed: the untaken records).
- Tests: the cycle on both storages (p2p and native git), the posting on
  both engines; mycelium-git 114, p2p-mrepo 28, request 8, execute 1,
  runtime 6, HAICC 5, boot 2 files: all pass. `tools/publish.sh` without
  `--push`: passed. The tag it would publish: `setup-45ee667cf93c`.

## 8. Records as an onion: done (2026-11-10)

Discussed first (recorded in `docs/design/repositories.md`): routing by
subscription through a dispatcher, an application of its own with its API
(every party an inbox and an outbox; the terminal a mini mrepo; stray
records returned to the dispatcher); the response not metadata; then the
onion: a pre-filled form in a pre-addressed envelope. Headers left empty
until their use is planned.

- `mrepo-base-request`: `record`, `complete`, `isComplete`; the envelope
  checked at the inbox (addressed to this repository's inbox); each
  hand-over a new envelope around the unchanged core; a refused form
  completed with its error, in `request/done`, sent back; a completed form
  sent back into the outbox when its core names where. The local
  dispatcher removed (the dispatcher application replaces it).
- `mrepo-base-execute`: the form completed with its output (or error); the
  execution's metadata no longer on the record (in the commits).
- `haicc-base-cli`: the core addressed to `/haicc/terminal`, in an envelope
  to `/<name>/inbox`; the completed form printed, a record; exit by output
  or error.
- `haicc-base-boot`: the preloaded `initialise` a core with no topic.
- Tests: request 7, execute 1, runtime 6 (the cycle on both storages, the
  completed form's shape, an envelope for another inbox refused), HAICC 5,
  boot 2 files: all pass. `tools/publish.sh` without `--push`: passed. The
  tag it would publish: `setup-5b8cfbb3e9c8`.

## 9. Log events as records; the journey shown: done (2026-11-10)

- `logRecord(event)` (`mrepo-base-request`), the wrapper helper: a log
  event a record (topic `/log`, value the event). The runtime's log and the
  boot's steps are records; each transfer is logged with the envelope it
  made (received, pending, execute, execute done, done, sent back,
  refused).
- The cycle test prints one request's journey on both storages (the input
  from `inbox`, its log records, the output from `outbox`) and checks it:
  each transfer a new envelope at its new topic, the core's address
  unchanged, the output the last envelope as stored. The release check
  prints the runtime's log.
- Tests: runtime 6, the other suites unchanged: all pass. `tools/publish.sh`
  without `--push`: passed. The tag it would publish: `setup-6c2209bd463e`.

## 10. The key and the order: done (2026-11-10)

- The record gains its `key`: a GUID set by the sender on the core, carried
  by every envelope (`wrap`) and log record (`logRecord`) about it, the
  name of its document in every layer.
- Order by the commit chain: taking in by the `inbox` layer's, the queue by
  the `pending` layer's (`arrived()`, first parent from the first commit;
  within a commit by name), not by names or clocks.
- Found: walking a layer's whole chain on every pass grew slow on native
  git (a `git` process per commit read), and the cycle test timed out
  inside the package writer's run: the order is remembered per layer, only
  the new commits walked when the head moves (the whole chain once after a
  start); the long tests given their own timeouts.
- Tests: the key's shape and its carrying; the order of arrival over the
  names (`zz` posted before `aa`, taken first); the journey with one key
  throughout. All suites pass. `tools/publish.sh` without `--push`:
  passed. The tag it would publish: `setup-eaa6a84f326e`.

## 11. The log, the start: done (2026-11-10)

Discussed first: a level's log a topic, in time segments, held by a
repository by reference; on native git a `log` layer with the log folder as
its working tree; to start, the easiest: a file a request.

- `mycelium-git`: the `log` layer (non-atomic, on disk).
- `mrepo-base-request`: `logTo` (a record appended to its file: a request's
  `<key>.jsonl`, the runtime's `runtime-<start>.jsonl`), `commitLog` (the
  folder's new lines committed into `log`; what the layer holds known again
  after a restart).
- `mrepo-base-runtime`: its events into the log folder, committed after
  each pass in which something happened and at its stop; the plain file log
  only for a runtime failing before its repository is open.
- `haicc-base-boot`: the `log` layer created.
- Tests: the log helper; the runtime's log a file a request and one for the
  runtime; the journey's log file committed into the layer. All suites pass.

Then, asked by the human: no log outside the repository (the boot and a
runtime failing before its repository opens drop their records into its log
folder, the next commit picking them up: `boot-<start>.jsonl`,
`runtime-<start>.jsonl`; `<work>/log/` gone); the command as typed, in the
form (`command`); the tests and the release check waiting for the runtime's
process to end, not only for it to stop answering (it commits its last log
lines and closes its store after; a test deleting its folder too early was
caught by the package writer's run). `tools/publish.sh` without `--push`:
passed, the boot's log file committed into the `log` layer. The tag it
would publish: `setup-3d242717a6a3`.

Next: the log's topics on p2p (time segments, the reference), levels, what
each protocol logs; the terminal as a mini mrepo; the dispatcher.

## 12. No log: a request is its own record (2026-11-10)

Discussed first, after a context reset: logs are a standard part of every
mrepo (not of a level). Then the human: too complicated; log in the request
document and keep the requests done as a topic, then we have all the
information; scrap the log. The cold boot a request too, its completed form
handed into `execute/request/execute`, picked up by the normal flow
(completed: to done; then the next pending, `initialise`). The action run
wrapped in the execution context (read-only to it), which reaches the
runtime's context (for config, not used in the base). For now the end of
execution shown in the terminal, no step by step logging. Runtime errors
into the request they happened to.

- Removed: the `log` layer (`mycelium-git`: no longer a layer, not on
  disk), the log folder, `logTo`, `commitLog`, `logRecord`, `say` (the
  runtime's, the protocols', the boot's); `mrepo-base-log` dropped (never
  built; its product repository to be archived by the human).
- `mrepo-base-execute`: the action runs inside the execution context,
  frozen, `exec.runtime` the runtime's context read-only (its name, its
  branches, reads; no writer); actions take `(exec, form)`. `executed(ctx,
  name, record)`: a form completed elsewhere handed over as execute hands
  one. `failed(ctx, why)`: a runtime's error completing the request
  executing.
- `mrepo-base-request`: a record failing to be taken in, refused with the
  error (`runtime: <message>`).
- `mrepo-base-runtime`: a pass failing, its error in the request executing;
  stderr only when none is executing, the error cannot be recorded, or the
  runtime cannot start.
- `haicc-base-boot`: the boot is a request, `service boot /` with the
  command as typed; its form completed with what it did (or the error) and
  handed over before the runtime starts; prints that one record. `fetch`
  prints its completed form too (made there, not a request in the
  repository).
- Tests: the execution context, `executed`, `failed`; the boot's request
  handed over; the journey shown as input, done, output. All suites pass
  (mycelium-git, p2p-mrepo, request, execute 4, runtime 6, HAICC 5, boot
  2). `tools/publish.sh` without `--push`: passed, the requests done printed
  in order (boot, initialise, the cycle). The tag it would publish:
  `setup-a4afcd4cfbea`.

Next: the terminal as a mini mrepo; the dispatcher.

## 13. Packages from scratch: the design (agreed, 2026-11-10)

Found first: the package repositories in `haiccing` no longer written since
step 2 began (`tools/publish.sh` releases a setup only), against the docs
(`packages.md`, `releases.md`, `structure.md`); the boot's shell outside
its package (`tools/setup/`); no `haiccing/base-package-boot/` here. The
human: start the package structure again from scratch, and build it up.
Agreed so far (`docs/design/packages.md`, "What a package is", "Installing
an mrepo from its structure"): a package depends only on packages; a
recursive structure unit (`boot.js`, `mrepo/`, `test/`, further units by
URI part name; `modules/` once at the package's top); `mrepo/` laid out by
layers, a `layer.json` at each leaf, committed; the install an overlay
(common, then the type's) into `<work>/mrepos/<name>/`, built in place,
then cleaned up.

Then (`packages.md`, "The boot mrepo: the root"): the boot an mrepo, the
root, never torn down; `boot` and `teardown` executed by the parent; the
install routine the framework's (no `boot.js` per unit); the boot's release
its bundle, carrying the boot mrepo prebuilt, run with Bare.

Next (the plan in `handover-next.md`): with the existing tools, a boot repo
built that can be bundled; the boot's bundle; then the other bundles, and
the package repositories written again.

## 14. The boot mrepo, operational (2026-11-10)

The human: create an operational boot mini mrepo in the boot package,
developed as a folder, made into a standalone git that runs on our p2p-git
hybrid with all layers on disk.

- `haiccing/base-package-boot/mrepo/`: the boot mrepo's structure, by
  layers, a `layer.json` at each leaf (`{ mode, description }`): `main`,
  `runtime` (`service.json`: type `boot`, already initialised, its API
  `api.json` there: no packages layer, the boot's code is its bundle),
  `inbox`, `outbox`, `request/pending/default` (preloaded: `service start
  /`), `request/execute`, `request/done`.
- `mrepo-base-runtime`'s `lib/build.js`: the folder written as a standalone
  repository (p2p-git on `bare-fs`, one orphan branch a leaf, a fixed time:
  the same commits every build); the setting `filesystem` (`<work>/mrepo.json`).
- The runtime's `filesystem` storage (not `disk`: the Corestore is on disk too): p2p-git on the filesystem, every layer there, no
  Corestore; the inbox folder posted as on the p2p host.
- `layer.json` committed with its layer, never one of its records
  (`mrepo-base-request`: `layer().list`, the arrivals, the inbox folder).
- Tested (`mrepo-base-runtime/test/build.test.js`): built twice, the same
  commits; run, the preloaded start done, requests answered, its API held,
  stopped. Every affected module's tests pass.

Then the package whole (the human: modules, test, package.json, to be
bundled with the boot mrepo inside; what is on GitHub replaced):
`haiccing/base-package-boot/` holds `mrepo/`, `run.js` (the entry: `bare
run.js --work=<folder>`, built the first time with a fixed time, then
run in its process), `package.json` (its `modules`: what it starts from),
`test/` (the boot run as a process: built, answering, stopped, run again),
`README.md`, `LICENSE`, and `modules/`, assembled by
`tools/package-assemble.js` (the package writer's closure: ours copied
whole, committed here; the third-party code in `modules/node_modules/`,
ignored here, recorded in `modules/third-party.json`). Tested from a copy
outside this repository: only Bare needed.

The test folder (the human): a folder a test, each a structure unit as
the package is, here only an entry: `test/boot/run.js` (and its
`boot.test.js`). The entry named `run.js`, the package's too. The sets (the human): a
JSON file each, `{ description, tests }`, `validate.json` (the deployment
checked) and `full.json` (all); `test/run.js` runs one, `validate` by
default, each test its own process (every unit's entry its `run.js`).

The package structure documented outside this repository (the human):
`haiccing/package-docs-template` (created by the human; its description
short: "The haiccing package structure, documented."), written from
`haiccing/package-docs-template/` here: a README at each level (`mrepo/`,
`test/`, `test/<name>/`, a further unit, `modules/`), example files
(`layer.json`, the sets), the rules; no other package named: `example/`, a whole package in the same structure (the human). Then (the human): a structure unit is what its
parts make it, each optional (`run.js` executable, `modules/` its own
dependencies at any level, `mrepo/` an mrepo); `test/` and `example/`
collections, a unit a folder, not units themselves (`example/hello/`).
Only what is agreed. In a real package no README inside a layer (it would
be committed into it): `layer.json` says what the layer is for.

Next: `service boot /host` (the boot's action: the host installed from
the mrepo and haicc bundles and linked into `main`); then the boot's
bundle.

## 15. Packages, sourcing and protocols: discussed (2026-11-11)

With the human, for the boot's bundle:

- **The bundle call unpacks and starts**: `bare base-package-boot.bundle`
  builds the boot mrepo and starts its runtime as its own process from the
  package in the repository (`packages/`), then exits.
- **The `packages` leaf lists what to put in place**, hard links from a
  store (`<work>/packages/`), as before (`bare.md`); the boot mrepo needs
  only the common package, `base-package-mrepo` (not the boot's own).
  Sourcing: an ordered list, `github haiccing` the default, a local
  `folder` given (`--sources=`), each bundle checked against the signed
  manifest. Open: whether the layer commits the bytes or the list and
  hashes only; on GitHub, release assets or files.
- **Protocols configured, a layer of their own** (`repositories.md`, "The
  external API"): every mrepo has `boot` (`deploy`, `teardown`) and
  `service`; an application adds its own; global at the layer's root,
  local later shadowing `main`, adding to those above, a same-named one
  overriding.
- **The mrepo structure documented** outside this repository:
  `haiccing/package-docs-mrepo` (created by the human), written from
  `haiccing/package-docs-mrepo/` here: a folder a layer, its README what
  the layer holds; the top README the modes, the storage, a request, the
  install. Descriptions (the human): lead with the type of package, so the
  right one is found in the organisation's list ("Docs package: ..."). Then
  (the human): the layers inside `mrepo/`, documentation in place, not a
  definition (no `layer.json`); siblings later (`example/` with actual
  configs, compliance tests).

## 16. The boot's prerequisites: built (2026-11-11)

- `mrepo-base-runtime`'s `lib/prerequisites.js`: the checks (`platform`,
  `work`, `sources`, `bare`, `docker`), each with a condition
  (`not-in-container`), a fix only with a yes; Bare put in place from the
  sources (a folder, or npm's registry), its tarball checked by sha512,
  unpacked in Bare (`bare-zlib` added; npm drops the exec bit: set).
- `base-package-boot`: `prerequisites.json` (platform, work, sources,
  Bare), `bare.json` (the pinned Bare: the repository's for now; at the
  standalone build, the one built in), `run.js` checking them first
  (`--sources=` repeatable, replacing the default `github:haiccing`;
  `--yes`; asked on a terminal); one missing: exit 3, nothing written.
- Tested: the module (Bare put in place from a folder source, refused
  without a yes, a wrong pin refused; Docker: missing here, "running", the
  CLI without a daemon); the package (a source missing, Bare without a
  yes: exit 3, nothing written; with: put in place, the boot runs).
  Direct HTTPS from Bare fails in this container (its proxy's
  certificate): sourcing over the network not tried here.

The local source (the human): `sources/` at the root, gitignored, by
organisation: `haiccing/` (the packages as Bare bundles, their manifest),
`holepunchto/` (the pinned Bare's tarball: the boot finds it there),
`addons/` (by hash, shared, where a bundle at `<org>/` looks for them).
Used as `--sources=folder:sources`.

The invocation a request (the human): `run.js` makes the record first
(`boot deploy /boot`, the command as typed, a GUID), logs each step's
outcome in it (`output.outcomes`: the prerequisites with their results,
built or already there), and once the boot mrepo is in place puts it,
completed, into its `request/execute` (through `execute/request/execute`,
as the execute protocol hands one over) before starting the runtime: the
runtime moves it to `request/done` first, then runs the preloaded start.
A prerequisite missing: no mrepo, the completed record printed, exit 3.
Tested: the history's order, a deploy a run, the outcomes logged.

## 17. Cleanup: what the reset deprecates (2026-11-11)

The human: remove from this repository what relates to the work now and is
deprecated, keep what is reused or not related yet; an ongoing process as
the reset proceeds; the human archives the deprecated repositories.

Removed: `pear-full-square/haicc-base-boot` (phase 2's boot; its product
repository to archive), `tools/setup/` (the setup builder; `keygen.js`
kept, now `tools/keygen.js`), `tools/publish.sh` (the release),
`tools/package-writer` (`tools/package-assemble.js` takes the workspaces
itself), `packages.json`, `docs/design/releases.md`, the guides
`install.md`, `packages.md`, `release.md`. Fixed what pointed at them
(`packages.md`'s phase 2 sections removed, `structure.md` marked,
`haiccing/README.md`, the docs' index, the handover). Kept: `tools/install.sh`
and `ensure-bare.sh` (this repository's install without npm),
`pkgm-base-manager` (its closure, tree and signing used), the swarm,
Splectral and phase 2 HAICC parts (not related yet). Every affected
module's tests and the boot's `validate` pass.

The boot protocol's module (the human created it):
`pear-full-square/mrepo-base-boot`, the code moved there from
`mrepo-base-runtime` (`lib/build.js`, `lib/prerequisites.js` and their
tests); its index exports them; the actions (deploy, teardown, redeploy),
the overlay and the clean-up to come. `base-package-boot` starts from it
and the runtime (`modules`), `run.js` imports it. Its tests (5), the
runtime's (6) and the boot's `validate` pass.

The boot protocol's actions (the human: `protocol.js` added to the package
on its own; wiring into the runtime later): `mrepo-base-boot`'s
`lib/deploy.js`, `deploy` (the child's definition, `/main/<name>/mrepo/` in
the parent, built into `<work>/mrepos/<name>/`, linked into the parent's
`main` as `/main/<name>.json`), `teardown` (removed, unlinked), `redeploy`
(both, in one execution: `deploy` skips its "deployed already" check
there, reads not yet seeing the queued removal); `build` takes `setting:
false` for a child (the work folder's `mrepo.json` is the parent's).
`base-package-boot/protocol.js`: the configs (`protocols.boot`: actions,
URIs, states, package) and the actions. Tested (`deploy.test.js`). Open:
the runtime's context gives no `work` yet (`exec.runtime.work`); one
setting a work folder, so one mrepo run a work folder: each mrepo its own
setting (`<work>/mrepos/<name>/mrepo.json`?), to settle.

Then (the human): `redeploy` commits its teardown before deploying, and
an action can roll back. `mrepo-base-execute`: `exec.commit()` (a
checkpoint, later reads see it), `exec.rollback()` (back to the start),
a failure rolling back the same way, merged once at the end; the context
gives the work folder. `redeploy` = teardown, `exec.commit()`, deploy (no
skipped check). Tested (execute: a checkpoint seen, undone by a failure
and by a rollback). Open: a rollback covers the repository only, not what
an action did outside it (teardown's folder removed).

Then the commit model (the human): two contexts. Local, the action's:
`exec.commit()`, `exec.discard()` (the uncommitted writes),
`exec.rollback()` (the last local commit), `exec.reset()`
(all of it, back to the start), for building up changes and handling
errors; the action goes on. Global, the runtime's, never the action's: the
merge back at the end of the invoked action, a failure resetting. Tested.
Still open: what an action does outside the repository (teardown's folder)
is not undone by a reset.

## 18. The runtime as a package, as a bundle (2026-11-11)

The human: the runtime its own package, built as a Bare bundle, to test up
to the runtime's instantiation. `haiccing/base-package-runtime/`: `run.js`
(the runtime's process: `bare base-package-runtime.bundle --work=<folder>`),
`package.json` (from `mrepo-base-runtime`), `test/` (`start`: an mrepo on
the filesystem written for it, the runtime started, answering, stopped;
`RUNTIME=<bundle>` tests a bundle instead), `modules/` assembled.
`tools/package-bundle.js`: a package as a Bare bundle into `sources/`
(`<org>/<repo>.bundle`, its addons offloaded to `addons/<sha256>`, its entry
in `<org>/manifest.json`: id, sha256, size, main, addons, commit, Bare;
unsigned for now), from the release writer phase 2 had. The runtime's
bundle: 3.5 MB, 25 addons; its test passes from the folder and from the
bundle; from a store layout (`<work>/packages/haiccing/`, `addons/` two up)
on the Bare unpacked from `sources/holepunchto/`, it loads, its addons
included.

## 19. The boot's release, up to the runtime's start (2026-11-11)

The human: the base-package-boot release, not starting the runtime, for a
local test. `mrepo-base-boot`'s `lib/packages.js` (`place`: sourced,
checked, into the store, hard linked, the list and hashes committed); the
boot mrepo's `packages` leaf lists `haiccing/base-package-runtime`;
`run.js`: prerequisites, built, packages in place, its request into
`request/execute`, printed with `next` (the runtime's command), exit;
the mrepo from the embedded `mrepo-files.js` in the release.
`tools/boot-release.js` (`release/`, gitignored): the Bare built into a
standalone (asked of a probe: 1.35.0 with `bare-build` 1.6.2), its tarball
fetched and pinned; the runtime's bundle into `release/sources/`; the boot
package staged (its mrepo embedded, its `bare.json` the built-in Bare) and
built standalone (118 MB). `bare-build` 1.6.2 a dev dependency. Tested:
the package's test (prerequisites; put in place; the runtime started from
`next`, the history deploy then start; run again: already built, nothing
committed); the release from outside the repository, a clean environment:
in place, the runtime started from `next` on Bare 1.35.0, stopped.

Found: a standalone executable's arguments start right after it (no
script): `run.js` took the first for the script and fell back to the
current folder, `/`, and wrote its mrepo there; fixed (the arguments by
whether a script is there), and the work folder may not be the
filesystem's root (a prerequisite). Its leftovers at `/` in this container
(`/bare`, `/mrepos`, `/packages`, `/mrepo.json`) could not be removed by me
(a safety check).

Then (the human): no GitHub release for now; the release built and kept
in the local sources, its prerequisites there too, for a test from the
command line. `tools/boot-release.js` builds into `sources/`: the
release `sources/haiccing/base-package-boot-linux-x64` (with its `.json`),
the runtime's bundle, the addons, and Bare's tarball (the built-in
version) under `holepunchto/`, fetched with curl (no npm). Run from the
repository's folder: `sources/haiccing/base-package-boot-linux-x64
--work=<folder> --sources=folder:sources --yes`. The local agent's prompt
(`prompt-local.md`) rewritten for it: update, install, build, check once,
report; nothing published.

The human's try (the human): `tools/haicc-try.sh`, copied to `~` by the
local agent: the release run from `~`, its work folder `~/haicc-try`
(its record kept as `boot-output.json`), a pause to inspect (`press any
key to clean up`), then removed (also on Ctrl-C). Found on the way: the
script reported `tee`'s exit code, not the boot's (fixed); the boot's
question went to stdout, the record's stream (now stderr); the boot did not
end after a terminal answer, its input kept it alive (released, and the
boot ends explicitly when done). Tried under a pseudo-terminal: asked,
answered, inspected, cleaned up.

## 20. Deploy starts the child's runtime (2026-11-11)

The human: each package hard linked individually (the mrepo runs only what
is registered for it); deploy does the linking always (cheap, at deploy
only) and ends with the child's runtime started, from its own `packages/`,
by its directory. The runtime addressed by an mrepo's directory
(`mrepo-base-runtime`: `run`/`ask`/`start`/`open` take `{ repo }`; its socket
in the directory; `inboxFolder(work, name)` in `mrepo-base-request`);
`base-package-runtime`'s entry takes the directory. `mrepo-base-boot`:
`deploy` puts the child's packages in place (from the store, else the
sources the parent's packages layer records) and starts its runtime;
`teardown` stops it (until its process has ended) before removing it.
The boot's `next`: `bare <boot>/packages/haiccing/base-package-runtime.bundle
<boot>`. Tested: a child deployed with the real runtime bundle, its inbox
answering, torn down; the packages' tests; the release rebuilt and tried.

## 21. Toward `boot deploy /host` in the boot mrepo (2026-11-11)

The human: the boot mrepo has no `service` (the runtime and `boot` only),
its preloaded request `boot deploy /host` with the target package; the
target's `mrepo/packages/layer.json` the ordered list; children inside their
parent (`boot/main/host/`); forward-only URIs, outside through a mapping.
Built so far:

- A package bundle's main is its dispatcher (`main.js`, written by
  `tools/package-bundle.js`): run as the program, `run`/`deploy`/`protocol`
  offered on import (a bundle loads only through its main; once loaded, its
  modules import by path: tried). The manifest records each bundle's entry
  points; `place()` carries them into the packages layer.
- No gate without `service` (`mrepo-base-request`'s `check`); the runtime
  ends by itself only with a `service` (unchanged).
- The runtime loads the protocols its linked packages offer
  (`protocolsOf`: each package with a `protocol` entry, imported from the
  mrepo's `packages/`), beside the framework's actions.
- The runtime works from its mrepo's own directory (`dir`: its `.git`, its
  inbox folder, its packages; `exec.runtime.dir`), not from a work folder's
  layout.

Then, built: `base-package-runtime/mrepo/` (the runtime's part: `main`,
`runtime`, the boxes, the request layers, `packages` listing the runtime);
the boot mrepo's first-boot structure (no `service`, `packages` the runtime
and boot, the preloaded `boot deploy /host` with the runtime as target);
`mrepo-base-boot`: `fetch`, `structureOf` (a package's `mrepo/` from its
bundle), `place({ dir, store, ... })` (its manifest records the store and
the sources: the mapping); `deploy` from the target's list, the child built
inside its parent (`build({ dir })`), its record at the node, its runtime
started; the release bundles the boot package too. Found: a Unix socket's
path is limited (about 107 bytes), nested children exceed it: a short path
in the temporary folder, by the directory's hash, when too long; the
runtime-only child needs `main` (the execute protocol works through it):
in the runtime's structure. Tested: the deploy (a target's list, the order,
redeploy, teardown; the real runtime started, its inbox answering, stopped);
the boot package (its runtime started from `next`: the host deployed inside
it, running; the history the boot's deploy then the host's); the release
standalone, end to end.

The first-time boot starts the runtime (the human): after its request is
handed over, the boot starts the boot mrepo's runtime from its own
`packages/`, on the Bare put in place, as its own process, and prints its
status; the runtime then deploys the host. `~/haicc-try.sh` shows the boot
mrepo, the host inside it and both runtimes, and stops them (SIGTERM,
waited for) before cleaning up; the local agent's check stops them too.
Tested: the boot package (the runtime started by the boot, the host
deployed, both stopped; run again: its runtime again, the second deploy
done, the host's not repeated); the release through the try script.

The local agent's note (`local-note.md`): the release built and tested
locally, offline; five proposals with a patch, applied here (two conflicts
resolved, keeping both sides): `tools/install.sh` (the lockfile written to
a file, it no longer fits one argument; `bare-build` for this platform only;
`node_modules/.bin` linked), `tools/boot-release.js` (`bare-build` run on
Bare), and the human's decision: the boot first uses an installed Bare at
the pinned major, the same version or newer, recorded in `<work>/bare.json`
(`acceptable`). Its new test adapted (the runtime now started by the boot:
stopped at the end, the boot's before the host's, its stop waiting for a
deploy in progress). Tested: `mrepo-base-boot` 8/8; the boot package 3/3,
nothing left running; the release through the try script.

The boxes' folders (the human): a working folder only where the
filesystem is a way in or out; writing makes the path; the inbox folder
committed then the layer's head watched; the outbox folder made at build
(watchable from the start) and written after each commit (built: `build`,
`outboxOf` in `mrepo-base-request`); a subscription pulled by the inbox's
owner; a child in view written to directly by its parent, its outbox
followed by it (`repositories.md`, "The boxes' folders"). Tested.

Logs and the terminal (the human): a log function with levels (`error`,
`warn`, `info`, `debug`; threshold `info` by default, an mrepo's in
`/runtime/log.json`): `exec.log` in the execution context, `log` in the
boot (its steps now entries in its request's `log`, `--level`); its entries
in the request's own record. `follow` prints each record as it moves
through the request layers of an mrepo and its children in view, one
compact line a record, its topic the full path; the boot follows after
starting its runtime (on a terminal, or `--follow`), until Ctrl-C; the try
script runs it so (Ctrl-C ends the following, then the pause and the
cleanup). Tested: the execution's log and levels; the follower (one line a
record, topics from the root); the boot package 3/3; the try script under
a terminal.

`teardown` ends a runtime that will not stop (the human): asked over its
socket, then SIGTERM, then SIGKILL, each waited for until its process has
ended (the pid from its status, else the one recorded at the node), how
logged. Tested with a process that ignores SIGTERM and has no socket.

The local agent's second note (`ca44de2`): the prompt ran as written; its
three findings applied: an installed Bare from npm is a Node.js wrapper,
so the binary it runs is recorded (its patch: `binaryOf`); the packages'
assembled `modules/` copies committed up to date; the runtimes matched as
`[/]bin/bare <folder>/` (in the prompt's step 4 and the try script: the
pattern never matches the caller's own shell). Tested again: the boot
module 8/8, both packages, the try script.

Testing (the human: both needed): a `modules` test in each package
(`test/modules/run.js`: every carried module's own tests, from its folder,
on the package's copies, each its own process; in `full`); the module's
tests made to stand on their own (`mrepo-base-boot`: its own structure for
the build tests, Bare's pin from the running Bare, `SOURCES` for the
runtime deploy); the boot package's test redeploys the host through the
running boot mrepo's inbox (the old runtime stopped, a new one running,
the node's record updated). Both packages' `full` sets pass (12 and 11
modules), nothing left running.

## The product repositories: updated (2026-11-10)

The modules changed in this phase so far, each folder's history split from
`main` (`661b94c`) and merged into its product repository's `main`: the
first merge from this repository (joining the histories), the product's
LICENSE kept, the rest the module as it is here (what phase 2 had and this
phase removed, e.g. `mycelium-git`'s `cli.js`, gone). By
`tools/products.sh <module>...` (new: the rule in `rules.md` as a script).
Removed modules' repositories (`mycelium-repo`, `haicc-reconcile`,
`p2p-swarm-manager`): archived already (checked on GitHub).

| Module (pear-full-square/) | Split | Product's main |
|---|---|---|
| `mycelium-value-json` | `eb04eb4` | `7608f01` |
| `mycelium-container-document` | `235d0cc` | `faadad2` |
| `mrepo-base-runtime` | `00847f8` | `f066ec1` |
| `mrepo-base-request` | `d1ee0c7` | `7c281d7` |
| `mrepo-base-execute` | `485fc8c` | `39d8806` |
| `haicc-base-boot` | `bde5592` | `33bb008` |
| `haicc-base-cli` | `9f12132` | `095c140` |
| `haicc-deployment` | `bed7496` | `341b224` |
| `mycelium-git` | `7685e3c` | `f3ad767` |
| `mycelium-layer` | `74ec4d7` | `184cb8e` |
| `mycelium-uri` | `d58aa72` | `b31a0e6` |
| `mycelium-xpath` | `45a6d17` | `b0d4031` |
| `p2p-mrepo` | `1ce64ad` | `a2db0f8` |
| `p2p-store` | `feaf8f7` | `2e0595f` |
| `pkgm-base-manager` | `c4e51f1` | `9ee176e` |

Next: populate `main` and the warm boot (`initialise`) for the
repository's internal functionality; then swarms, nodes, centralised logs,
the demos.

Not yet: the tests run from the bundle (their third-party code, brittle,
is not reached from the entry); the other packages (`swarm-three-nodes`, the
demos) still defined on the old platform, written with `--only` meanwhile;
`haicc-deployment` still pointing into the old `haicc-base-boot`.
