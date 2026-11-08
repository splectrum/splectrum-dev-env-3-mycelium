# Step 1, part 1: the review of phase 2's code

Status: **findings, for discussion** (2026-11-08). Read only: nothing
changed by it. The code as set up from `splectrum/dev-env-2-p2p-cluster@c6b73bb`
(`../0-setup/`). Request: `b8d67a7:pending/phase-3/step-1-review/request.md` (first written as
`d9444b2`, which took `node_modules/` along by mistake; rewritten with the
human's word, 2026-11-08, so the commit messages naming `d9444b2` mean this one).
Three reviewers in parallel (mycelium and p2p; HAICC, the
package manager and tools; Splectral), each against `rules.md` (single
concern first) and `docs/rules.md`; their main claims spot-checked here.
Line numbers are indicative.

**M**: a mechanical fix, no design question. **D**: needs a decision with
the human.

## The big picture

1. **A dead layer from phase 2's first platform** (D, removal proposed;
   **removed**, all of it, with the human's yes: `2-removal/`).
   The project model (`project.json`) went with phase 3's restructure; what
   was built on it still sits beside the current platform:
   - the root `haicc` launcher (needs `haiccing/<p>/project.json`: none
     exists; runs `node`), and `demos.md`'s section on it;
   - `p2p-swarm-manager` (in no package, imported by nothing; its tests
     `node --test`, failing; it calls a node-manager verb that no longer
     exists and a `build.sh` that is gone);
   - `haicc-deployment`'s project layer (`index.js`, `cli.js`, `human.js`,
     `splectral-action.js`, `splectral.json`, `lib/human.js`): only the
     launcher and its own test use it;
   - `haicc-reconcile`: at runtime used only by that layer and
     `p2p-swarm-manager`; still shipped in `base-package-haicc` (and the
     platform test tampers with its `index.js`, so it needs another
     target);
   - `test-run/` and every module's `test/commands*.txt` and
     `test/variants.js`: read only by `test-run/`, which runs the CLIs with
     `node` (they need Bare) and expects the modules at the root (before
     `<org>/<repo>`); broken. With it, `mycelium-repo` (its only user is
     `test-run/seed.sh`; in no package).
   What stays live of these: `haicc-deployment`'s `haicc.js` and
   `lib/{container,selftest,log}.js`; `p2p-node-manager` (through
   `base-demo-other-host` and `splectral-p2p-actions`).

2. **One concern, several places** (M where the place is obvious, D where
   it is not):
   (The form of a fix, with the human, 2026-11-08: a shared concern becomes a
   single-concern module of its own, used by the modules that need it and
   copied into each package by the writer; not one module reaching into
   another's files. `rules.md`, "One concern, one place" and "Shared in
   development, copied into packages".)
   - `lib/pkgm.js` byte-identical in `haicc-base-boot` and
     `haicc-deployment`; `lib/log.js` the same but a comment; the "newest
     log or a new file" logic again in `boot.sh`, `shutdown.sh`,
     `release.sh`.
   - Docker: five spawn wrappers (`haicc-base-boot/haicc.js`,
     `haicc-deployment/lib/container.js`, `haicc-reconcile`'s machine
     provider, `p2p-node-manager`, `splectral-p2p-watchers`), the container
     hardening flags twice; the network and IP in the boot, the image and
     container in the deployment. D: one Docker module.
   - The host checks twice (`haicc-base-boot/lib/host.js`,
     `haicc-reconcile`'s machine provider), kept agreeing by a parity test,
     already drifted (`timeout 20` on one side only).
   - Name validation in three forms (`cleanName`, `haicc-reconcile`'s
     `validateName`, `mycelium-uri`, the one `rules.md` names); the layer
     and repo CLIs hand-roll it (and accept `a.b`).
   - Flag parsing in eight CLIs, three variants (some cut a value at its
     second `=`); JSON read/write in five places (the package writer's not
     atomic); the 12-hex hash `sed` in five; the platform pair's names
     hard-coded in five; JSON-lines splitting in three; the observer
     emitter and `hex` in every p2p module; Docker inspect, `node.json`
     reading and the manager's topic layout in both p2p-watchers and
     p2p-actions; the booted tests' `step`/`expect`/`short` copied into
     each `boot`; `p2p-node/requests.js` re-implementing
     `mycelium-layer`'s intake (without its name checks).

3. **Knowledge across concerns** (D):
   - `mycelium-git` carries `p2pgitBackend` and a Hyperdrive test (p2p in
     mycelium); `p2p-mrepo` imports `mycelium-git` (by design: it is the
     joint).
   - `p2p-node` imports `splectral-p2p-observer` (p2p knows Splectral;
     undeclared, not shipped in `base-swarm-three-nodes`).
   - `p2p-node` holds management state (the manager's shadow: container,
     image, ip); `p2p-node-manager` knows p2p-node's and the observer's
     event kinds.
   - Splectral's contract has p2p keys in the abstract world (`joined
     {key}`, links by `toKey`), the model ships keys to the browser;
     `splectral-server` hands the whole config (vaults included) to every
     action; `base-demo-other-host` carries a Docker subnet and p2p words.

4. **Boundaries** (M unless said):
   - Not validated where they enter: the repo segment in `./haicc boot`
     (`../x` passes), the observer's `write` name (into a path), the
     invitation's fields and `--master`/`--bootstrap` (a bad hex gives an
     empty key), `p2p-rns`'s `key`/`id`/`type`, Splectral's action
     arguments (D: declared in the manifests, checked by the server).
   - Validated again inside: `p2p-rns`'s `resolve`/`list`, `pkgm`'s
     `assemble`: the checks removed (happy path inside; `haicc-reconcile`
     gone).
   - Names (decided, 3 below): a new name cleaned, an existing one taken
     as given; the boot cleans existing swarm and node names today.

5. **The rules, broken by the code** (M):
   - Rule 2 (no hidden files): `mycelium-topic`'s folder storage writes
     `.<pid>-….tmp` (`lib/folder.js:25`).
   - Rule 7 (everything printed is logged): two `fetch.sh` calls drop
     stderr.
   - Rule 21 (a test cleans up): the mycelium and p2p suites leave temporary
     folders behind (805 in `/tmp` after one run).
   - Rule 22 (a test that cannot run is skipped and said): in-place tests'
     `needs` ignored.
   - Rule 24 (10 minutes): `bootTests` runs tests with no time limit.
   - `_` reserved: `sets.mjs`'s `tests_`.
   - `with` as a property in action records: not a JavaScript identifier
     (data names; D).
   - Rule 27 (the boot downloads nothing) and the node image's `FROM
     debian:bookworm-slim` (D: the agreed `docker load`).

6. **Bugs** (M):
   - `mycelium-topic`'s `follow`: `tick()` not awaited, no catch: a
     rejecting `onRecords` is an unhandled rejection.
   - `fetch.sh --refresh` from a folder can delete the package when its
     copy fails.
   - `splectral-p2p-actions`'s stop says `stopped: true` for a stale pid.
   - `base-view-map`'s node page filters links on `to`, events carry
     `toKey`: incoming links never show.
   - `splectral-model`'s `restore` merges instead of replacing (stale nodes
     after a reconnect).
   - The committed offset: Kafka's next offset in `splectral-server`, the
     last processed in `p2p-node-manager`: one meaning, as Kafka's.
   - `p2p-connect`'s `closed` list grows without bound, sent in every
     metrics event.
   - Withdrawn as error anticipation (`rules.md`, the boundary: happy path
     inside): `p2p-channel`'s `request` without a timeout (a closed channel
     already rejects what is pending); a guard against two scenario runs at
     once.
   - `base-demo-other-host/test` fails 2 runs in 3 here (`../0-setup/`):
     `send-request` (`splectral-p2p-actions/request.js`) keeps the channel
     of the first connection it saw and never notices it closing (`channel
     closed`); the test's teardown then leaves host B's container and
     networks (rule 21).

7. **Documentation against the code** (M): READMEs saying `node cli.js`,
   "runs on Node and Bare", "Node's built-ins only", test counts, stdin for
   keys where a key file is mounted; `haicc-base-boot`'s README and hints
   describing empty swarms by name; `--verbose`/`--debug` documented and
   doing nothing (D: build or drop); `docs/design/functionality.md` (a
   default `boot` per type: only `teardown` exists; `pkgm-base-manager` in
   the wrong package), `packages.md` (statuses, which packages are
   defined), `releases.md` (the setup carries the pair); `HAICC_PLATFORM`
   undocumented; `splectral-timeline` "scrubbable" (it filters); the
   Splectral design's "a test enforces it: no application imports p2p"
   (no such test); `haiccing/README.md` and the profile on the old model.

8. **Tests missing** (M): Splectral's browser side (shell, transport,
   scenario page, timeline, base-view-map), `splectral-replay`,
   `splectral-p2p-actions`' invite/request/invitation/state/write,
   `p2p-node-manager`'s `manageNode`, `splectral-model`'s `restore`.

9. **Size**: `haicc-base-boot/haicc.js` (839 lines) holds some ten
   concerns (the CLI, prompts, host checks, three levels, Docker network
   and addresses, launchers, the Splectral server and other-host managers,
   the booted-test runner, sources, the cold shutdown). The extraction into
   `lib/` is M; whether Splectral and Docker leave the boot is D.

## Decided, section by section (2026-11-08, with the human)

1. **HAICC's own copies** (2: `lib/pkgm.js`, `lib/log.js`, `fetch.sh`):
   - Fetching from the sources (`fetch.sh`: fetch, list, refresh) is the
     package manager's, not HAICC's: it moves into `pkgm-base-manager`,
     its open findings fixed with it (4, 6, 5's rule 7).
   - HAICC uses the package manager at its one fixed place: the
     `base-package-pkgm` beside `base-package-haicc`, which every cold
     boot copies in (the pair). `lib/pkgm.js`'s development path (the
     module next door) goes; the tests set the pair up as a work folder
     has it.
   - The log writer (`lib/log.js`, and the shell's): left until the logs
     are a mycelium repository.

2. **Docker** (2): one single-concern module, `pear-full-square/docker-manager`
   (the human's name; Docker is neither HAICC nor p2p): the call, networks
   (with a subnet; addresses), the node image, hardened containers (run,
   stop, remove, pause, inspect, logs as JSON lines); taken from the code
   as it is. Used by `haicc-base-boot`, `haicc-deployment`,
   `p2p-node-manager` (its Docker calls only; whether host B runs HAICC is
   a later question) and Splectral's p2p side; copied into each package
   that needs it. Its product repository: created by the human.

3. **Names** (2, 4): two concerns, not one twice. The boot cleans a new
   name (lowercase; every run of other characters a `-`; the change said);
   `mycelium-uri` validates at the boundary. A name referring to something
   existing is taken as given, else an error (`docs/rules.md` 1, reworded):
   the boot cleans only where a name is made (a new swarm, a node added by
   hand), looks the rest up exactly (which closes `../x`). The branch-name
   helper copied in the `mycelium-git` and `mycelium-layer` CLIs moves into
   `mycelium-uri`.
4. **The boundary** (`rules.md`, reworded): inside, the happy path; no
   error anticipation; a failure handled where it shows (stop and say, or
   correct). Sections 4 and 6 sorted against it.

5. **Command lines** (2): only HAICC takes commands from a person; every
   other command line gets its arguments from our own code (internal: the
   happy path). `haicc-cli-parser` (the human's name) for HAICC's commands,
   the transitional tools using it until HAICC replaces them; the internal
   command lines keep their plain parsing, values kept whole.
   - **Design / refactor list** (the human):
     - HAICC in the container too: the node's program started through the
       node's HAICC, not `p2p-node/cli.js` directly.
     - Splectral wrapped in HAICC: the server and its `act` through HAICC.
     - The cold boots: the initial one (the setup's `./boot`) may use the
       module directly; every other cold boot is wrapped in HAICC.
   - **Implementation**: an analysis of the shell commands (the scripts in
     the modules, the booted tests, the setup) and how best to wrap them
     in HAICC.
   - The CLIs nothing called since `test-run/` went (`mycelium-git`,
     `-layer`, `-uri`, `-xpath`, `p2p-mrepo`, with `p2p-mrepo`'s
     `engine.js` and `test/fixture.sh`): removed, redundant; their
     operations HAICC-wrapped from now (the human).
   - A shell script is glue (`docs/rules.md` 30, the human): plain `sh`,
     as evolved as the functionality needs, its logic in modules.

6. **The data type** (2: JSON read and written in five places, one of them
   atomic): one single-concern module, `pear-full-square/mycelium-value`
   (the human's yes): the value's form in memory (plain objects, as avsc
   gives them); its serialisation (JSON now; AVRO later, through the
   barified avsc; compact-encoding where a value needs binary), decided
   only there; values at rest (a file read into a value, a value written
   atomically); data names (lowerCamelCase, their URI form both ways),
   moved from `mycelium-uri`, where nothing uses them. Used by HAICC, the
   package manager and the records, copied into their packages. Its
   product repository: created by the human. Where it sits, and the
   envelope and content of values: `vision.md`, "Values on the wire and at
   rest".
   Refined (with the human): three concerns, a module each. The data type
   (`mycelium-value`: values in memory, data names; encoding handed to a
   handler); an encoding, a handler module from the start
   (`mycelium-value-json`: one value to bytes and back; `-avro` later);
   storage containers, by layout, each using the encoding it is given
   (`mycelium-container-document`: one value per file, written atomically;
   `mycelium-container-lines`: one value per line, appended, read in order,
   for a line-safe text encoding such as JSON). Values at rest move from
   `mycelium-value` to the containers.
7. **The observer call** (2): `p2p-observe`, the emitter and `hex` of the
   eight p2p modules (the human's yes).

8. **Splectral's p2p side reading others' layouts** (2): each piece back to
   its owner (the human's yes): Docker's through `docker-manager`; the
   swarm's nodes and their configs (HAICC's work folder layout) asked of
   HAICC (Splectral wrapped in HAICC), not read from its files; the node
   manager's topic layout exported by `p2p-node-manager`. The code reviewed
   further for improvements as the work builds on these components.

9. **Requests** (2: `p2p-node`'s intake a copy of `mycelium-layer`'s):
   `mycelium-layer` keeps the branches; the request's concerns split out,
   by its life (the human's yes): `mycelium-request-submit` (a request from
   a source placed into `pending/default`, once, one function per source
   type, each validated where it enters: a folder, a peer's bundle) and
   `mycelium-request-execute` (execution and its response, one unit, as
   `executeRequests` is). The queue (`plan` today) waits for the request
   manager, to be designed; `p2p-node` keeps its own part (queueing, the
   sender, its events). Recording a unit for an exact rerun may later be a
   concern of its own, shared with the development pipeline. Both product
   repositories created by the human.

10. **p2p in `mycelium-git`** (3): the engine is handed in, once, by the
    owner of the storage. `mycelium-git` keeps the contract, the iso-style
    adapter (`isoStyleBackend(engine, gitdir, { fs })`) and the native
    backend; the `p2pgitBackend` and `isogitBackend` wrappers go, and its
    dependencies on `p2p-git` and `isomorphic-git` with them (development
    dependencies only, for the contract suite on every engine). A storage
    kind's owner chooses its engine once: `p2p-mrepo` (a Hyperdrive:
    p2p-git), whatever opens repositories on disk (native git). The
    Hyperdrive test moves to `p2p-mrepo`. No new modules (the human's yes).

11. **`p2p-node` knows Splectral** (3): Splectral was plumbed in for the
    demos only and is to be done properly in this phase (the human); the
    recommendation (an application attached to a node from its
    configuration, naming none) is in `../plan.md`, taken up when the work
    touches that area.

## Product repositories (2026-11-08, the human)

Archived on GitHub by the human: `pear-full-square/haicc-reconcile`,
`p2p-swarm-manager`. To archive: `pear-full-square/mycelium-repo`.
`haiccing` stays untouched for now: `base-package-third-party` and the
code-only packages (`base-package-mycelium`, `-p2p`, `-splectral`) are
kept, and `docs/design/packages.md`'s "the code-only packages ... return
one at a time" stays as it is.

## Proposed order

1. Remove the dead layer (1), with the human's yes: the code becomes what
   the platform is.
2. The mechanical fixes (2 where obvious, 4 to 8), each module's tests and
   the packages' full sets from a fresh release after.
3. The design questions (1, 2's places, 3, 9), with the human, before the
   refactor they lead to; the hive and mount design takes them into account
   (what mycelium knows, what a node knows).
