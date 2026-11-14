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

A test ends by itself (the human, from the local agent's note: the try
script looked hung): `follow`'s `settled()` (nothing pending or executing,
something done); the boot's `--until-done[=<seconds>]` (exit 0 when every
request is done, 4 when not in time); `~/haicc-try.sh` a test: the boot run
until done, what was left shown, the runtimes stopped, the folder removed,
its exit code passed or failed (`--pause` to inspect first); the local
agent's check runs the same test. Tried without a terminal: passed, ended,
nothing left.

The whole lifecycle through requests (the human): the boot package's
integration test, the child the runtime package alone: deployed (the
preloaded request), redeployed, torn down (its runtime ended, its folder
and record gone), deployed again (a new runtime), each a request posted to
the running boot mrepo's inbox. 3/3, 57 asserts, nothing left running.

## 22. The dispatcher, the tests, the runtime protocol (2026-11-11)

The human: the package tests are there to be run as part of a running
mrepo, returning their results; the dispatcher runs every entry by path;
a dry run instead of a list; a `runtime` protocol with `run`; a test
self-contained, a floating instance ("instantiating run() does the whole
lifecycle self-contained returning the result").

- **The dispatcher** (`tools/lib/dispatcher.js`, generated into each
  package as `main.js` and `test/run.js` by assemble and bundle):
  `run(target, { dryRun })`; `/run`, `/protocol`, `/deploy`,
  `/test/<name>`, `/test/modules/<org>/<module>`, `/test/modules` (the
  generic modules test: each carried module's own tests, every package has
  it; `test/modules/` folders removed), `/test/<set>`; `/` lists them (a
  dry run only). A test's result `{ target, ok, units: [{ unit, ok, tests,
  asserts, failures }] }`, each unit its own process.
- **The floating instance**: from a bundle, the package written into a
  temporary folder (its files, its addons back at their prebuilds, its
  module links), the units run there, removed. Not attached to anything.
- **The runtime protocol** (`mrepo-base-runtime/lib/protocol.js`, built
  in): `runtime run /packages/<org>/<package><target>`, body `{ dryRun }`;
  only a linked package; the result the output, a line a unit in the log;
  `/run` refused. `protocolsOf` loads a package's protocols by
  `run('/protocol')`.
- **Docs**: `docs/design/packages.md` (the dispatcher, the floating
  instance), `docs/design/repositories.md` (the runtime protocol),
  `package-docs-template` (`test/README.md` rewritten: targets, sets, the
  generic modules test, the floating instance, running, the result),
  `package-docs-mrepo` (`protocols/`, `packages/`), the packages' and the
  module's READMEs.

Tested: the boot package's integration test posts a dry run of the
runtime package's `full`, a run of its `validate` (passed, in a floating
instance, inside the running boot mrepo) and a refused `/run`. Both
packages' `full` sets from their bundles: passed, nothing left running.

Documentation where it is used (the human: READMEs with the tests, and
cascading links, from the root down): each package's `mrepo/`, `test/`
and each test (`test/boot/`, `test/start/`) has its README; the root links
down to them, each to the folders below. `modules/README.md` is written by
`tools/package-assemble.js` (the folder is rewritten each time), linking
to each of ours. No README inside a layer (it would be committed into it):
`mrepo/`'s covers its layers. The rule in `package-docs-template`; its
example and `package-docs-mrepo` cascade too. Checked by crawling the links
from each root: every folder reached, none broken.

The rule, for every organisation but `splectrum` (the human): in
`rules.md` ("Development and deployment"). Applied to the modules the
packages carry (12): a `lib/README.md` (each file, from its own header)
and a `test/README.md` (how to run, each file and its tests), linked from
the module's README. A test run's Corestore left in `mrepo-base-boot`
(`store/`, committed in part 20, carried into the boot package) removed.
The other modules and organisations' repositories not yet brought to the
rule (not part of this work).

No duplication (the human): a deployment package documents only its own
tests and its own structure; the generic (how tests run, the layers) is in
the documentation packages, said once. The packages' `test/` and `mrepo/`
READMEs and the modules' `test/` READMEs trimmed to that.

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

## 23. Help: the extractor (2026-11-11)

The human: help for the one who uses the mrepos, the AI; first raw
retrieval from the READMEs beside each item, then command help from the
components' summaries, then AI-enhanced. A help layer, every README
extracted into a browsable tree: each package's concern and its
dependencies; the retrieval URIs generated. The extractor in the runtime,
run before the mrepo is operational; the action `runtime help`. The
documentation packages linked like any package.

- **`mrepo-base-runtime/lib/help.js`**: `parse` (title, one-liner: the
  first sentence; summary: up to the first `##`; sections; links),
  `extract` (each README at the URI it documents: a package's under
  `/packages/<org>/<package>/`, a `help` folder's, `package-docs-mrepo`'s
  `mrepo/`, at the root; `/index.json`: each URI's title, one-liner and
  links; `/packages` linked to every package), `extractInto` (at start,
  from the packages manifest and the bundles; committed when changed),
  `help` (`runtime help <uri>`, levels `oneliner`, `summary`, `detail`, a
  section; the nearest URI when none).
- **The `help` layer**: atomic, in both structures; a layer in mycelium-git.
- **Documentation packages**: no entry point; their main runs nothing; no
  structure laid in at deploy (READMEs never are); `package-docs-mrepo`
  and `package-docs-template` bundled and listed in the boot's and the
  runtime's packages.
- **`tools/help-extract.js`**: the same extraction from the bundles into a
  folder (`sources/help/`), with a quality report (`report.json`):
  one-liner, summary length, broken links, cascade, reached, references to
  the transient `docs/`.

First report, the boot mrepo's four packages: 93 READMEs; 33 one-liner
problems (the modules' `test/` READMEs have none; some first sentences
run to 200-490 characters), 23 summaries over 150 words, 22 references to
`docs/design`; links, cascade and reach clean. To evaluate with the human
and set the documentation's rules.

Tested: the extractor's unit tests; the boot's integration test asks the
running boot mrepo for `runtime help` (the root, `/packages`, its own
test's README) and checks the host's help, extracted by its own runtime.
Both packages' `full` sets pass.

The rules settled (the human): in `package-docs-template`, "READMEs": a
one-liner (one sentence, at most 120 characters, no parentheses), a
summary of at most 100 words with the links table, no references to the
development repository, a one-liner everywhere, short stable section
titles (or a file's name). `tools/help-extract.js` checks them, on the
bundles' help tree and, with `--files`, on the source READMEs. All 62
source READMEs and the 94 in the boot mrepo's help brought in line: the
module and package openings rewritten (the old text kept under `Design`,
`Usage`, `Steps`), the folders tables moved into the summaries, stale
statements corrected (the packages layer: no GitHub source, no signed
manifest yet; the runtime: not packaged as `base-package-mrepo`).

Documentation validation (the human: no AI needed for the rules; a test in
the package): the rules and the whole-tree checks in
`mrepo-base-runtime/lib/help.js` (`check`; the extraction writes
`/help/problems.json`); `tools/help-extract.js` uses the same. Every
package carrying the runtime gets two units from its dispatcher, the tests
in `mrepo-base-runtime/validate/`: `/test/help` (its help extracted from
its own files, in a floating instance; in `validate`) and
`/test/help-in-situ` (as a running mrepo's runtime extracted it; the set
`validate-in-situ`, run with `runtime run`, which passes `MREPO` and
`PACKAGE`). The boot's integration test runs both packages'
`validate-in-situ` in the running boot mrepo. Both `full` sets pass.

A directory per method (the human): a module's exported methods, each in
its own directory with its `index.js` and `README.md`, split into
`external/` (protocol actions, `(exec, form)`) and `internal/` (called by
code, never requested; the execute and request engines are internal). A
helper shared by several methods becomes an internal method of its own.
Method READMEs: one-liner, summary, then `Signature`, `Body` (external),
`Returns`, `Errors`, as they apply. Pilot: `mrepo-base-boot` (external:
deploy, teardown, redeploy; internal: build, place, fetch, structure-of,
store-of, put, child, check, parse-source, in-container, bare-of,
acceptable); `lib/` gone, `index.js` exports the same. Its tests unchanged,
9/9; both packages' `full` sets pass; 112 READMEs in the help tree, no
problems.

Only what matters (the human; the AI, the principal user, judges): a
directory only for a documented method; smaller ones live in the method
they belong to ("Also exported"), a helper with nothing to document a
plain file. `mrepo-base-boot`: `external/` deploy, teardown, redeploy;
`internal/` build, place (storeOf), fetch (structureOf, put, parseSource),
check (inContainer, acceptable, bareOf), `child.js`. The rule in
`package-docs-template`, `modules/`, "Methods".

## 24. mrepo-base-help, the help protocol (2026-11-11)

The human: the help code in a module of its own (`pear-full-square/
mrepo-base-help`, created by the human), and help its own protocol rather
than the runtime's. The documentation packages get a dispatcher exposing
their tests.

- **`mrepo-base-help`**: `external/get` (`help get <uri>`, the retrieval),
  `internal/extract` (`extract`, `extractInto`, `parse`, `check`; a
  heading inside a code block is no section), `validate/` (the two tests
  every package carrying it runs on itself), `test/`.
- **The help protocol mounted by `base-package-runtime`**: its new
  `protocol.js` offers `runtime` (run) and `help` (get); its `run.js`
  passes them to the runtime (`run({ own })`), and `protocolsOf` skips its
  bundle, the program already running. The runtime imports only the
  extractor, run before the mrepo is operational.
- **The in-situ test needs no repository access**: `runtime run` hands it
  the mrepo's help as extracted (`HELP`, a file, with `MREPO` and
  `PACKAGE`).
- **Documentation packages** marked `"docs": true` (recorded in the bundle's
  manifest; deploy lays in no structure for them), carrying
  `mrepo-base-help`: a dispatcher, `validate` (`help`) and
  `validate-in-situ` (`help-in-situ`). The template's modules documentation
  moved into its root README ("Modules", "Methods"): a package's
  `modules/README.md` is generated.
- **Aliases carried only when imported** (`tools/package-assemble.js`): the
  Node built-in aliases only when carried third-party code imports them by
  that name. A documentation package: 81 third-party, 26 MB, brittle's
  (the runtime's: 198, 62 MB).

Tested: the module's tests (help 5/5, runtime 6/6, boot 9/9); the
documentation packages' `validate`; the boot's integration test runs all
four packages' `validate-in-situ` in the running boot mrepo (70 asserts);
both `full` sets pass; the help tree, 132 READMEs, no problems.

Assembly options per package (the human: self-contained packages allow
try and see, each package's validate the proof): `assemble` in the root
`package.json` the default, a package's own replacing it; `omit`, third-party
code not carried, nor what only it brings (`closure`'s `omit`, in
`pkgm-base-manager`), recorded in `third-party.json` (`omitted`), a stub
in its place (resolved when the bundle is linked; used, it throws). The
default omits `bare-cov`, brittle's coverage, loaded only on demand, and
with it `bare-inspector`, `bare-ws`, `bare-https`, `bare-tls`,
`bare-crypto`. A documentation package: 63 third-party, 5.7 MB (was 26);
the runtime package 48 MB (was 62); the boot keeps `bare-tls` (its GitHub
source). All sets pass.

Internal requests (the human: validation belongs in the transfer from the
inbox to pending; internal requests submit straight to that handler): one
way into pending, `admit(ctx, core, { origin })` in `mrepo-base-request`,
for the inbox's records and the mrepo's own (`internal(ctx, form)`),
validated by origin; an internal request marked by the handler (the check
then exempts it from the API and the state), one from the inbox claiming
it refused. The inbox never judges: while the mrepo is not operational
(`ctx.intake` false) its records wait. The runtime, as it starts, places
`help extract /` (where it has a help layer), takes the inbox in once its
own requests are done. `help extract` an action of `mrepo-base-help`,
writing the help layer through the execution context (`help` an execution
target where the layer exists, in `mrepo-base-execute`); the runtime keeps
no extraction call. The boot's test: the internal extraction in the boot
mrepo's history, exact counts (71 asserts). All sets pass.

## 25. Code validation; a race found (2026-11-11)

The human: a code quality validation like the documentation's, for the
AI's implementation autonomy.

- **`pkgm-base-check`** (new module; its repository to be created by the
  human): the code rules, `checkModule` and `checkPackage`
  (`internal/rules`), and `validate/code.test.js`, the test every package
  carrying it runs on itself. The rules, mechanical: **structure** (a
  method directory has its `index.js` and `README.md`), **imports** (a
  relative import stays in its module; another of our modules by name,
  never into its files; a test may share another module's test helpers by
  name, `<module>/test/<file>`), **transient** (no references to this
  repository's `docs/`, `steps/`).
- **`/test/code`** in every package's `validate` and `full` (the dispatcher
  adds the unit where the package carries the module); `tools/code-check.js`
  the same over the carried modules and the packages here.
- **Brought in line**: 31 problems: the references in code comments
  removed, cross-module relative imports by name, `mycelium-git` exporting
  its `test/` helpers (the contract suite, shared with `p2p-mrepo`).
- **A race found by running the sets repeatedly**: the boot test died one
  run in three, reading the boot mrepo's repository while its runtime
  committed: a branch listed, its ref for an instant unreadable (p2p-git
  writes a ref in place). `mycelium-git`'s `listBranches` now resolves
  again, briefly, and drops a branch only when it is gone. Open: p2p-git
  to write refs atomically (written aside, renamed). The boot test stops
  its runtimes whatever happened. Eight runs in a row pass.

All sets pass: the documentation packages' `validate` (help, code), the
runtime's and the boot's `full` (16 and 17 units); 156 READMEs in the help
tree, 97 source READMEs, no problems; the code check, 14 modules, 4
packages, no problems.

No mark on an internal request (the human: the inbox needs no checks, and
internal means not in the inbox, whose history is kept): the `internal`
field gone; `isInternal(ctx, name)`, no record of it in the inbox, asked
as the request executes; a preloaded request internal too. Internal: no
API, not waiting for started; the service's own actions still under its
state machine. `pkgm-base-check` pushed to its repository (created by the
human). All sets pass (the boot's test 72 asserts).

## 26. The repository cleaned up (2026-11-11)

The human: remove what is not used any more; keep `CLAUDE.md` up to date
with the changing landscape. Removed (in the history; each module in its
own repository): the 21 pear-full-square modules no package carries (the
p2p network modules, `mycelium-layer`, `mycelium-topic`, `haicc-base-cli`,
`haicc-deployment`, the `splectral-*`), haiccing's `base-demo-*`,
`base-swarm-three-nodes`, `base-package-haicc`, `splectral/`, the profile
READMEs (`bare-for-pear/`, `splectrum/`), `notes/`, `demos.md`, `docs/`,
`tools/json-check.js`, `tools/keygen.js`. Kept: the 14 modules the
packages carry and `pkgm-base-manager` (the assembler's). `CLAUDE.md`
rewritten: what is here, where documentation lives, the validation before
every commit; `README.md`, `haiccing/README.md`, the workspaces and the
tools' comments updated. Everything rebuilt, all sets pass.

## 27. The mrepo test (2026-11-12)

The human: the further generic tests bundled into one, `mrepo`, the
integrity of a package's mrepo side. In `pkgm-base-check`
(`internal/mrepo`, `validate/mrepo.test.js`,
`validate/mrepo-in-situ.test.js`); the dispatcher adds `/test/mrepo`
(in `validate`, `full`) and `/test/mrepo-in-situ` (in `validate-in-situ`).

- **`/test/mrepo`**, floating: its `mrepo/` structure (each leaf's
  `layer.json` valid, its mode and description; nothing but READMEs outside
  a layer, none inside; a preloaded request a well formed record; its
  packages by name), its `protocol.js` (every configured action its
  function, and back; descriptions, URIs), what it carries (nothing not
  recorded in `third-party.json`, each at its version; an omitted one only
  its stub: a bundle holds less than the record, never more).
- **`/test/mrepo-in-situ`**: in the mrepo's packages manifest; its bundle
  there the one the manifest names (sha256); the layers it brings exist.
  `runtime run` hands the in-situ tests the mrepo's state in one file
  (`SITU`: its help, its layers, its manifest, each linked bundle's hash;
  `HELP` gone).

Generic units in every package now: `modules`, `help`, `code`, `mrepo`,
and in situ `help-in-situ`, `mrepo-in-situ`. All sets pass (the runtime's
`full` 17 units, the boot's 18, its test 72 asserts).

The lock file by hand (the human: minimal or no npm runs): the removed
modules' workspace and link entries out of `package-lock.json`, the two
new modules in (`mrepo-base-help`, `pkgm-base-check`), its workspaces as
`package.json`'s; the dangling links out of `node_modules/`. The packages
assemble to the same; the sets pass.

## 28. base-package-service; the protocols layer; the gate (2026-11-12)

The human: a package creates one entity, for the base packages a protocol;
`base-package-mrepo` is `base-package-service` (it manages the service of
the external API); the type is resolved by the deploy (the package an
mrepo is deployed from, recorded at its node); an mrepo application, later,
brings the selection of protocols together. Repositories created by the
human: `haiccing/base-package-service`, `pear-full-square/mrepo-base-service`.

- **`mrepo-base-service`**: the service actions, a directory each
  (`external/initialise`, `start`, `stop`, `shutdown`: the state moved),
  and the protocol's config (`CONFIG`: each action at `/`, the states that
  allow it): the state machine is configuration.
- **`base-package-service`**: its `protocol.js` mounts the `service`
  protocol; its structure part brings `runtime/service.json`, booted, into
  the runtime layer (a contribution to a layer another package defines);
  its `packages/layer.json` lists the runtime, itself and the documentation
  packages (deployed as the target: an mrepo with a service and nothing
  else).
- **The protocols layer** (`protocols`, atomic; a layer in mycelium-git, an
  execution target; in the runtime's and the boot's structures): `runtime
  register /`, an internal request the runtime places as it starts, before
  `help extract /`, records each loaded protocol's config,
  `/protocols/<protocol>.json`.
- **The gate on the loaded configs** (`mrepo-base-request`, `check`,
  `matches`): with a service, a request is allowed when its protocol is
  loaded, its action configured, its URI one the config names (`/`,
  `/<name>`, `/main/**`, `/**`), and the service state one that allows it
  (none named: started). An internal request is not asked whether offered
  and waits for a state only where the action names its states. Gone:
  `api.json`, the form's `api`, the type in the service state, the
  misdelivered-api check.
- **No protocol built into the runtime**: its own package's and the linked
  packages', actions and configs (`run({ own })`, `protocolsOf`,
  `ctx.protocols`, `exec.runtime.protocols`). `rest` stays in
  `mrepo-base-execute`, unmounted (its own package when needed). The
  module's old command line is `test/runtime.js`, with `rest` and `service`
  as packages would offer them.
- **The runtime runs until stopped** (decided here, to raise): the rule
  ending it by itself when the service is booted with nothing waiting is
  gone; a parent's teardown stops its child's.
- **The mrepo check accepts contributions**: a file in a folder without a
  `layer.json` adds to a layer another package defines; in situ, that
  layer must exist.

Tested: the module tests (service 2/2, request 9/9, execute 6/6, runtime
6/6, boot 9/9, check 6/6); the runtime package's `start` test on an mrepo
without service (its protocols registered, a request answered); the boot's
integration test deploys an mrepo from the service package: booted and
closed, its protocols recorded, the service's actions each in its state,
open once started, a protocol not linked not offered, validated in situ,
torn down (85 asserts; five runs in a row). All five packages' `full` sets
pass; 201 READMEs in the help tree, 109 source READMEs, the code check, no
problems.

The service's door, a selection (the human: shutdown shuts the external
door for a selection of protocols, not all): a protocol behind it says so
in its config, `gated`; one that does not stays open whatever the state
(`runtime`, `help`: a closed mrepo can be inspected and tested). The boot
protocol gated; the service's own actions by their states. On the roadmap
(the human): `base-package-crud`, not rest, its full meaning with mutable
and immutable. Packages overlay: one structure laid on another (confirmed).

The local agent's note of 2026-11-12 (`31501e6`, the service commit): the
release built and tried on the human's machine: passed, every request
done, ended by itself. Its finding applied (its patch): `boot-release.js`
assembles each package right before bundling it (it bundled five,
assembled two: a fresh clone stopped).

## 29. Request branches; the wrapped remote command (2026-11-12)

Discussed with the human, from what `haicc` is. Settled:

- **`haicc` is not a protocol**: it adds no functionality of its own; what
  it would offer is an access structure, swarm centred. An mrepo
  application whose `main` holds that structure makes it redundant. To
  design with the mrepo application.
- **XPath comes into the mrepo**, as internal functionality that manages
  the URI and issues cascading requests: a request whose URI leads into
  another mrepo is rewritten as one sent to that mrepo; a request can
  travel through several. Delivery on the same node is direct, a file
  dropped into the inbox folder; another node needs dispatch.
- **Request branches**: a request is processed on branches of its own,
  named by its key. The branch id is the principal's name; the execution
  context holds it and opens the principal directly. A request branch not
  being processed has a waiting principal.
- **A child's response** carries the branch id, arrives through pending,
  is added to that branch's state, and processing proceeds. For the base,
  receiving it returns the principal with it (option B). Later, with
  proper design (the human has clear ideas): composite actions, an action
  resuming at a label after its child request (option A), a preloading of
  data before processing.
- **For the base: only the wrapped remote command.**
- **Noted by the human**: a request has become asynchronous where it was
  synchronous; that will matter for directly submitted internal
  processing. The importance of internal processing documentation, and of
  AVRO for the compatibility of the data sets.

Built (first without the human's confirmation of the reading, which was
wrong to do; then corrected, point by point, to what was agreed):

- **A request is processed on its own branches** (`mrepo-base-execute`,
  `mrepo-base-request`; `createExecution(target, id)` in `mycelium-git`):
  `execute/<key>/<target>`. It goes from pending straight onto
  `execute/<key>/request/execute` (`begin`), its principal there; never
  into `request/execute` itself, which only receives completed requests by
  merge, on their way to done (and is cleared then, as before). The branch
  only ever adds: the principal, what it waits for, a child's response,
  its completion. The others (`main`, `runtime`, ...) are made as the
  request first writes a target. Merged back and removed at its end,
  discarded on a failure. No history kept in the execute branches (the
  human): `request/done` has it. One at a time: the next pending request
  begins when no branch is being processed.
- **The wrapped remote command** (`lib/remote.js`): `/main/<name>/<rest>`,
  a child's record at `/main/<name>.json`, leads into that child; the
  request is passed on whole (the same protocol, action and body, the URI
  `/<rest>`), its core addressed back to `/<mrepo>/execute/<key>`, dropped
  into the child's inbox folder. What it waits for is added to its
  principal (`remote: { at, uri, key }`). No flags: the branch id is the
  principal's name; a branch not being processed has a waiting principal.
- **The response** (`principals`): collected from the child's outbox
  folder into pending (the mrepo's own); at the front of the queue added
  to the principal's branch, a record of its own; the execute protocol
  then returns the principal with it. Merged in with its principal, it
  goes to `request/done` and is not sent on. A response nobody waits for
  goes to `request/done`. `settled()` counts any request branch as not
  done.
- **Checked by the mrepo that executes it**: the one passing it on asks
  only that the URI is canonical.
- **A second defect of p2p-git, found by the branches made and removed
  with every request**: its listing of branches returns nothing when a
  branch is removed during its walk of the refs; a process reading the
  repository then saw no branches at all, one run in five.
  `mycelium-git`'s `listBranches` asks again, briefly. Open with the
  first: to be fixed in p2p-git.

Open: a child that never answers leaves its principal waiting (no time
limit); dispatch to another node; a wildcard URI fanning out; the
consequences of asynchronous requests (completion order no longer the
queue's order).

Tested: the module tests unchanged (execute 6/6, request 9/9, runtime 6/6,
boot 9/9, mycelium-git 114/114); the boot's integration test sends the boot
mrepo `help get /main/host/packages`: passed on to the host, answered by
it, the response kept in done and not sent on, no request branch left; a
URI with no mrepo linked there stays (93 asserts, eight runs in a row).
All five packages' `full` sets pass.

## 30. What haicc is (the human, 2026-11-12; a note, nothing built)

It came back to the human; it replaces part 29's "haicc is not a protocol:
an access structure, redundant".

- **Its concern: deployment.** Global, across swarms. Also responsible for
  setting up and managing cross swarm bridges.
- **Two sides.** On the Linux side of the host, haicc is an app: it
  manages the downloads of sources and third-party components, and
  installs from scratch. On the swarm side, it is a specific mrepo.
- **The haicc mrepo is the only mrepo on a node or host with the boot
  protocol.**
- **It only ever connects directly, with local mrepos**: the folder inbox.
- **A web of haicc mrepos.** The host's instance takes from the terminal,
  and connects to the swarm nodes' haicc mrepos on the host. Those proxy
  to the haicc mrepo of the swarm node in its container.
- **One manager**: there can only be one haicc mrepo actively managing a
  host or a node.
- **haicc commands are issued on the host**; internally it is that web.
- **The boot mrepo is not it**: the boot mrepo deploys the host's haicc
  mrepo, as the boot on a PC starts the system. What the first-time boot
  deploys today as `/host` (the runtime package, a placeholder) is where
  the haicc mrepo goes.
- **Into a container**: the node's haicc mrepo on the host reaches the one
  in the container by mapped inbox and outbox folders (folder access), or
  something equivalent but secure.

## 31. Solutions, components, applications; storage; the haicc component (the human, 2026-11-12; a note, nothing built)

Settled in discussion. Nothing is built from it yet.

**The naming**

- **A package** brings a protocol and its part of the mrepo structure.
- **A component** (`base-component-<name>`) delivers a service to the
  solution. The components are the physical view of a solution.
- **An application** (`base-application-<name>`) delivers user-facing
  functionality: a logical view within the solution. It consists of an
  mrepo and sits on one or more components, with one mrepo per component
  it spans. That mrepo is exclusive (a child mrepo, at
  `main/<application>/`) or shared (a section of the component's `main`,
  with its own protocols; not built). The URI is the same either way:
  XPath decides. With several applications there are relationships
  between them.
- **A solution** (`base-solution-<name>`) is a number of applications and
  components, possibly across swarms.
- **Why it matters**: haicc can place deployments again, to satisfy the
  resources needed, without anything changing for the application. With
  the replication p2p gives, a new install can come in as passive before
  the switch.

**Storage**

- `main` on the Corestore is the external state; what is on the filesystem
  is the internal state.
- The rule: only `main` on the Corestore. On disk, by default, all the
  remaining layers, unless an exception is raised. The minimum on disk is
  the inbox and the outbox.
- Needed, not built: the sync of a folder with the Corestore, both ways.
- The code does not follow the rule yet: under `p2p` storage it routes
  `runtime`, `packages`, `help` and `protocols` to the Corestore as well.
  Not a worry now.

**The haicc component**

- `haiccing/base-component-haicc` (the repository is created). A
  component: no data on it, no structure of its own. It is a set of
  packages: runtime, boot, service.
- The boot mrepo installs the host's haicc mrepo and starts it.
- The terminal sends to the host's haicc mrepo and receives from it.
- The demos are created on top of the component: functional units, data
  structures in `main`. They add the folders where the swarms and the
  swarm nodes are created.
- XPath will probably be needed. It is internal functionality, like
  request and execute, with no structure of its own; whether it is added
  to the runtime is under discussion.

**The priority**: the host's haicc mrepo, then a node's haicc mrepo, then
a swarm going. The storage work waits.

## 32. The haicc command; base-linux-haicc; the sources (the human, 2026-11-12; a note, nothing built)

Discussion, still going. Settled so far; nothing is built from it.

**The naming, completed** (it adds to part 31). Because packages are
self-contained, what is installed is always one package holding all of
it: no ad hoc addition of a protocol or of structure, which could break
the testing.

- `base-package-`: a single item, a protocol and/or mrepo structure.
- `base-component-`: several packages deployed together; `main` empty.
- `base-application-`: a component and a functional application within
  `main`. It has minimum component requirements: protocols that must
  exist.
- `base-demo-`: a deployment that demonstrates some functionality, with
  demo data.
- `base-solution-`: a haicc component that manages the applications of a
  solution, and proxies the management of the solution's components to
  the nodes' haicc managers.
- `base-manager-host`, `base-manager-node`: haicc components
  preconfigured to manage a host or a node.
- `base-linux-haicc`: the script application on Linux (below).

The boot package is multi purpose, validly so, as our packages are in
general. It is split all the same, because haicc is to be an application
on the host that can be scripted and is registered globally.

**The haicc command**

- `haicc` is a sh file that only dispatches, registered globally. A URI
  starts with `/` (the local root), so:
  - a first part starting with `/` is an mrepo command:
    `haicc <URI> <protocol>/<action> <args>`;
  - anything else is a script command: `haicc <name> <args>`.
- **What it means**: go to this node position and execute the command
  that follows, in the context of the node where the data originates
  from. If the node is a shortcut to somewhere else, the command is sent
  there. The command that follows can be a `haicc <URI> <command>`
  itself: commands concatenate, each URI local to the mrepo it is in.
  ```
  haicc boot                                          # a sh script: the boot mrepo at the root
  haicc / boot/deploy host base-component-haicc       # an empty haicc mrepo
  haicc /host service/initialise                      # sent through the shortcut
  haicc /host service/start
  haicc / boot/teardown host                          # local: the shortcut as an item
  haicc /host haicc /swarms/swarm-1 boot/deploy node-1
  ```
- **Local and remote at once**: a command at the parent's position about
  a name (deploy, teardown) is local; a command at the shortcut's
  position goes through it. No rule has to guess.
- **No XPath rewrite**: a hop takes its own `haicc <URI>` off and passes
  the rest on unchanged, the same internally and externally. (What is
  built rewrites `/main/<name>/<rest>` to `/<rest>`: to be replaced.)
- **The offset**: a script that works on data at a folder position keeps
  working when the structure is moved: only the position it is `haicc`ed
  to changes.
- A single URI running through a shortcut (`/host/swarms/...`): it
  depends on how the layering of the data works, the rules of the mrepo.
  A simple rule that works for now; the rest later.
- The boot mrepo carries no preloaded deploy. A `boot/install` doing the
  deploy and the two service commands is possible later.
- **`haicc` is a proper protocol**, with a default action: `haicc` alone
  is rewritten internally as `haicc/goto`. So a hop is an ordinary
  command (protocol `haicc`, action `goto`, the URI, and as its arguments
  the command that follows), and more haicc actions can follow. Visible
  functionality: it gets a package, `base-package-haicc`.
- **XPath, execute and request have no protocol**: internal, invisible
  functionality (the runtime's).
- **Arguments**: a list, unnamed, until AVRO attaches schemas to them.
  The terminal command is parsed into an array of parts and then
  interpreted: `<protocol>/<action>` (or the protocol alone: its default
  action), the URI, the arguments.
- **At the command line** there is no mrepo context, so a sh script
  creates the record and puts it in the inbox folder, with one rule of
  its own: at the root the command is written plain, the name joined to
  the position; anywhere else the `haicc` command is written as it is.
  ```
  haicc / boot/deploy host base-component-haicc   ->  boot/deploy /host base-component-haicc   (local)
  haicc /host service/initialise                  ->  haicc /host service/initialise           (remote)
  ```
- **Forward visibility only**: the position is the root of what the
  command sees; nothing above it is reachable. A `haicc` that does not
  land on a shortcut is a local node. All the nodes from an mrepo
  shortcut are brought in as local, without the shortcut information of
  the remote repository.

**base-linux-haicc**: the package for the script application. It does
not include the prerequisites.

**The sources**: a script command.

- `haicc sources link <folder>`: a local folder linked as a source, our
  packages and the third-party components.
- `haicc sources download <args>`: no arguments, all; `haiccing`, the
  organisation; `haiccing/<package>`, one package; `third-party`, `bare`,
  `docker`, and what else proves useful.
- https is always the backup, by default: what is not in the sources is
  fetched when needed. `no-https` turns that off: a missing item is then
  an error.

**Proposed by us, not confirmed yet**

- POSIX sh, not bash.
- `haicc prereq`: checks the platform, the work folder and the sources,
  and unpacks Bare from them; no network. The prerequisite code leaves
  the boot package.
- The release of `base-linux-haicc`: one installer sh file carrying the
  scripts and the pins. The boot's standalone executable (Bare built in,
  117 MB) dropped: the boot is its bundle, run with the Bare put in place.
- The parts interpreted in the mrepo (inbox to pending), the sh script
  writing them as typed; the script waiting for the response in the
  outbox and printing it.
- XPath as a module of its own, what `goto` uses: a local URI resolved to
  a position, a folder or a shortcut.

**Open**: the package argument's default organisation; whether `/host`
gets `base-manager-host` in the end.

## 33. Commands as parts (2026-11-13)

The first step of building part 32, after the human's go. The remaining
steps, in order: XPath and the `xpath` layer; `base-package-haicc`; the
boot package; `base-component-haicc`; `base-linux-haicc`.

Settled just before the go, and to be built in those steps:

- A shortcut is `/xpath/<position>/shortcut.json`, in a layer of its own,
  `xpath` (navigation directives). It has no presence in `main`. The boot
  protocol manages it: deploy creates it, teardown deletes it.
- The linked mrepo's folder is found by logic, local linking only: the
  `main/` folder on disk is a shadow structure of `main` (which sits in
  the Corestore), and a child deployed at a position sits there at the
  same path, its inbox and outbox folders inside.
- The main data of a linked repository is to be visible through XPath in
  the mrepo that links to it, without that repository's shortcut data.
  The first implementation gives no visibility of shortcuts in linked
  mrepos.
- An mrepo needs a unique URI (or its id from the Corestore):
  `<swarm>/<node>`, extended with `local/host` for the host mrepo created
  in the boot mrepo, `local/<mrepo>` for the others created there. A rule
  for the `base-` packages wherever required (the context of an
  implementation family).

**Built**

- **A request's form** is `{ protocol, action, uri, args }`: the
  arguments a list, unnamed, in place of the named body.
- **A request given as a command**, as it is typed: its parts in order,
  `<protocol>/<action> <URI> <argument>...`, an array or a string (the
  value itself, or `{ command }`). Interpreted on its way into pending
  (`mrepo-base-request`: `interpret`, `formOf`, in `lib/command.js`): the
  protocol alone takes its default action (its config's `default`); no
  URI is `/`; a URI without its leading `/` gets it. The command stays in
  the form beside what it was interpreted as. A command that cannot be
  told is refused, like any request.
- **The actions moved over**: `boot deploy` and `redeploy` (the package
  the first argument), `help get` (one argument: a level, or a section's
  title), `runtime run` (`dry-run`), the tests' `rest put` (the document
  as JSON text); the wrapped remote command passes the arguments on.
- **A method's README**: `Arguments` in place of `Body`.

**Validated**: the five packages' full sets; the boot's test four times
(93 asserts); the checks, no problems.

## 34. XPath, the xpath layer, the haicc protocol (2026-11-13)

Steps two and three of building part 32, built together: the shortcut
replaces the record in `main` that the earlier passing on read.

**XPath, internal to the runtime** (`pear-full-square/mrepo-base-xpath`)

- `resolve(exec, uri)`: a local URI resolved to a node position, an
  ordinary node or a shortcut. A shortcut is its entry in the new `xpath`
  layer, `/xpath/<position>/shortcut.json`; it has no presence in `main`.
- The linked mrepo's folder is found by logic, local linking only: the
  shadow of `main`, `<dir>/main/<position>/`, its inbox and outbox folders
  inside.
- The simple rule for now: a URI does not run through a shortcut. It is
  refused, and the message names the way across, a `haicc` at the
  shortcut.
- The `xpath` layer comes with the runtime package (and is in the boot
  mrepo's own structure); an action can write it.

**Unique URIs**

- An mrepo's identity is in its runtime layer, `/runtime/mrepo.json`:
  `{ uri }`, `<swarm>/<node>`. The boot mrepo is `local/boot`; what it
  deploys is `local/<name>`. Deploy writes it into the child.
- The runtime reads it as it starts and is addressed by it: its inbox is
  `/<uri>/inbox`, a response to a request waiting in it goes to
  `/<uri>/execute/<key>`. Without one, the mrepo's name is used.
- Open, for the demos: a child takes its parent's swarm. How the haicc
  mrepo gives a node `<swarm>/<node>` from the folder it is deployed in is
  not decided.

**The boot protocol manages the shortcut**: `boot deploy` writes it (the
linked mrepo's unique URI, and what was deployed: the package, its
packages, its runtime's process), `boot teardown` deletes it. Nothing is
written in `main`.

**The haicc protocol** (`pear-full-square/mrepo-base-haicc`,
`haiccing/base-package-haicc`)

- `goto`, its default action: `haicc <URI> <command>`. At a shortcut the
  command that follows is sent on unchanged; at the root it is executed
  here. A position deeper inside `main` is refused for now: it comes with
  the first demo.
- Not behind the service's door: the command that follows is checked
  where it is executed.
- The package has no structure of its own. The boot mrepo links it.

**In the execute protocol**

- `exec.forward(to, command)`: the command sent on to the mrepo a shortcut
  leads to; nothing of the request is executed here, its principal waits
  on its branch, and is returned with the response (as built in part 29).
- `exec.run(command)`: a command executed in the same execution,
  interpreted and checked as the request is.
- The URI rewrite (`/main/<name>/<rest>` to `/<rest>`) is gone.

**A defect found and fixed**: a response collected from a linked mrepo
came in through the same handler as a request and was checked as one. In
a service managed mrepo it could be refused for its service state. A
response is now queued without being interpreted or checked.

**The checks** (`tools/code-check.js`, `tools/help-extract.js --files`)
now take every package in `haiccing/` and every module a package carries,
in place of fixed lists.

**Validated**: the six packages' full sets; the boot's test four times
(100 asserts), `haicc` going through a real shortcut between two running
mrepos; the checks, no problems (17 modules, 6 packages).

## 35. The boot package: its bundle, nothing preloaded (2026-11-13)

Step four of building part 32.

- **The boot deploys nothing by itself.** The preloaded `boot deploy
  /host` is removed. The boot builds the boot mrepo, places its packages
  and starts its runtime; the host is then deployed by a command,
  `boot/deploy host <package>`.
- **The prerequisite code is out of the boot package**: the check of the
  platform, the work folder, the sources and Bare, with its fix
  (`mrepo-base-boot`'s `internal/check`, the package's `prerequisites.json`
  and `bare.json`). It moves to the scripts of `base-linux-haicc` (step
  six). The boot runs on the Bare that runs it and starts its runtime on
  that same one.
- **The boot runs from its bundle**: `bare base-package-boot.bundle
  --work=<folder> --sources=...`. It reads the boot mrepo's structure out
  of the bundle it runs from, as deploy reads any package's. The embedded
  structure module is gone.
- **No standalone executable.** `tools/boot-release.js` is replaced by
  `tools/release.js`: every package assembled and bundled into the
  sources, Bare's tarball fetched once as the lockfile pins it and
  checked, and `sources/third-party.json` listing the third-party
  components with their hashes.
- **The boot's test** is rewritten around commands: the host deployed,
  redeployed, torn down and deployed again by commands sent to the boot
  mrepo's inbox.

**Not working until step six**: `tools/haicc-try.sh` still calls the
executable. It becomes the test of `base-linux-haicc`.

**Left for later**: `bare-build` is no longer used by anything here; it
is still in the lockfile, and `tools/install.sh` still installs it.

**Validated**: the six packages' full sets; the boot's test three times
(91 asserts); the boot run by hand from its bundle; the checks, no
problems.

## 36. base-component-haicc (2026-11-13)

Step five of building part 32.

- **The component is a package that is only a list**: its
  `mrepo/packages/layer.json` names the runtime, the boot protocol, the
  service protocol, the haicc protocol, itself and the documentation
  packages. No protocol, no code, no data: `main` stays empty.
- **It lists itself, after the packages that bring structure**, so that
  its list is the one laid in last and the one the mrepo holds.
- **A package named without its organisation means `haiccing`**:
  `boot/deploy host base-component-haicc`.
- **Tested in the boot package's test**, which can deploy one: the
  component deployed by a command; booted, its boot protocol behind the
  service's door; `service/initialise` and `service/start` passed through
  to it; a node deployed inside it; commands chained through both
  shortcuts (`haicc /haicc haicc /node-1 help/get /packages`); the
  component validated in situ; both torn down.

**Found, to raise with the human**

- **Teardown does not cascade.** Tearing down an mrepo that has deployed
  mrepos of its own stops its runtime and removes its folder, and with it
  its children's folders, but their runtimes keep running. The test tears
  the node down first.
- **The boot package's identity file** (`runtime/mrepo.json`,
  `local/boot`) is laid into every mrepo that links the boot package;
  deploy then writes the child's own over it. It works, but the file is
  the boot mrepo's, not the boot protocol's.

**Validated**: the seven packages' full sets; the boot's test three times
(108 asserts); the checks, no problems (17 modules, 7 packages).

## 37. base-linux-haicc: the haicc command (2026-11-13)

Step six of building part 32, the last. The flow the human wrote in part
32 now runs from the command line:

```
sh haicc-install.sh
haicc sources link <folder>
haicc prereq
haicc boot
haicc / boot/deploy host base-component-haicc
haicc /host service/initialise
haicc /host service/start
```

**Built** (`haiccing/base-linux-haicc`, POSIX sh, no bundle)

- **`haicc`** dispatches: a first part starting with `/` is an mrepo
  command; anything else is the script `haicc-<name>`.
- **`haicc sources`**: `link <folder>`, `unlink`, `download [<what>...]`,
  `https`, `no-https`. The folders come first, https after them as the
  backup, on by default. The only command that reaches the network.
- **`haicc prereq [--check]`**: the platform, the tools, the work folder,
  the sources, Bare. Nothing is fetched: the pinned Bare is unpacked from
  the sources and its tarball's sha512 recorded. `--check` changes
  nothing.
- **`haicc boot`**: checks the prerequisites and stops when one is
  missing; else runs the boot package's bundle with the Bare put in
  place.
- **An mrepo command** (`haicc-request`): the record written into the boot
  mrepo's inbox folder (whole, then renamed), the response waited for in
  its outbox folder, the command's output printed as JSON, its error on
  stderr with exit 1. At the root the command is written plain; anywhere
  else the `haicc` command goes as typed. The parts are sent unnamed.
- **Reading the response in sh**: a small scanner in awk follows strings
  and depth to find the completed form's `output` or `error`, three
  objects deep. No JSON tool is needed on the host.
- **The installer**, `haicc-install.sh`: one file carrying the scripts and
  the pins, written by the package's own `build.sh` and committed. It
  registers the command as a small script on the PATH.
- **The pins**: Bare's version, URL and sha512, brought in line with the
  lockfile by `tools/release.js`, which also writes the installer again.
- **Its test**, `sh test/run.sh`: the whole flow in a temporary folder,
  from the installer to a started host, a node inside it, chained
  commands and the teardowns; 66 checks; nothing left running. It
  replaces `tools/haicc-try.sh`, which is removed.

**Decided here, as the human left them to us** (listed as assumptions
before the go, none corrected)

- The script waits for the response and prints it; 120 seconds, then exit
  4 and the request stays.
- `haicc prereq` exists and puts Bare in place; `haicc boot` never
  fetches or fixes.
- The release is one installer file; there is no executable.
- haicc's own folder is `~/.haicc` (`HAICC_HOME`), with the work folder
  inside it (`HAICC_WORK`).

**Not built, said plainly by the scripts**

- **Our packages are not published anywhere.** `haicc sources download`
  fetches Bare only and says so for the rest; a sources folder has to be
  linked for the packages. Where bundles are published is the release and
  sourcing work on the roadmap.
- **The https backup is not read by the mrepos.** It is recorded and
  passed to the boot as a source; the fetch inside an mrepo only reads
  folders.
- `docker` and other third-party components: nothing pinned for them.

**Validated**: the haicc test, 66 of 66; the seven bundle packages' full
sets; the boot's test (108 asserts); the checks, no problems (17 modules,
8 packages); the Bare download tried once by hand, as pinned.

## 38. The local run of 381bbae; bare-build removed (2026-11-13)

**The local agent's report** (`local-note.md`, 2026-11-13, on `381bbae`):
the prompt ran as written, offline, every step passed (the `haicc` test
66 of 66, the seven packages' full sets). The human then tried `haicc` by
hand. Five findings, to settle with the human before they are built:

1. `haicc` should print the response record whole by default, the output
   alone on request (`--output`); a patch tested there, 71 checks.
2. The service's responses say the state reached, not what was done:
   `service/stop` answers `initialised`.
3. Teardown was not to be found: not in `haicc --help` nor in the prompt;
   an unknown protocol is reported as `no action`.
4. The machine level: `haicc boot` to become `haicc boot/deploy`, with a
   `haicc boot/teardown` to undo it.
5. A missing argument is not said: the target falls back to `/`, and the
   action fails on something else.

No release was created: the human's word, not yet.

**Done here, on the human's word**

- **`bare-build` removed**: from `package.json`, from the lockfile by
  hand (it and the twenty entries only it needed: its platform prebuilts,
  `bare-apk`, `bare-app-image`, `bare-lief`, `bare-link`, `bare-tpl`,
  `bare-unpack`, its own `bare-pack`), from `tools/install.sh` (its
  special handling). The install replays cleanly.
- **The assembler's `unresolved` report** the local agent saw
  (`p2p-mrepo: from-native`, `from-bundle`, `a`): a method called
  `import` in a test was read as an import. The pattern no longer takes
  `x.import('name')` or `x.require('name')` (`pkgm-base-manager`'s
  closure, `tools/package-assemble.js`). Nothing was missing.

**Seen, not touched**: the lockfile still holds about forty entries that
nothing here reaches (`hyperdht`, `dht-rpc` and others), left from
modules removed earlier. For the mini tool on the roadmap.

**Validated**: the release built; the checks, no problems; the `haicc`
test, 66 of 66; the boot's test, 108 asserts; three packages' full sets.

## 39. After the first test by hand: four changes (2026-11-13)

The human's answers to the local agent's findings (part 38), built.

1. **`haicc` prints the response record whole**, as it is in the outbox
   folder. The exit code still comes from its completed form: 0 an
   output, 1 an error, which is also said on stderr. `haicc --output <URI>
   ...` (or `HAICC_OUTPUT=1`) prints the output alone. The local agent's
   patch, taken as tested there.
2. **The service answers what was done and the state now**:
   `{ service, state }`. `service/stop` answers `stopped` with the state
   `initialised`; `service/shutdown` answers `shut down` with the state
   `booted`.
3. **What is missing is said.** The human: the error on a teardown
   without its target was the wrong one; it was a missing argument.
   - An action's config names what it needs: `target` (a target other
     than `/`, the mrepo itself, which one cannot deploy or tear down; a
     URI left out is `/`) and `args` (its arguments by name, in order, one
     ending in `?` optional). One not given: `missing argument: <name>`
     (`mrepo-base-request`: `missing`, read by `check`, with or without a
     service, before the URI is looked at).
   - Declared: `boot deploy` (target, `package`), `teardown` (target),
     `redeploy` (target, `package?`), `haicc goto` (`command`),
     `runtime run` (target).
   - A protocol or an action that is not there is said with what is:
     `no protocol: deploy (boot, haicc, help, runtime)`,
     `no action: boot remove (deploy, redeploy, teardown)`.
   - **The boot protocol cannot target a local folder** (the human): a
     position that exists locally, as data in `main`, is refused by
     deploy and by teardown: `<uri> exists locally: the boot protocol
     cannot target it`.
4. **The machine level**: a `<protocol>/<action>` without a URI is the
   level above the root mrepo, in the same form as every command below
   it. `haicc boot` becomes `haicc boot/deploy`; `haicc boot/teardown`
   undoes it: every runtime under the work folder stopped (the boot
   mrepo's and those of every mrepo deployed below it), then what the
   deploy put in place removed: the mrepos, the package store, the work
   folder's setting. Bare, the sources and the scripts stay. `sources` and
   `prereq` keep their form: not asked.

Also: `haicc --help` lists the teardowns and says where the mrepos' help
is; the local agent's prompt and handover follow the new commands.

**Validated**: the `haicc` test, 96 of 96; the seven packages' full sets;
the boot's test three times (108 asserts); the checks, no problems.

## 40. The response record unpacked (2026-11-13)

The human: the record came back raw, on a single line; could it be
unpacked as an object, across lines, in a compact form.

- **`haicc <URI> ...` prints the record unpacked** (`haicc-format.awk`):
  a container that fits on the line is left as it is stored; one that
  does not is opened, an entry a line, indented by two, and so on inside
  it. So the envelope, the core and the form open up, and a short output
  or argument list stays on its line. The width is 80 (`HAICC_WIDTH`).
- **Nothing of the record is changed**: only line breaks, indentation and
  a space after an opened object's keys are added. The test takes them
  off again for every record in the outbox and finds the record as
  stored.
- **`haicc --raw <URI> ...`** (or `HAICC_RAW=1`) prints it as it is in
  the outbox folder, one line. `--output` is as before: the output alone,
  as stored.
- No JSON tool on the host: the formatter is awk, like the response
  reader.

**Validated**: the `haicc` test, 104 of 104; the README check, no
problems.

## 41. Small leftovers (2026-11-13)

- **The sh commands stay as they are** (the human): `haicc sources` and
  `haicc prereq` keep their form; only the machine level took
  `<protocol>/<action>` (`boot/deploy`, `boot/teardown`).
- **The lockfile cleaned up**, by hand: the 23 entries nothing here
  reaches any more, left from modules removed earlier (`hyperswarm`,
  `hyperdht`, `dht-rpc`, `udx-native`, `react`, `react-dom`, `htm` and
  what only they needed). Worked out from the lockfile itself: what the
  root's dependencies and the workspaces reach, the rest dropped; none
  was imported by a module or carried by a package. The install replays
  (207 kept, none fetched).

**Validated**: the release built; the seven packages' full sets; the
`haicc` test, 104 of 104; the code check, no problems.

## 42. Hooks, activation, the boot split, the help package: the design (the human, 2026-11-13; a note)

Settled in discussion, then the go. It started as "the help protocol gets
its own package" and became how an mrepo comes to offer anything at all.

- **A proper protocol gets a package**: `help` moves out of the runtime
  package into `base-package-help`, with the `help` layer.
- **`help/extract` is an ordinary action.** The runtime no longer places
  it, nor any other protocol's request, by name.
- **Hooks on the status transitions**, as files a package drops in, one
  folder a transition: `/runtime/hooks/<transition>/<name>.json`, each a
  command, its parts. No config is updated or merged: a package linked
  has its files there.
  - `boot`: fired by the runtime as it starts. All protocols are loaded
    at boot (the service too, before any `initialise`).
  - `initialise`, `start`, `stop`, `shutdown`: fired by the service, which
    runs the transition's hooks in its own execution and then moves the
    state. That is the functionality the service provides.
- **Activation.** A request from outside is accepted only for a protocol
  that is active; nothing is active by default. `protocol/activate` and
  `protocol/deactivate` are actions of a new protocol, `protocol`
  (`base-package-protocol`); they write the active protocols into the
  mrepo's config, and the gate reads that. Without a service, the `boot`
  hooks activate what the mrepo offers. With one, `start` and `stop` open
  and close the door. The `gated` flag, the rule "no service, no gate"
  and `runtime register` go.
- **Only the last package in the list drops runtime config**, whichever
  type it is: the package that defines the mrepo says its hooks, its
  service state, in full. A protocol package's runtime config counts only
  when it is itself the one deployed.
- **The boot package split**: `base-package-boot`, the boot protocol
  only; `base-component-boot`, the initial boot mrepo: its list, its
  runtime config, the program that puts it in place. The boot mrepo is
  not a service: its `boot` hooks activate its protocols.
- **The sh commands stay as they are.**

Decided by us within it: the active set is written in the `protocols`
layer, one file a protocol holding its config (the layer stops being a
copy nothing reads); a hook file is one command; hooks run as the mrepo's
own, not held at the door; the `protocol` protocol itself is not
activated for the outside by default.

## 43. base-package-help (2026-11-13)

The first step of building part 42.

- **The `help` protocol in a package of its own**, `haiccing/base-package-help`:
  its `protocol.js` mounts `get` and `extract` from `mrepo-base-help`; its
  structure brings the `help` layer. The runtime package keeps one
  protocol, `runtime`. One package, one protocol, with no exception left.
- **Every list has it**: the boot mrepo's, the haicc component's, the
  service package's and the runtime package's own. Behaviour unchanged:
  the runtime still places `help extract /` as it starts, where the mrepo
  has the protocol and the layer (that goes with the hooks, next).
- **The boot test's count of requests done** replaced by a check of what a
  second start adds, by name: it no longer goes stale when a test is added.

**Validated**: the eight packages' full sets; the `haicc` test, 104 of
104; the checks, no problems (17 modules, 9 packages).

## 44. The boot split; runtime config from the last package (2026-11-13)

The second step of building part 42.

- **`base-package-boot`** is the boot protocol only: its `protocol.js`,
  no structure, no program.
- **`base-component-boot`** is the initial boot mrepo: its list (the
  runtime, help, the boot protocol, haicc, the documentation packages,
  itself last), the program that puts it in place (`run.js`), and the
  end-to-end test, moved there with it. The `haicc` scripts run its
  bundle.
- **The boot mrepo is built as any mrepo is.** One routine,
  `mrepo-base-boot`'s `lay`, is used by deploy for a child and by the
  boot component for the boot mrepo: the target's list fetched into the
  store, each package's part of the structure laid in, in order. The
  component has no layers of its own, and the boot package's copy of
  every layer is gone.
- **Runtime config comes from the last package of a list only**: what a
  package drops into the runtime layer (the layer's own definition is
  structure, and comes from whichever package brings it). So the haicc
  component now carries its own `runtime/service.json`; the service
  package's is laid in only when it is itself deployed.
- **A list ends with its own package**, so "the last" and "the one
  deployed" say the same. The lists are reordered, and the package check
  (`/test/mrepo`) refuses a list that does not.
- **Identities are written by whoever builds**: the boot's program writes
  `local/boot`, deploy writes the child's. No package carries one, so the
  boot's identity is no longer laid into every mrepo that links the boot
  protocol (noted in part 36).

**Validated**: the nine bundle packages' full sets, the boot component's
among them (110 asserts); the `haicc` test, 104 of 104; the checks, no
problems (17 modules, 10 packages).

## 45. Hooks, activation, the protocol protocol (2026-11-13)

The third and last step of building part 42.

**The protocol protocol** (`pear-full-square/mrepo-base-protocol`,
`haiccing/base-package-protocol`)

- `protocol/activate / <protocol>` writes a loaded protocol's config into
  the `protocols` layer; `protocol/deactivate / <protocol>` removes it.
  The layer is the active set, and no longer a copy nothing reads.
- The `protocol` protocol itself is not activated for the outside:
  opening and closing is the hooks' business.

**The gate reads the active set**

- A request from outside is checked against the protocols loaded (the
  protocol, the action, what it needs, its URI); and as it executes, its
  protocol must be active. Nothing is by default. What is not there is
  said with what is.
- At the inbox neither the activation nor the service state is checked:
  the queue may hold requests that change them first.
- The mrepo's own requests are not asked whether a protocol is active.
- Gone: the `gated` flag, the rule "no service, no gate", `runtime
  register`.

**Hooks**

- Files, one folder a transition, each a command, its parts:
  `/runtime/hooks/<transition>/<name>.json`, run in name order
  (`mrepo-base-request`: `hooks`).
- `boot`: the runtime places them as its own requests each time it
  starts, and takes nothing from the inbox until they are done. It names
  no protocol any more.
- `initialise`, `start`, `stop`, `shutdown`: the service action runs its
  transition's hooks in its own execution (`exec.run(command, { own:
  true })`: as the mrepo's own), then moves the state. A hook that fails
  fails the transition, and the whole execution rolls back.

**Who drops them** (runtime config: the last package of a list)

| package | at boot | on the service's transitions |
|---|---|---|
| `base-component-boot` | `boot`, `haicc`, `help`, `runtime` activated; help extracted | none: not a service |
| `base-component-haicc` | `haicc`, `help`, `runtime`, `service` activated | `initialise`: help extracted; `start`: `boot` activated; `stop`: `boot` deactivated |
| `base-package-service`, deployed alone | `help`, `runtime`, `service` activated | `initialise`: help extracted |
| `base-package-runtime`, deployed alone | `help`, `runtime` activated; help extracted | none |

**Consequences seen in the tests**

- A service-managed mrepo has no help while `booted`: `help/get` says
  nothing is extracted yet; it is there from `initialise` on.
- The door of the haicc mrepo is two files: stopped, its boot protocol is
  refused again (`boot is not active; the service is initialised`).
- An mrepo that links no package (the runtime package's own test) has
  nothing active: its boot hooks each say the protocol they name is not
  there.

**The package check** (`/test/mrepo`) checks hook files: their place,
their transition, that each is a command.

**Validated**: the ten bundle packages' full sets; the boot component's
test three times (119 asserts); the `haicc` test, 107 of 107; the checks,
no problems (18 modules, 11 packages).

## 46. Future design: pipelines, a database server, local data (the human, 2026-11-13; a note)

A discussion before the next build, nothing built. Recorded in
`vision.md`, "Pipelines, and mycelium as a database server", and on the
roadmap's distant horizon (`handover-next.md`, item 13):

- a pipeline engine on our request processing: steps as requests, the
  pipeline's own execute branch of `main`, one commit in `main` at its
  end, execution plans, compiled pipelines;
- mycelium as a database server, which needs that engine;
- data in p2p is local: replicas as a cache, a TTL on it, applications
  designed in local data terms, the atomic commits of `main`.

What the human said and what is only proposed or open are kept apart
there.

## 47. The package check: a package tests what it provides (2026-11-13)

The human, on seeing haiccing packages without tests of their own: very
disappointing that this was skipped. For each package there are custom
tests, at the haiccing level, for the functionality it provides; for a
protocol a test mrepo with some test data, its actions, its hooks and its
specific configs tested. Built one by one and double checked; and tests
that fail when something is forgotten, so we are reminded early: the
platform is so flexible that without full coverage testing in place it
becomes hell; with everything checked by default one can be relaxed.

**What was found**

- Tests of its own: only `base-package-runtime` (`start`) and
  `base-component-boot` (`boot`). The five protocol packages after the
  runtime and `base-component-haicc`: none. The protocols were tested by
  their modules' unit tests and by two end to end tests living elsewhere;
  the tests stayed where they were when the protocols were split into
  packages (parts 28, 37, 43 to 45).
- No test validated a package against the structure
  `package-docs-template` documents, and no rule said which tests of its
  own a package must have: a package with none passed.

**Built: the reminder first** (step 1; the packages' tests follow, one at
a time, `tasks.md`)

- **The rule**, in `haiccing/package-docs-template/test/README.md`, "Its
  own tests": a package tests what it provides, in tests of its own. One
  for each protocol its `protocol.js` configures, `test/protocol-<name>/`
  (the prefix: `help` is a generic test's name too); at least one where
  it has a program, hooks or a list of packages; a documentation package
  none.
- **The check**, a fifth generic test, `/test/package`
  (`pkgm-base-check`: `internal/package`, `validate/package.test.js`; the
  dispatcher adds the unit), in every package's `validate` and `full`:
  its files (README, LICENSE, `package.json`), its three sets (every name
  a test that is there, the generic ones where they belong), each test of
  its own a unit (`run.js`, README, a test file, in `validate` and
  `full`, not under a generic name), and the rule above.
- **The same over every package** from `tools/bare tools/code-check.js`.

**The list it fails**: `base-package-runtime`, `-protocol`, `-service`,
`-help`, `-haicc`, `-boot` (each its `test/protocol-<name>/`) and
`base-component-haicc` (a test of its own). `base-component-boot`'s `boot`
test is red with them: it runs the runtime package's `validate` in a
running mrepo and expects it to pass.

**Validated**: the check's own tests (6, in the module's 12); every
package's `full` set: the two documentation packages pass whole, the
seven named fail on `/test/package` alone, `base-component-boot` on one
assert of its `boot` test (118 of 119: the runtime package's `validate`
no longer passing); the `haicc` test, 107 of 107; the READMEs, no
problems; the code rules, none; the package check, the eight lines above
(a package can lack two things). Nothing left running. Committed red, on
`execute/main` only, not merged into `main`: for the human's check first.

## 48. The template up to standard: a folder for every test (2026-11-14)

The human: every test needs a named folder in the haiccing package's
`test/` folder, a folder a test or a test group, the generic ones too
(one existed, `test/modules/run.js`, and was removed by us in part 22).
Apart from the generic tests the naming is local. If the folders are part
of the template structure they are there from the start: a new package is
created by cloning it from the template. The model: packages
self-contained, pinned to a commit of the template, upgraded explicitly;
for now the blanket approach, because the test coverage is insufficient.
First: the template brought up to standard and committed.

- **`haiccing/package-docs-template/test/`**: a folder for each generic
  test, `help`, `code`, `mrepo`, `package`, `modules` (a group),
  `help-in-situ`, `mrepo-in-situ`, each with its `run.js` (it runs the
  test, whose code is in a module the package carries) and its README
  (what it checks). Each runs on its own, `bare test/<name>/run.js`. Its
  `full` set holds `modules` too.
- **The standard written there** (`test/README.md`): a folder each,
  nothing runs that has no folder; the generic ones come with the
  template; a test of the package's own is named as the package likes and
  can be as large as it needs.
- **The dispatcher** (`tools/lib/dispatcher.js`) finds a test from its
  folder; `test/modules/` is the group, its units the modules'. A generic
  test without its folder, in a package not yet brought to the template,
  is still found in the module that carries it.
- **The package check** (`pkgm-base-check`, `internal/package`): every
  test a set names has its folder, with its `run.js` and README, said
  once a test; the fixed name for a protocol's test (part 47) is gone: a
  package that provides a protocol, a program, hooks or an mrepo of its
  own has at least one test of its own, whatever its name.

**Validated**: the template alone. Its `full` set from its bundle, 6
units, passes; each folder's `run.js` run on its own passes (the in-situ
ones skip without an mrepo); the check's own tests, 6 in the module's 12;
the READMEs, 132, no problems (the rule caught the template's own page,
its summary 117 words: shortened). The nine other bundle packages were
not rebuilt: `tools/bare tools/code-check.js` lists what each lacks, 68
lines (`tasks.md`). On `execute/main` only.

## 49. Test reports: proof of test execution, in the template (2026-11-14)

The human: we need proof of test execution; each package has a test
report showing it passed all its tests, created before any release, in a
folder `test-reports/`. Test reports are a production pipeline concern:
the release only needs to know the standards were upheld. The final test
run is part of the pre-release; the report is added and the release
built, so the bundle contains its pre-release report. Nothing changed:
no new report, and the release build creates the same release.

- **The content hash** (`tools/package-bundle.js`): every bundle's
  `content`, in the manifest: a hash of its files, its resolutions and
  its addons, its test reports (`test-reports/*.json`) left out. It is
  what a report certifies, the same before and after the report is added:
  the report can travel in the bundle it proves.
- **The pre-release** (`tools/package-test.js <package folder>...`): the
  package assembled and bundled; its report current (it names the
  bundle's content and passed): nothing run. Else the `full` set run from
  the bundle, the report written (passed or not), the package bundled
  again with it. Exit 1 when one did not pass.
- **The report** (`test-reports/full.json`): the package, the content, the
  Bare version, the date, the set, its result unit by unit. Its status
  against a bundle (`tools/lib/report.js`): current, failed, stale (the
  package changed since), none.
- **The release** (`tools/release.js`) states each package's report
  against the bundle it built; `--strict` refuses unless all are current.
- **The template**: `test-reports/` with its README (what the report is,
  the pre-release) and its own report; the folder among a unit's parts in
  its top README. The package check asks for the folder and its README.

**Validated**: the template's pre-release: the report written, 6 units
passed; run again, nothing changed: current, nothing run, the same bundle
(sha256 and content the same); the report is in the bundle; a file of the
package changed: stale; changed back: current again. The check's own
tests, 12; the READMEs, 133, no problems; the template has no line in
`tools/bare tools/code-check.js` (77 lines for the nine others, each now
also lacking `test-reports/`). `tools/release.js` whole was not run (it
rebuilds every package): its report part on its own, over the manifest as
it is. On `execute/main` only.

**The report to read** (the human: a natural language report with a table
overview): `test-reports/full.md`, beside `full.json` and written from it
by the pre-release (`render`, `tools/lib/report.js`), never by hand: a
sentence, an overview table (the result, the units, tests and asserts
passed, when, on which Bare, the content), a table of the units, the
failures when there are any. Left out of the content hash as the JSON is.
A report current whose readable form is missing or differs: written
again, nothing run.

Found building it: the folder's README linked to `full.md`, so the first
pre-release of a package failed its help test (a broken link: the file is
only written after the run) and passed the second time. What is tested
must not depend on a report, which the content hash leaves out: the README
names the file without linking it. Validated from no report at all: the
first pre-release passes, the second runs nothing, the same bundle; the
three files are in the bundle.

## 50. The pin; package-docs-mrepo brought to the template (2026-11-14)

The human: bring `package-docs-mrepo` in line with the template. With it
the pin the human described: a package is self-contained and pinned to a
commit of the template; bringing it to a newer template is an explicit
step for that package.

- **The pin**: `template` in a package's `package.json`, the template's
  repository and the commit the package was brought to. Described in the
  template ("From the template", `package.json`); the package check asks
  every package but the template for it.
- **`tools/package-template.sh <package>...`**: the explicit step. From
  the template's own repository, at the commit it is at: the seven
  generic tests' folders written into the package's `test/`,
  `test-reports/README.md`, the pin set. The package's own tests, sets
  and READMEs are not touched.
- **`package-docs-mrepo`** brought to it, pinned to
  `haiccing/package-docs-template@deb7ed6`: the folders, `test-reports/`,
  its `test/README.md` linking each test's folder, its README linking
  `test-reports/`, `modules` in its `full` set as the template has it.

**Validated**: the template's pre-release again (its page changed: 6
units passed, report written); the check's own tests, 13; the READMEs,
140, no problems. `package-docs-mrepo`'s pre-release: 6 units, 22 tests,
51 asserts passed, the report written; again: current, nothing run; each
test from its own folder passes. Neither documentation package has a
line in `tools/bare tools/code-check.js` any more; the eight others, 78
(each now also lacking the pin). Both repositories pushed.

## 51. base-package-runtime brought to the template (2026-11-14)

The human: go on with `base-package-runtime`; we work our way up the
protocol stack one by one. And: keep the tools well structured, soon
packages are built for them so they run on the haicc platform as well.

- **`base-package-runtime`** brought to the template, pinned to
  `haiccing/package-docs-template@deb7ed6` (`sh tools/package-template.sh`):
  the generic tests' folders, `test-reports/`; its `test/README.md`
  linking each test's folder, its own, `start`, first; its README linking
  `test-reports/`.
- **`tools/README.md`**: the tools by what they are for (setting up; a
  package built, tested, brought to the template; all packages; the
  product repositories; `lib/`), and how they are kept: one tool one
  concern, what is shared in `lib/`, a line of JSON a result.

**Validated**: its pre-release: 21 units, 226 tests, 1067 asserts passed,
the report written (two minutes). `base-component-boot`'s `boot` test,
which runs the runtime package's `validate` in a running mrepo: 119 of
119 again (red since part 47). The READMEs, 147, no problems. Nothing
left running. Its repository pushed.

## 52. An action is a documented method; a test of its own, always (2026-11-14)

The human: a protocol package has a requirement it can be tested on
without an mrepo: the module and method pattern it must expose. And: a
package without custom tests gets a dummy, so there is a 0/0 entry; not
part of the template: it has to be done explicitly, the question asked
for each package: is there anything package specific that needs testing?

- **An action is a documented method** (the generic `mrepo` test,
  `pkgm-base-check`, `checkProtocol`): for every action a protocol
  configures, the function mounted is the one `external/<action>/` of a
  module the package carries exports; that method's README states its
  signature, what it returns and its errors, and its arguments where the
  config names any. Until now the two halves were checked apart (the
  wiring of `protocol.js`; a method folder's files) and nothing linked
  them.
- **The runtime's `run`** moved from the older layout
  (`mrepo-base-runtime/lib/protocol.js`) into `external/run/`, with its
  README; `lib/` is gone. The five other protocol packages followed the
  pattern already.
- **A test of its own, always** (the package check): every package has at
  least one; where nothing is specific to it, a dummy that says so: a
  test that runs nothing, reported as 0 of 0, its README giving the
  reason. Written for the package, never copied: the template has none,
  `tools/package-template.sh` copies none, and the template itself is
  asked for none. A documentation package is no longer exempt. The rule
  is in the template's `test/README.md`, "Nothing to test".
- **`package-docs-mrepo`**: its entry, `test/none/`. The question asked:
  nothing package specific, it is documentation and the generic help test
  checks every README.

**Validated**: the check's own tests, 14. The pre-releases: the template
(6 units), `package-docs-mrepo` (7 units, `/test/none` 0 of 0),
`base-package-runtime` (21 units, 227 tests, 1069 asserts), each report
written. On the rebuilt runtime: `base-component-boot`'s `validate`, its
`boot` test 119 of 119; the `haicc` test, 107 of 107. The runtime
module's own tests, 6. The READMEs, 149, no problems. Nothing left
running. The packages that carry `mrepo-base-runtime` and are not yet
brought to the template (`base-component-boot`, `base-package-boot`) keep
their copy of it until they are.

## 53. base-package-protocol brought to the template; a unit that runs nothing fails (2026-11-14)

The human: go on with `base-package-protocol`. Its own test, agreed for
this session: one that needs no mrepo.

- **`base-package-protocol`** brought to the template, pinned to
  `haiccing/package-docs-template@e633d07`.
- **Its own test, `test/mounted/`**: the package's `protocol.js`, what a
  runtime loads, checked without an mrepo: what it provides (one
  protocol, a function for every action configured and no other); its
  config value by value (both actions at the mrepo itself, each one
  argument, the protocol's name; no default, no state, no target); each
  action run on a minimal execution in memory (what `activate` writes,
  what `deactivate` removes, what each returns, each refusal, a refusal
  writing nothing); and a last test that fails when the config names an
  action that was not run. Its README says what is not there: the
  protocol in a running mrepo, the hooks, the gate.
- **Found: a unit that ran nothing was reported as passed.** The test
  first imported the package's dispatcher, which was running it: the two
  waited on each other, the process ended without a word, exit 0, and the
  report said passed with no tests. Fixed twice: the test imports
  `protocol.js` itself; and the runner (`tools/lib/dispatcher.js`) fails
  a unit that reports no summary (`no test ran: no summary reported`). A
  package with nothing to test has its dummy, which reports 0 of 0. Said
  in the template's `test/README.md`, "The result".

**Validated**: `base-package-protocol`'s pre-release: 8 units, its own
test 6 tests and 30 asserts, 32 tests in all. A unit emptied on purpose:
failed, as it must. The three packages brought to the template before,
with the new runner: the template, `package-docs-mrepo` (7 units),
`base-package-runtime` (21 units), each report written again. The
READMEs, 157, no problems (the rule caught the new test's page, its
summary 129 words). Nothing left running.

## 54. base-package-help brought to the template (2026-11-14)

The human: go on with `base-package-help`.

- **`base-package-help`** brought to the template, pinned to
  `haiccing/package-docs-template@6f78874`.
- **Its own test, `test/mounted/`**, the pattern of part 53, no mrepo:
  what it provides (one protocol, `help`); its config value by value
  (`get` at any URI, `extract` at the mrepo itself, no required argument,
  no default, no state, no target); its structure (the help layer it
  brings, atomic); `extract`, from small bundles the test writes into a
  temporary folder (each README at the URI it documents, the index, the
  problems; run again, nothing written; a README gone, removed; a README
  against the rules, counted; a URI other than `/`, refused; no packages,
  nothing); `get` (the three levels, a section by its title, the root, a
  URI under `/help`; nothing extracted yet, a section or a URI not there,
  each said; it writes nothing); the last test failing when an action was
  not run.

**Validated**: its pre-release: 7 units, 30 tests, 93 asserts, its own
test 7 tests and 40 asserts, the report written. The `haicc` test with
the rebuilt bundle, 107 of 107. The READMEs, 165, no problems. Nothing
left running. Its repository pushed.


## 55. base-package-service brought to the template (2026-11-14)

The human: continue working through until the end; the tests are in place
to ensure it comes out right.

- **`base-package-service`** brought to the template, pinned to
  `haiccing/package-docs-template@6f78874`.
- **Its own test, `test/mounted/`**, no mrepo: what it provides; its
  config value by value (the four actions at the mrepo itself, each in
  the states that allow it); its config in effect (the request check on
  each state: allowed only where named, refused with the state it is in,
  not offered elsewhere, refused when not activated); its structure (it
  starts `booted`; its list, itself last); its hooks file by file (at
  boot `help`, `runtime`, `service` activated; on `initialise` the help
  extracted; a hook file not named in the test fails it); its actions on
  a minimal execution over the package's own state file and hooks (the
  hook first, as the mrepo's own, then the state; dropped-in hooks on
  their own transition, in name order; a failing hook, the state not
  moved); the last test failing when an action was not run.

**Validated**: its pre-release: 14 units, 183 tests, 790 asserts, its own
test 9 tests and 42 asserts, the report written. The READMEs, 173, no
problems. Nothing left running.

## 56. base-package-boot brought to the template (2026-11-14)

- **`base-package-boot`** brought to the template, pinned to
  `haiccing/package-docs-template@6f78874`.
- **Its own test, `test/mounted/`**, no mrepo, no runtime: what it
  provides; its config value by value (the three actions at one name
  below the mrepo, a target needed; `deploy` its package required,
  `redeploy` optional, `teardown` none; no state of its own); its config
  in effect (the request check: no target, no package, a deeper URI, not
  activated); `deploy`, each refusal before anything is built (the mrepo
  itself, not a name, deployed already, data in `main` there, a folder in
  the way, no package, no store, a package in no source; nothing written,
  no folder left); `teardown` of a child without a runtime (its folder
  and its shortcut removed) and its refusals; `redeploy` (torn down first
  and that committed, then the deploy, from the package it was deployed
  from by default); the last test failing when an action was not run. Its
  README says what is not there: a child really built and its runtime
  started, which the module's own tests do in this package's `modules`
  test, and the boot component's between running mrepos.

**Validated**: its pre-release: 22 units, 238 tests, 1165 asserts, its
own test 7 tests and 49 asserts, the report written. The READMEs, 181, no
problems. Nothing left running.

## 57. base-package-haicc brought to the template (2026-11-14)

- **`base-package-haicc`** brought to the template, pinned to
  `haiccing/package-docs-template@6f78874`.
- **Its own test, `test/mounted/`**, no mrepo: what it provides; its
  config value by value (`goto`, the default action, at any position, its
  argument the command that follows; no state, no target); `goto` at the
  root (the command executed here, once, as given, its value returned);
  at a shortcut (sent on unchanged to the mrepo linked there, nothing
  executed here; a `haicc` of its own goes on as it is); what it refuses
  (no command, a position inside `main` other than the root, a URI
  through a shortcut, a URI not canonical; nothing executed, nothing
  sent); the last test failing when an action was not run. Its README
  says what is not there: a command as typed (the runtime's
  interpreting), and one really carried between running mrepos.

**Validated**: its pre-release: 10 units, 48 tests, 222 asserts, its own
test 6 tests and 24 asserts, the report written. The READMEs, 189, no
problems.


## 58. base-component-boot brought to the template (2026-11-14)

- **`base-component-boot`** brought to the template, pinned to
  `haiccing/package-docs-template@6f78874`. Its own test is the one it
  had, `boot`: the boot end to end, between running mrepos. Its
  `test/README.md` links each test's folder; its README `test-reports/`.

**Validated**: its pre-release: 22 units, 233 tests, 1235 asserts, the
report written (four minutes; its `boot` test 119 asserts). The READMEs,
196, no problems. Nothing left running.

## 59. base-component-haicc brought to the template; all ten in line (2026-11-14)

- **`base-component-haicc`** brought to the template, pinned to
  `haiccing/package-docs-template@6f78874`.
- **Its own test, `test/configured/`**, no mrepo: what defines the haicc
  mrepo. Its list, in deploy order, itself last; its hooks file by file,
  the state it starts in; then against the packages it lists, their
  bundles read from the sources (`SOURCES`): each is there, the six
  protocols they provide; every hook names a protocol and an action one
  of them provides; and what the hooks do, run with those packages' own
  actions on a minimal execution in memory: after the boot `haicc`,
  `help`, `runtime` and `service` open; `initialise` extracts the help;
  `start` opens `boot`, `stop` closes it, `shutdown` back to booted;
  every hook file must have run. Every protocol the listed packages
  provide is opened by a hook, except the protocol protocol, on purpose:
  a package added to the list without a hook for its protocol fails it.

**Validated, the whole**: its pre-release: 7 units, 29 tests, 87 asserts,
its own test 6 tests and 34 asserts. Then everything rebuilt,
`tools/bare tools/release.js --strict`: ten packages, every report
current (nothing rerun: the same bundles). `tools/bare tools/code-check.js`:
18 modules, 11 packages, no problems (it listed 104 lines when the folder
rule went in). The READMEs: 204 in the sources, 413 in the help tree, no
problems. The `haicc` test, 107 of 107. `base-component-boot`'s
`validate` twice more, its `boot` test 119 of 119 each time. Nothing left
running. Every package's repository pushed.


## 60. The haicc command as a Bare app (2026-11-14)

Task 0 of `tasks.md`, built first (the human: yes, a Bare app for
`haicc`, before relative URIs). The split, settled with the human while
building: **shell only for what getting Bare needs**, a folder linked,
Bare fetched, the prerequisites; then the app. The other sources actions
and the boot's machine level are in Bare.

- **The module `pear-full-square/haicc-base-app`**: the command line.
  Its methods, a directory each under `internal/`: `main` (a command
  line run: what it prints, what it says on stderr, the exit code),
  `command` (the command line read: for the mrepos, the machine level,
  the sources, the usage; what is refused, exit 2), `request` (the
  command as a record in the mrepo's inbox folder, its response waited
  for in the outbox folder), `unpack` (a stored record across lines,
  nothing of it changed: the awk scanner, in JavaScript), `outcome` (the
  completed form's output or error), `sources` (the list and the `haicc
  sources` actions: the list, `unlink`, `https`, `no-https`,
  `download`), `boot` (`boot/deploy`: the boot component's bundle run
  with the Bare running the app; `boot/teardown`). Its config
  (`internal/config.js`): the organisation, the boot component, the root
  mrepo (`boot`, `local/boot`), where a form goes back
  (`/haicc/terminal`).
- **One implementation of the command's form**: the record is made with
  `mrepo-base-request`'s `record`, `wrap` and `guid` and written with its
  inbox folder, as an mrepo sends a command on itself. The scripts' own
  JSON writing and the two awk files are gone.
- **Teardown no longer reads `/proc`**: the mrepos are walked from the
  root down (an mrepo is a folder with its `.git`; those below it are in
  the shadow of its `main`, at any depth), the deepest first, each
  runtime stopped by its directory.
- **`stop({ repo, pid })` in `mrepo-base-runtime`**: a runtime ended and
  waited for until its process has ended, asked over its connection,
  then SIGTERM, then SIGKILL. It was inside the boot protocol's
  teardown; that one calls it now, and so does the app. One
  implementation.
- **The package `haiccing/base-app-haicc`**, a new type beside
  `base-package-` and `base-component-`: a bundle from the template,
  pinned to `haiccing/package-docs-template@6f78874`. Its `run.js` hands
  the command line, the environment and the Bare running it to `main`.
  It is started as `<bare> base-app-haicc.bundle /run <arguments>`: the
  entry named first, so a URI (`/`, `/test/...`) is never taken for one
  of the dispatcher's own targets; only that first `/run` is taken off
  (a node may be named `run`). No mrepo side.
- **Its own test, `test/command/`**: the program run as a process, 45
  times, on a home folder made for it; a folder stands in for the root
  mrepo and the test answers its inbox. The usage; each way a command
  line is wrong; nothing booted; the sources; the record value by value;
  the response unpacked, as stored, the output alone, an error, a form
  not completed, none in time; the teardown's removal by name. A last
  test fails when a kind of command line was not run. Not there: the
  boot really run and running mrepos answering, which need Bare
  installed: they stay in `run.sh`.
- **`haiccing/base-linux-haicc` reduced to the first step on Linux**:
  the installer, `haicc sources link <folder>`, `haicc sources download
  bare`, `haicc prereq`, and a `haicc` that starts the app for anything
  else (`--help`: its own commands, then the app's). Before Bare and the
  app are there, anything else says what is missing, exit 3.
  `haicc-request`, `haicc-boot` and the awk files are removed. Its pins:
  the app's package in place of the boot component and the root mrepo
  (those are the app's config now). `haicc prereq` checks a source
  holding the app; the work folder is the app's, no longer checked
  there; the boot component missing from the sources is said by `haicc
  boot/deploy`, exit 3.
- **`run.sh`: the 107 checks kept, 7 added, 114.** Moved, unchanged in
  what they expect: the six wrong-command checks, `boot/teardown` and an
  mrepo command with no boot mrepo, and the sources actions that are the
  app's now (`no-https`, `https`, a folder linked twice, the two
  downloads): they run after `haicc prereq`, since the app answers them.
  Changed in how they look, not in what they expect: the sources at
  first read from the list's file (the installer's default); "unpacked
  and packed again" compares what `haicc` prints, packed again, with the
  record stored in the outbox, for three commands, one of them an error
  (the awk file it called is gone; every shape of record is in the
  module's `print.test.js`); the width check through `HAICC_WIDTH`.
  Added: before Bare the usage points to the rest; `haicc boot/deploy`
  says a prerequisite is missing; the app's other commands exit 3 the
  same; the usage whole once Bare is there (three); nothing written by
  the refused commands.
- **Dropped on purpose**: the refusal of an argument with a line break
  and the stripping of control characters (limits of writing JSON in
  sh); `haicc sources download` with nothing named fetched Bare and then
  said our packages are not published: now it is the packages only, and
  `haicc sources download bare` is the first step's.
- **Its start time**: about half a second a command (sh was instant).
  Bare's start, the dispatcher, and `mrepo-base-request`, whose `follow`
  loads `mycelium-git` (0.15 s of it). Left as it is: loading that only
  when following would change every package that carries the module.

**Validated**: the module's tests, 15 tests, 130 asserts. The
pre-release of every package that changed: `base-app-haicc` (22 units,
249 tests, 1258 asserts; its own test 8 tests, 67 asserts), and the three
that carry `mrepo-base-runtime` or `mrepo-base-boot`:
`base-package-runtime` (21 units, 227 tests, 1069 asserts),
`base-package-boot` (22, 238, 1165), `base-component-boot` (22, 233,
1235). Then everything rebuilt, `tools/bare tools/release.js --strict`:
eleven packages, every report current. `tools/bare tools/code-check.js`:
19 modules, 12 packages, no problems. The READMEs: 224 in the sources,
413 in the help tree, no problems. The `haicc` test, 114 of 114, twice.
`base-component-boot`'s `validate` twice more, its `boot` test 119 of 119
each time. Nothing left running.

**Left**: the two new repositories are the human's to create,
`haiccing/base-app-haicc` and `pear-full-square/haicc-base-app` (the
module's name is ours, to confirm); until then their product
repositories are not pushed. The others that changed are.

## 61. Relative URIs, piece A: requests relative (2026-11-14)

Task 1 of `tasks.md`, its first piece. By the method: the demo first,
`run.sh` rewritten in the new form, seen to fail, then built until it
passed.

- **A URI in a request is relative.** No leading slash; `.` the position
  itself, and so is none given; `./x` is `x`. A leading slash is refused,
  saying the URI as it is written now (`not a relative URI: /host (no
  leading slash: host)`).
- **Where the writer stands.** From outside, at `main`: `.` is `main`,
  `host` is `main/host`; the outside reaches nothing but `main`. The
  mrepo itself (a hook, a request of its own) at its root, the layer
  first. The request's form holds the URI from the root. Taken once,
  where the request comes in (`admit`: the inbox's at `main`, the
  mrepo's own at the root); a form given filled in is treated the same,
  so its URI in the stored form is from the root too.
- **The URI functions are `mycelium-uri`'s** (`lib/relative.js`):
  `relative`, `from`, `within`, `slashed`, `unslashed`, `ROOT`. `slashed`
  is the one function at the boundary for the code that still reads and
  writes by slash-led paths. `MAIN` is `mrepo-base-request`'s, which
  offers the functions too.
- **`check`** takes where the request was written (`at`: `main` from
  outside, the root for the mrepo's own, the position for a command
  executed there). A target is missing when the URI is that position. A
  config's `uris` are written at `main` (`.`, `<name>`, `**`) and matched
  against the part of the URI after `main`; a URI not in `main` is not
  offered. Internal requests are not matched, as before.
- **`exec.run(command, { at })`**: a hook stands at the root; the command
  `goto` executes stands at its position. `goto` executes at `main` and
  at the root (the mrepo's own `haicc . ...`), nowhere deeper yet.
- **`resolve`** takes the URI from the root: `main`, `main/host`; `.` is
  the mrepo itself, no shortcut there; anything else outside `main` is
  refused. Its `at`, and `shortcutOf` and `shadowOf`, are the position as
  written at `main` (`host`). The way across is said in the new form:
  `host is a shortcut: a URI does not run through it (haicc host haicc
  node-1 ...)`.
- **The boot actions**: the child is `main/<name>`; what they say back
  names it as written at `main`: `"deployed":"host"`,
  `{"tornDown":"host"}`, `deployed already: host`.
- **What an action is about is an argument**: `help/get . packages
  oneliner`, `runtime/run . packages/<org>/<package>/test/validate`. Both
  are offered at `.` only. `help/get` with no subject, or a level first,
  is the mrepo itself; its answer's URIs are relative from the root
  (`"uri":"packages"`, `.` for the root).
- **The configs**: `.` for `/`, `<name>` for `/<name>`, `**` for `/**`;
  `help/get` gets `args: ['subject?']`, `runtime/run` `args: ['target']`
  in place of `target: true`.
- **The hooks**: `"."` for `"/"` in every hook file of the components
  and the packages. The boot's own request is `boot deploy boot`.
- **The `haicc` app**: the first word is a URI and a command follows,
  unless it is one of haicc's own first words: a machine level protocol
  (`boot`, `boot/deploy`), `sources`, the usage's when alone. A position
  named so is written with `./` in front. At the root (`.`) the command
  is sent plain; anywhere else the `haicc` command as typed. One word
  that is no command: `no command '<word>'`, exit 2. A leading slash is
  passed on as typed and refused by the mrepo. `haicc boot/teardown`
  says `"tornDown":"."`. The first step's script needed no change.
- **The rest actions** (the tests' own, to go in task 3): URIs from the
  root. Their glance at the whole repository is at the root, so no
  longer reachable from outside; the cycle test reads the layers from
  the repository instead.
- **Not in this piece, as planned**: inside, every read and write is
  still slash-led (`exec.read('/runtime/service.json')`, the help
  index's keys, the records' topics, a package's own targets,
  `/test/validate`).
- **`run.sh`**: every command in the new form; 117 checks, the 114 and
  three more: a leading slash refused and said, `./host` taken as `host`.

**Validated**: the demo first: `run.sh` in the new form passed 117 of
117 on its first run after the rebuild. The pre-release of all eleven
packages (every one carries a changed module): each passing, its report
written; units, tests, asserts: `base-app-haicc` 22, 253, 1324;
`base-component-boot` 22, 237, 1296; `base-component-haicc` 8, 47, 242;
`base-package-boot` 22, 242, 1229; `base-package-haicc` 10, 51, 269;
`base-package-help` 8, 48, 251; `base-package-protocol` 9, 50, 251;
`base-package-runtime` 21, 231, 1128; `base-package-service` 14, 187,
844; `package-docs-mrepo` 8, 41, 208; `package-docs-template` 7, 41, 208.
Two failed first and were right to: an expectation still in the old form
in `base-package-boot`'s own test (a name refused) and one in
`base-component-boot`'s (a help link); both tests corrected, nothing in
the code. Then `tools/bare tools/release.js --strict`: eleven packages,
every report current. `tools/bare tools/code-check.js`: 19 modules, 12
packages, no problems. The READMEs: 224 in the sources, 425 in the help
tree, no problems. `base-component-boot`'s `validate` twice more, its
`boot` test 119 of 119 each time. The `haicc` test, 117 of 117. Nothing
left running.

## 62. A URI inside is an array of segments (2026-11-14)

Piece C of task 1 was shown to the human with every answer wrapped in an
array. Their answers, in order, and what was built from them:

- **"No, response can contain any data type."** Nothing wraps an action's
  answer. What reads nodes will answer with an array of them, by what it
  is; `service/start` answers its object as before. Nothing built for
  this: it is how it was.
- **"URI is of type Array of Namepart strings"**, corrected: **"name part
  uri segments rather than individual name parts"**. A URI as data is an
  array of segments, each a relative URI of one or more name parts; not
  split into single names, not one joined string.
- **"Request form one segment per command."** The form's URI is of that
  type too.
- **"What exists now should run as the uri as is with prefix main, 2
  segments. For external just one segment. So implement an array
  internally. Multi segment will become clear with haicc commands."**

Built:

- **The type, in `mycelium-uri`** (`lib/relative.js`): `segmented(uri)`,
  the array checked (at least one segment, each a relative URI in its
  canonical form); `joined(uri)`, the one relative URI the segments make
  (`['main', 'host']` is `main/host`, `['main', '.']` is `main`);
  `positionOf(uri)`, its segments without those that are `.`.
- **The request's form holds its URI as segments**: the prefix where its
  writer stands, then the URI as written. From outside (`OUTSIDE`) the
  prefix `main` and one segment: `["main", "host"]`; no URI, `["main",
  "."]`. The mrepo's own (`OWN`: a hook, its own request) has no prefix:
  `["."]`. A form whose URI is one string is refused inside (`not a URI:
  its segments, an array`).
- **Outside, a URI is one segment, as it is written**: the command as
  typed, a form given filled in (an array there is refused: `one segment,
  as it is written`), and what an action says back (`"deployed":"host"`,
  help's `"uri":"packages"`). Nothing of what the `haicc` command sends
  or prints changed, except that the form in a response record shows its
  URI as held: `"uri":["main","host"]`.
- **`check`**: a target is missing when the URI as written, the last
  segment, is `.`; so it no longer needs to be told where the request
  was written. From outside an action is offered where the URI is the
  prefix `main` and one segment that its config's `uris` name.
- **`exec.run(command, { at })`**: `at` is a prefix, the segments the
  command's URI is put behind. `goto` passes its position
  (`positionOf`), `['main']` at main's root, none at the root.
- **`resolve`, the boot's `child`, `help/extract`, the rest actions**
  take the segments and work on what they make (`joined`).
- **Not built, on the human's word**: more segments than the prefix and
  the URI (a jump's, a command executed at a deeper position), the
  prefix on what an answer returns. They come with the `haicc` commands
  that need them.

**Validated**: the `haicc` test first, 117 of 117 after the rebuild.
The pre-release of all eleven packages, each passing, its report
written; units, tests, asserts: `base-app-haicc` 22, 254, 1342;
`base-component-boot` 22, 238, 1316; `base-component-haicc` 8, 48, 256;
`base-package-boot` 22, 243, 1250; `base-package-haicc` 10, 52, 284;
`base-package-help` 8, 49, 265; `base-package-protocol` 9, 51, 265;
`base-package-runtime` 21, 232, 1146; `base-package-service` 14, 188,
861; `package-docs-mrepo` 8, 42, 222; `package-docs-template` 7, 42, 222.
Three failed first, each a test still handing an action a URI in the old
shape, which the code now refuses: `base-component-haicc`'s `configured`
(its stand-in for running a hook), `base-package-boot`'s `mounted` and
`mrepo-base-boot`'s deploy test (a name with a capital or `..` is now
stopped as a segment, before it is looked at as a name);
`base-component-boot`'s `boot` once more for a slip in its own helper.
The tests corrected, nothing in the code. Then
`tools/bare tools/release.js --strict`: eleven packages, every report
current. `tools/bare tools/code-check.js`: 19 modules, 12 packages, no
problems. The READMEs: 224 in the sources, 425 in the help tree, no
problems. `base-component-boot`'s `validate` twice more, its `boot` test
119 of 119 each time. The `haicc` test again, 117 of 117. Nothing left
running.

## 63. The crud protocol; the shortcuts in main; the xpath layer gone (2026-11-14)

Task 2 of `tasks.md`, on the human's go for its proposed points ("Yes,
we will do xpath for linked repos later"). The demo first: 19 checks
added to `run.sh`, then built until they passed.

- **The module `pear-full-square/mrepo-base-crud`** and **the package
  `haiccing/base-package-crud`** (from the template, pinned to
  `haiccing/package-docs-template@4de4eae`): the `crud` protocol,
  `create`, `read`, `delete`. No `update`: asking for it answers `no
  action: crud update (create, delete, read)`.
- **A node** is a folder holding its document, `.node.json`: `{}` when
  no value is given. Its children are the folders in it that hold one.
  The layer itself is a node (its document `{}` when it has none). A
  node's name is a plain name, no extension.
- **`create <URI> [<value>]`**: the node and every node above it made;
  one there already left as it is, whatever value is given. It answers
  with every node of the path, each saying `created` or `there`.
- **`read <URI>`**: an array of the nodes selected, each `{ uri, value,
  children }`, the children by name; `*` as the last name part selects
  the children; nothing there is an empty array. At a shortcut the node
  carries `shortcuts`, the mrepos its data comes from.
- **`delete <URI> [recurse]`**: the nodes selected removed; one with
  children only with `recurse` (refused otherwise, saying how; nothing
  of a selection removed then); nothing there: an empty array. The
  layer itself is not deleted. Deleting a shortcut removes the link.
- **The URI in an answer is in the internal format**, its segments:
  `["main", "swarms/swarm-1"]`; the request's prefix kept, so the
  mrepo's own requests get `["runtime/log"]`.
- **A URI does not run through a shortcut**, in `crud` as elsewhere:
  what is below one is refused, with the way across.
- **A name part may be `*`** (`relative`, `mycelium-uri`): a URI that
  selects. Elsewhere it selects nothing or is refused as no name.
- **Where it is open**: in the boot mrepo from its boot (a `boot` hook),
  in a haicc mrepo behind the service's door, with `boot` (`start` and
  `stop` hooks). Both components list the package.
- **The shortcuts are in main**: a shortcut is a node, its sources
  beside its document in `.shortcuts.json`, a list: `[{ "mrepo":
  "local/host" }]`. Only the link. What is local to the machine that
  deployed the child (the package it came from, the packages placed, its
  layers, its runtime's process) is in the deploying mrepo's runtime
  layer, `runtime/deployed/<name>.json`: `main` replicates, that does
  not. `boot/deploy` writes the node, the link and the local record;
  `boot/teardown` removes the three. `resolve` reads the list, the first
  source in use.
- **The xpath layer is gone**: from the runtime package's structure, the
  targets an action writes, the layer names `mycelium-git` knows, the
  documentation (its page's content moved to `main`'s).
- **Piece B of task 1**: the paths an execution reads and writes by are
  accepted relative from the root as well as slash-led
  (`runtime/service.json`, `/runtime/service.json`). `crud`, the
  shortcuts and the boot's child are written relative.
- **Kept small on purpose**: the crud package does not carry the request
  module, so its own test does not run the check on a request; that, and
  `update` refused, are in `run.sh`.
- **Later, on the human's word**: what XPath does across linked mrepos
  (reading through a link, a selection that crosses one, several sources
  and local data combined).

**Validated**: the demo first: `run.sh` with its 19 crud checks, 136 of
136 on its first run after the rebuild. The pre-release of all twelve
packages, each passing, its report written; units, tests, asserts:
`base-app-haicc` 22, 254, 1349; `base-component-boot` 22, 238, 1326;
`base-component-haicc` 8, 48, 263; `base-package-boot` 22, 243, 1259;
`base-package-crud` 10, 56, 345 (its own test 5 tests, 40 asserts);
`base-package-haicc` 10, 52, 291; `base-package-help` 8, 49, 268;
`base-package-protocol` 9, 51, 268; `base-package-runtime` 21, 232,
1153; `base-package-service` 14, 188, 864; `package-docs-mrepo` 8, 42,
225; `package-docs-template` 7, 42, 225. Two failed first, for their
tests: `base-package-boot`'s `mounted` (a slip in the order of its own
definitions, then an expectation of what a redeploy removes) and
`base-component-boot`'s `boot` (three expectations that did not count
`crud` among the active protocols). The tests corrected, nothing in the
code. Then `tools/bare tools/release.js --strict`: twelve packages, every
report current. `tools/bare tools/code-check.js`: 20 modules, 13
packages, no problems. The READMEs: 241 in the sources, 466 in the help
tree, no problems. `base-component-boot`'s `validate` twice more, its
`boot` test 120 of 120 each time. The `haicc` test again, 136 of 136.
Nothing left running.
