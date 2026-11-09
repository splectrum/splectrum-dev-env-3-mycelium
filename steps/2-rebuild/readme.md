# Step 2. The rebuild

Request: `c0e14a4:pending/phase-3/step-2-rebuild/request.md` on
`pending/default`. Design: `docs/design/`. Collaborative: decided with the
human as it moves along. The thin path first: (1) boot creates the
repository; (2) the functional framework added (the mycelium bundle); (3)
`mycelium-repo-main` started; (4) the inbox and outbox, a minimal
dispatcher; (5) requests flowing, demo functionality, `haicc request add`.
Then `main` populated and the warm boot (repository functionality); swarms,
nodes, centralised logs, the demos.

## 1. Boot creates the repository: in progress

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

Not yet: the tests run from the bundle (their third-party code, brittle,
is not reached from the entry); the other packages (`swarm-three-nodes`, the
demos) still defined on the old platform, written with `--only` meanwhile;
`haicc-deployment` still pointing into the old `haicc-base-boot`.
