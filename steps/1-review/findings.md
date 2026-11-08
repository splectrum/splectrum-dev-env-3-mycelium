# Step 1, part 1: the review of phase 2's code

Status: **findings, for discussion** (2026-11-08). Read only: nothing
changed by it. The code as set up from `splectrum/dev-env-2-p2p-cluster@c6b73bb`
(`../0-setup/`). Request: `d9444b2:pending/phase-3/step-1-review/request.md`.
Three reviewers in parallel (mycelium and p2p; HAICC, the
package manager and tools; Splectral), each against `rules.md` (single
concern first) and `docs/rules.md`; their main claims spot-checked here.
Line numbers are indicative.

**M**: a mechanical fix, no design question. **D**: needs a decision with
the human.

## The big picture

1. **A dead layer from phase 2's first platform** (D, removal proposed).
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
   - Validated again inside: `p2p-rns`'s `resolve`/`list`,
     `haicc-reconcile`'s engine, `pkgm`'s `assemble`.

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
     metrics event; `p2p-channel`'s `request` has no timeout.
   - Splectral scenarios: two runs at once interleave in one topic.
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

## Proposed order

1. Remove the dead layer (1), with the human's yes: the code becomes what
   the platform is.
2. The mechanical fixes (2 where obvious, 4 to 8), each module's tests and
   the packages' full sets from a fresh release after.
3. The design questions (1, 2's places, 3, 9), with the human, before the
   refactor they lead to; the hive and mount design takes them into account
   (what mycelium knows, what a node knows).
