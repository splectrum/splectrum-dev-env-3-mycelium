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
