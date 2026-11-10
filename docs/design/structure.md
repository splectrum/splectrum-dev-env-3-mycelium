# The levels' structure, code without a code folder, Pear below HAICC

Status marks: **built** (in the code, tested), **agreed** (decided, not
built), **open** (to settle), **to probe** (to try before designing
further). Decided with the human, 2026-11-08 (phase 3, step 1's review); the
folder structure to be fixed in this phase, step by step.

## Every level set up as a node is

**Agreed.** The host, a swarm's master, a node: the same structure. Its code
from its packages layer (bundles: below); its
config, state and log in its own repositories, in a store of its own
(`repositories.md`); its own HAICC. Then it does not matter where HAICC
runs (a container, the host, another machine): one structure, one set of
commands, one test path; execution becomes portable (`repositories.md`).

- **HAICC is mainly a wrapper**: of the package manager, `docker-manager`,
  mycelium's operations, with what a wrapper needs (config, the levels).
  The root's and swarms' HAICC (`haicc-base-boot`) and the node's
  (`haicc-deployment`) converge into one; its split into more modules
  (`haicc-base-host`, `-root`, `-swarm`, `-node`) comes lazily, when the
  number of operators grows (the rename of `haicc-deployment` held until
  then). Host B simply runs a node setup.
- **What differs is what is provided, an organisational matter**: Docker, a
  person at a terminal, the network, the runtime. HAICC asks what is
  provided, not where it is (`host.json`, agreed in `packages.md`,
  generalised). A capability may be provided from elsewhere: a node
  managing Docker through a proxy on the host (`docker-manager` exposed to
  authorised peers, narrowly: its swarm's containers, hardened), as
  `vision.md`'s configurable authority.

- **Mycelium repositories at every level, the host's install included**
  (agreed, the human, 2026-11-09: it closes the loop). A level's code is
  its packages layer (the bundles; the host's is the host's global store),
  its config and state its own layers, its log a topic, its requests the
  request branches; what it runs, bundles copied out of its packages layer
  into its scope. Swarms and nodes the same, their packages layers filled
  by replication. Outside, at every level, by necessity: the boot
  (the bootstrap: it runs before any repository exists, from the setup's or
  the Pear release's bundle and shell, creates the level's repository and
  commits the release's bundles into its packages layer; initialisation runs
  out of the repository); the substrate (the store: Corestore and RocksDB
  on disk; Bare; Docker; native addons as files); the minimal plain-file
  log. The host is no longer special: the first level, made by the cold
  boot.

*Why*: the same structure everywhere makes execution portable and the
platform one thing to build and test.

## One writer per store, any number of readers

**Agreed** (the human, 2026-11-09: single writer is the design we want).
A level's store (Corestore, persisted by `hypercore-storage` in RocksDB)
has one writer process at a time: it takes a lock (the store's `CORESTORE`
file) when opened writable. Tried 2026-11-09 on our stack, on Bare, a writer
holding a store: a second process opening it to write fails (`File
descriptor could not be locked`); opened read-only it works, taking no lock,
and a reader opened after an append sees it; the writer closed, another may
write. (`wait` queues a writer for the lock.)

- **Each level has one writer process for its store**: the level's HAICC
  process; commands that change something go through it (or wait for the
  lock). Commands that only read (status, a list, browsing by URI) open the
  store read-only, any time, in parallel. The same single-writer rule as
  Hypercore's, one level down.
- **Two writers, two meanings**: a core's writer holds its key pair (a
  topic's producer: the only one who can append, every block signed into
  its Merkle tree); a store's writer is the process holding the store's
  lock (each level's own: it stores what the level holds, its own cores and
  replicas of others'). A node following another's topic holds a copy in
  its own store, written by its own store's writer, each block verified
  against the producer's signature; it cannot append. The copy may be
  partial (sparse replication: the blocks it downloaded) and cleared when
  no longer needed (retention per node), the producer's log untouched:
  redundancy and local reads, authority where it belongs.
- **The single writer is the one open store** (tried 2026-11-09): a store
  opens writable once; a second open fails even in the same thread, and
  from a child thread (`bare-thread`) of the same process; a Bare thread
  cannot share another thread's store (each its own isolate, sharing only
  messages). The store's writer is the open store, held by
  `mrepo-base-runtime` (the repository's runtime); the cores' writer is the same open
  store (every core of the repository, its layers' drive, its topics, its
  outbox, keyed from the store's primary key). Child threads and launched
  commands are its clients, never writers: a child thread sends what it
  wants written as a message; a launched command (a request's execution)
  writes into the execute layer itself, on disk (changed 2026-11-09:
  `repositories.md`, "Layers by their writes"), the runtime, on
  completion, committing, merging and recording.
- **More writers, more stores** (agreed, the human, 2026-11-09): another
  store (its own folder, its own primary key) has its own single writer (a
  child thread, another process, a package's process); the repository
  attaches it by reference (its cores' keys in the repository's mappings,
  pinned at its commits) and reads it by replication from that store's
  writer (followed live and verified; replicated into its own store or read
  sparsely). Writes never cross stores; what joins them is a reference and
  replication, as between machines. So a level may have several stores,
  each with one writer, composed by reference: the level's repository
  (`mrepo-base-runtime`), a log store written by a logging thread (heavy
  appends kept off the runtime), a package's own store.
- **A read-only reader sees a snapshot as of its opening** (tried
  2026-11-09: a reader kept open while the writer appended five times saw
  none of them, `update()` returning `false`; a reader opened afterwards saw
  all). So read-only opening is for short-lived readers: a command that
  opens, reads and closes (status, a list, `haicc read <uri>`) sees all
  written before it opened. A long-lived reader (Splectral watching a
  level, a log viewer, anything waiting for new data) follows the writer
  instead (proposed): the level's writer process serves its cores to local
  followers over a local connection, the same Hypercore replication as
  between peers, appends arriving live and verified: one mechanism for the
  next process and the next machine; reopening periodically only as a
  stopgap.
- **What else RocksDB means for us** (substrate, never used directly): a
  native addon (`rocksdb-native`, in `addons/`); backups are a closed store
  copied or replication to a backup peer, not a copy of an open store's
  folder (backups belong to the repositories: `repositories.md`); the store
  holds the Corestore's primary key in clear (`p2p-store`),
  so its folder is protected as a key is; opaque by design, views coming
  from the repositories.

## A level: a mycelium repository first, its layers stored by their writes

**Agreed** (the human, 2026-11-09): a level is a mycelium repository with
layers, first; a person sees it through a Splectral component. A layer is
stored in one of **three modes**, by its writes (`repositories.md`, "Layers
by their writes"): **atomic** (in the Corestore, committed by the main
thread), **replicated** (in the Corestore, and copied out as files for a
process that needs them: Bare runs a bundle from its file, `dlopen` loads an
addon from one), **non-atomic** (on the filesystem only, written directly).
(Changed 2026-11-09: a folder was first only a translation, where a host
process needs files.)

| Layer | Holds | On the filesystem |
|---|---|---|
| `main` | the level's data (config, state) | no (seen by URI) |
| `packages` (a layer of its own, like `main`) | the bundles and their native addons, as objects, laid out as a source (the pinned manifest, `<org>/<package>.bundle`, `addons/<sha256>`) | replicated: `<work>/mrepos/host/packages/`, the bundles this level runs and the addons they name |
| `execute/main` | executions: only the visible change to `main` (from `main`, synced before each) | no |
| `request/pending/default`, `request/execute`, `request/done` | the requests and their metadata (`repositories.md`) | no |
| the log topic | the level's log | no (the minimal file log aside) |
| child levels | each its own repository, named in this one's mappings by URI | a child's folder, where the child runs on this host |

Always there, outside the layers: `haicc` (the boot's way in, shell),
`store/` (the substrate: the repository itself, Corestore and RocksDB),
`log/` (the minimal plain-file log, **open**: its scope, for the boot
and the store's own failures).

- **The folders are an install-internal issue** (agreed, the human,
  2026-11-09): people and agents interact through the command line or
  Splectral's server, with our URIs; how the host's or a container's
  folders are set up is the install's own concern, not part of the
  platform's interface. What follows is how the install translates, free to
  change.
- **Each repository a folder of its own, `<work>/mrepos/<name>/`** (**built**,
  agreed with the human, 2026-11-09; replacing `<work>/haicc/`, built first, itself
  replacing the level's folder as the repository's root): a repository is
  stored partly in the Corestore, partly on the filesystem, so every
  repository has its place in the folder structure; a flat list for now,
  each by its unique name (a URI segment; its id stays its identity, what
  references pin). Under it, a layer's files at the same path as its URI
  (`mrepos/host/inbox` is `/inbox` of `host`). The host's repository is
  `host`: of type `haicc` (HAICC is the repository's API), it is the host,
  the node bridgehead. **One Corestore per host**, `<work>/store/`, holding
  every repository's atomic and replicated layers, its single writer the
  host's runtime; beside it `<work>/setup/` (the source the boot came
  from) and `<work>/log/`. A command finds its level by walking up from its
  bundle to the folder holding `store/`.

```
<work>/
  mrepos/
    host/                                    the host's repository (type haicc)
      inbox/                                 non-atomic: /inbox, a message a document
      outbox/                                non-atomic: /outbox
      packages/                              replicated: the packages layer's files
        haiccing/base-package-boot.bundle    bundles by [org]/[package]
        haiccing/base-package-haicc.bundle
        addons/<sha256>                      native addons, one store; bundles name them /../../addons/<sha256>
        manifest.json                        the pinned manifest, packages keyed [org]/[package]
  store/                                     the Corestore: every repository's atomic and replicated layers
  setup/                                     the source the boot came from
  log/                                       the minimal plain-file log
```

- **What is in the Corestore is never written as files except as a copy**:
  replicated layers only, for the process that needs them (Bare, `dlopen`,
  Docker's mounts); a person never needs one: the terminal reads by URI,
  Splectral shows it.
- **A replicated layer's files are a copy**: extracted from the layer at a
  pinned commit, never edited, replaced when the layer moves.
- **Nesting follows composition**: a child level is its own repository,
  named in the parent's mappings; on the host its folder sits inside the
  parent's where it runs there; a child running elsewhere has only its name.
- **A package's own data** is a repository of its own (one writer: the
  package's process), composed into the level by URI, its `store/` under
  the level's folder.
- **A node in a container**: its repository's store is where its writer
  runs, inside the container; the host holds only the views the container
  needs (its bundles, its addons).

### Boot: getting the host's repository (the service protocol's `boot`)

**Agreed** (the human, 2026-11-09). The boot's job: get the level's
repository, then start its single writer from it. Its source:

| Source | Getting the repository | For |
|---|---|---|
| new (now) | created empty in a new store (`p2p-mrepo`'s `create`, a new internal id) and seeded from the release | a first install |
| existing (later) | opened from a backup: a git bundle imported (`p2p-mrepo`'s `import`, the id kept), or replicated from a backup peer by key | a restore |

After that, one path: the addons bound, HAICC's bundle copied into the
scope, HAICC started as the writer, initialisation refreshing from the
sources (a restored repository's older bundles handled as the setup's
bootstrap bundles are). Kept in mind for restore: a restore brings the old
identity back, keys included (a backup that allows one holds secrets);
nothing the level needs lives outside its repository (the scope and the
addons rebuilt from it); nothing after "get the repository" assumes it new.

**Seeding a new repository, `init`**: its initial layers `main`,
`packages`, `execute/main` (from `main`), `request/pending/default`,
`request/execute`, `request/done`. Two concerns, two owners, both
committing through `mycelium-git`'s writer: HAICC creates the repository
(`p2p-mrepo`) and its layers and seeds `main` (the level's name, what is
provided: the level's shape, HAICC's concern, its own module,
`haicc-base-level`, when a second repository paradigm needs a shape); the
package manager installs the release's bundles and addons into
`packages` (checked against the release's manifest) and deploys HAICC's
bundle into the layer's view. The boot's shell runs the checks, then
Bare runs HAICC's bundle with `init`, then starts HAICC as the writer.

**How people and agents interact with the platform** (agreed, the human,
2026-11-09): **the terminal is the primary way in, for a person and an agent
alike; Splectral is secondary.** The terminal access mode, as an agent wants
it, and a person uses the same:

- **Structured output**: `haicc <command> --json` returns the result as one
  JSON value (stable field names, data names); human text the default; the
  exit codes as today (0 done, 1 not done, 2 a bad call).
- **Never a prompt that blocks**: every question has a flag (`--yes`); with
  no terminal a question is answered no, and said (`docs/rules.md` 11).
- **State read by URI**: `haicc read <uri>` (or a `select` with `*`)
  through mycelium, at a pinned commit, instead of a command per question.
- **Self-describing commands**: `haicc commands --json` lists every command,
  its arguments and what it changes; the same description drives the
  boundary's validation and Splectral's page.
- **Changes as requests where it matters**: a significant change submitted
  as a request into the level's repository: recorded, executed as a unit,
  reproducible, its response on `main`, checked back later.
- **A dry run**: `--plan` says what a command would change, without changing
  it.

HAICC runs inside the boundary, its input valid. Input enters at a boundary
and becomes an internal `haicc` command:

| From | The boundary | Then |
|---|---|---|
| the host's terminal (primary: a person or an agent) | the command line: parsed (`haicc-cli-parser`) and validated | launched as an internal `haicc` command |
| the browser (secondary) | Splectral's server (initially a command line typed in the page), validated there | launched as an internal `haicc` command |

Inside, a `haicc` command trusts its input (the happy path); a change is
committed by the level's single writer.

## Code without a code folder

**Agreed** (the human, 2026-11-09). Code runs from bundles: Bare runs a
bundle file directly, and the code finds everything it needs in it (its
modules, its assets, its data files); native addons (`.bare`, by `dlopen`:
RocksDB, sodium, UDX) are the one thing that must be real files (`addons/`,
by hash). Everywhere else, URIs reach the contents as if everything were on
the filesystem (`values.md`, "URIs name a logical structure").

Dropped (the human, 2026-11-09): a mycelium module protocol for Bare
(`bare-module` loads through protocols, `resolve`, `read`, …; one reading
code from a commit's tree), not needed with bundles: the code runs, and URIs
browse as if all were on the filesystem.

Today (**built**): the platform's nodes run from the master's `packages/`,
assembled on the host, mounted read-only (a transitional shortcut for one
host); host B's node gets its code by replication and extraction
(`p2p-node/boot.js`), the direction `vision.md` names.

### Bundles: a package's runnable form

**To probe.** Tried (2026-11-08, the installed `bare-bundle`): a two-module
bundle built by hand runs directly (`bare app.bundle`), no folder, nothing
resolved on disk; Bare itself runs its own JavaScript from a bundle
(`bare:/bare.bundle/…`). What it teaches:

- **Resolution at build time**: the header's `resolutions` maps each
  module's specifiers to exact URLs; running looks up, resolves nothing. A
  sealed package fixes which modules it carries; a bundle also fixes how
  they find each other: deterministic, checkable before it runs.
- **One file, one identity**: a closure in one file, one hash; in a
  mycelium repository one git blob. Fetch one blob and the whole closure is
  local (`read`'s synchronous constraint met); no tree walk, extract or view
  for Bare; a `packages/<purpose>` link can name a bundle blob, its commit
  and hash checked as one.
- **Addons and assets listed apart**: native addons still files
  (`addons/` by hash).
- **`imports`, an import map** for the whole bundle: where the `bare-node-*`
  aliases could live per package instead of in every module's
  `package.json`.
- **Details matter**: a bundled `.js` was not taken as a module from
  `package.json`'s `"type"` without help (it ran as `.mjs`); a bundle
  builder carries each package's `package.json` with resolutions to it, or
  names modules by extension.
- **`bare-module-traverse`** (installed): Holepunch's module-graph
  traversal, what a bundler uses for a closure; to compare with the package
  manager's `closure.js`: one way to compute a closure, for what a package
  carries and for what its bundles hold.

If the probe holds: **a bundle is a package's runnable form, beside the
package, not instead of it**. The package stays the self-contained folder
(modules whole, README, tests, swarms, platform definitions: read by people,
tested, viewed); **one bundle per package, the full package** (changed
2026-11-09 from a bundle per entry point, the human): the closure of all
its entry points (resolutions fixed), its tests and its data (README,
platform definitions, configuration) as files, its `main` the package's
entry, the other entry points reached from it; native addons outside it
(below); made by the package writer when it writes the package (tested,
hashed and sealed with it; only the writer makes them, the package manager
checks them), and the package's tests run the bundles too: what runs is
what was tested.

**A closed release, single files at the levels.** A bundle fixes the
modules, how they resolve and the entry point, in one hashed file: nothing
about running it changes without a new bundle, a new identity. A level then
holds the bundles it runs (one file per package, the same hash
everywhere) and its native addons, instead of whole packages copied in
(`modules/`, `node_modules/`: thousands of files each); distributing,
checking, deduplicating and rolling back become operations on single files.
Outside the bundle: native addons (`addons/`, by hash); the package itself,
as the source (in its repository: read, tested, a bundle made again from
it; no longer copied to every level); data and configuration (in the
level's repositories). Stack traces point into the bundle
(`…/app.bundle/app/index.mjs`), mapped back to the package repository.

Where packages are used at a level today, and with bundles:

| Today | With bundles |
|---|---|
| the root's and swarms' HAICC (`haicc-base-boot/haicc.js` in `packages/base-package-haicc/`) | a HAICC bundle |
| a node's HAICC (`haicc-deployment/haicc.js`) | a node-HAICC bundle (one, after the convergence) |
| the node's program (the master's `packages/`, mounted; `p2p-node/cli.js`) | a node-program bundle |
| Splectral's server (`splectral-server/cli.js`, its extensions) | a server bundle, its browser files as assets, read from the bundle (below) |
| the package manager, imported by HAICC from beside it (the pair) | the package manager's code in HAICC's bundle; its own release a bundle of its own (bundles disjoint: below) |
| the boot's shell (`boot.sh`, `shutdown.sh`, the setup) | stays shell (before Bare; scripts are glue) |
| a swarm's config (`nodes.json`, `modules.json`, `splectral.json`) | stays data, in the level's repositories |
| the tests (modules' `test/`, the package's named tests) | not bundles (the human, 2026-11-09): a test has the package structure (recursive), its entry point a local cold boot (`boot`, shell), as no level's cold boot is a bundle; the tests are files in the package's bundle, read from it, nothing extracted: the executing code finds everything in the bundle (`mycelium-container-bundle`; a `boot` script given to `sh` on its standard input), the test's run holding only what it writes; exercising the package's own bundle, the one the level runs: what runs is what was tested. The detail at implementation |

So a level holds bundles and runs them, with its addons, its data and the
cold boot's shell; the package folder lives in the package repository, the
source and where tests run.

### Packages as bundles, published as releases

**Agreed** (the human, 2026-11-09; implemented next, the probe's points
first). Our haiccing and splectral packages are bundles; a bundle is a
built artifact, not source: it is published as a release, not kept in the
repository's history (as `haicc-setup.sh`, a release asset of
`base-package-haicc`, already is).

- **A release** (a version, one hash, immutable) carries the package's
  bundle (the full package: one package, one bundle, one hash), the native
  addons it names, and a manifest (each bundle's hash; the commit it was made from). Data
  files (a swarm's configuration, a default, a page) travel inside the
  bundles, read without unpacking (`bare-bundle`: the files listed, one
  read by its offset and length; tried 2026-11-09) or extracted where a
  person or a tool needs them.
- **Made by the package writer**: `packages.json` declares a package's entry
  points; the writer bundles the package (the closure of its entry points,
  paths canonicalised, its tests and data as files; addons offloaded by
  hash), runs the package's tests from the bundle, records the hashes. Only the writer makes
  bundles (rules 13, 17).
- **Built and published by local** (the local agent, with the human's word,
  as the releases today): a release per package (`tools/publish.sh`
  creating releases instead of pushing written folders).
- **The repository** holds what people read and the writer works from: the
  README, the manifest's history, the hand-written parts; no longer the
  copied `modules/` and `node_modules/` (the source lives in the
  development repository and the module repositories).
- **A level fetches only what it runs**: a release's bundles and the addons
  they name, through the sources (a folder of release files; GitHub's
  release downloads), each checked against the manifest's hash; the
  package manager's verify and initialisation's "intact" become the
  bundle's hash.
- **On our p2p layer, the bundles are objects in the packages layer**, the
  code store (`repositories.md`; changed 2026-11-09 from a releases drive
  linked from the layer): releases outside git history stay where the
  outside world meets us. No deltas needed for bundles (the human).
- **Assets are read from the bundle** (agreed, the human, 2026-11-09).
  Tried: Bare resolves an asset to a URL inside the bundle file
  (`import.meta.asset('./page.html')` gives
  `file:///…/app.bundle/app/page.html`), nothing extracted, so the
  filesystem cannot read it. The code reads its assets from its own bundle,
  by the header's offset and length, through `mycelium-container-bundle`
  (`values.md`): Splectral's server serves its pages and the browser's
  libraries that way. Nothing extracted; the release stays one file; what
  is served is what was hashed. (Not taken: extracting assets at install,
  a second form of the same bytes; a separate data bundle.)
- **Probe 1, done** (2026-11-09, scratch only): `p2p-node`'s closure as a
  bundle (`bare-module-traverse` and `bare-bundle`): 824 modules, 21 MB with
  its native addons, 3.7 MB without, built in 3.4 s. In the node image, with
  only Bare: native addons cannot be loaded from inside a bundle (`AddonError:
  CANNOT_LOAD`), even declared; extracted (26 files, 17 MB) and named by the
  bundle's resolutions, the bundle loads, and a swarm master runs from it
  (store on RocksDB, DHT on UDX, repositories on p2p-git, genesis, live,
  names registered, metrics, a graceful stop: as on the platform today).
  Module types: none lost (the traversal takes each module's type from its
  `package.json`). The traversal gives what runs (168 third-party packages);
  `closure.js` what a package carries, tests included (213): both kept, for
  bundles and for packages. A builder must canonicalise paths (`realpath`):
  the workspace's symlinks would put a module in twice. An addon is named by
  an absolute URL only (a relative one is refused, or resolves inside the
  bundle).
- **Native addons** (agreed, the human, 2026-11-09): always extracted files,
  stored by content: `addons/<sha256>`, no name, no extension (tried: Bare
  loads them so; a master ran with all 26), one namespace for every package,
  version and platform, each stored once, checked by its hash, swept when no
  installed bundle names it. **Beside the bundle** (changed 2026-11-09, from
  a canonical base bound at install): a bundle names each addon as
  `/../addons/<sha256>`, a sibling of the bundle file, `bare-pack`'s
  convention for offloaded addons; tried: the same bundle, unchanged, runs
  wherever it is placed with `addons/` beside it (a master live at two
  different paths). No rewriting, no fixed path, no root. Why it works:
  Bare mounts a bundle at its own file's URL and falls through to the
  filesystem for anything not in it (`bare-module`); `/` starts at the
  mount, `..` steps out of the bundle file. (A relative `../` is refused; an
  absolute URL works but ties the bundle to a place.) A scope is then a
  folder with the bundle and its `addons/`, hard links from a store where
  they share a disk.
- **Bare's runtime pinned, not carried** (agreed, the human, 2026-11-09):
  the setup carries the bundles, their addons and the signed manifest;
  Bare's runtime is pinned by the lockfile (`bare-runtime-linux-x64`, its
  tarball's URL and sha512) and ensured by the setup's shell
  (`tools/ensure-bare.sh`, inlined): fetched from npm's registry and
  checked, or, for an air-gapped setup (`--with-bare`), carried as that
  tarball and checked the same way; `<work>/setup/bare` links to it. Built:
  the setup 7.8 MB (from 29 MB), the air-gapped one 35 MB; both boot from
  a fresh folder with no Node.js on the PATH. The same script ensures Bare
  on the development side, first step of `tools/install.sh`.
- **The boot is in the bundle** (agreed, the human, 2026-11-09). Bare
  is the one program needed, but its binary has no filesystem of its own
  (`bare-fs`, `bare-os`, `bare-crypto` are addons, not linked in: tried), so
  the addons must be files before anything in a bundle runs, and a bundle
  cannot verify its own hash. So: a release in extracted form (the bundle,
  `addons/`, the manifest, Bare) needs nothing before Bare; the setup is its
  packed form, its shell only unpacking, checking the bundle's hash against
  the manifest (`sha256sum`) and handing over (`bare
  base-package-haicc.bundle boot`). Everything else of the boot (the
  machine check, `init`, what follows) is the bundle's: tested, hashed and
  released with the package; a restore boots from the repository's own
  bundle.
- **Linked addons** (known, not used): Bare supports addons statically
  linked into a runtime binary (`linked:`; `bare-pack --linked`, built
  with `bare-make`: CMake, Ninja, Clang), documented by Holepunch for mobile;
  not needed with addons beside the bundle.

### Bundles disjoint, installs as copies, the stores

**Agreed** (the human, 2026-11-09).

- **Bundles are disjoint**: no bundle imports another; each is closed and
  self-contained. The package manager's code HAICC needs is copied into
  HAICC's bundle by the package writer; the package manager's release has
  its own bundle: the same module code in both, from one source. (Tried
  2026-11-09: a bundle can load another bundle as a whole, by a dynamic
  import of its file, its main module's exports coming back; not a file
  inside it. Not used: bundles stay disjoint.)
- **No exception to self-containment**: HAICC no longer uses the package
  manager from beside it; `lib/pkgm.js` and the pair's lookup go; rule 12's
  exception and "the platform is a pair" (`platform.md`, `packages.md`)
  are changed when this is built.
- **The move from boot to initialise is a switch of bundles**: the boot runs the
  bundle the setup or the release brought (the bootstrap); it fetches the
  current one, checks its hash, copies it into the scope; initialisation runs
  that one.
- **An install is a plain copy of bundles into an execution scope**: a level
  (host, swarm, node, a test's run) gets exactly the bundles it may run,
  copied in (a hard link where on the same disk); nothing resolved or
  assembled at install time: the bundle is the closure. Kept scoped, not
  every bundle available to every level: a level runs only what it was
  given (as a node validates what it was given today), and copying single
  files is cheap.
- **The stores**, from outside in:

| Store | Holds | How bundles get there |
|---|---|---|
| external sources | the releases (GitHub's release downloads; a folder of release files, air-gapped) | published by local |
| the host's global store | every bundle the host has fetched, once: the packages layer of the host's repository | fetched from the sources, checked against the release's manifest, committed into the layer |
| a swarm's store | the bundles the swarm uses: the packages layer of the swarm's repository, on our p2p layer | committed from the host's store, replicated to its nodes |
| an execution scope | the bundles one level runs | a plain file copy from the store it sits under |

- **What changes from what is built**: the package manager's `assemble` (a
  swarm's codebase into the master's `packages/`) becomes copying bundles
  into the swarm's store; the mount of the master's `packages/` into the
  nodes goes; initialisation's "intact" becomes a hash per bundle.

**The probe**: done (2026-11-09): a real package's closure as a bundle,
native addons (above, "Probe 1" and "Native addons"), a long-lived
read-only reader (above, "One writer per store").

## Pear as a substrate execution layer below HAICC

**Agreed** (the release itself out of phase 3's scope: the request has Pear
not in this phase; `vision.md`: Pear when versions are fixed).

- **Pear distributes our releases**: a Pear app is our release, extracted,
  potentially the full package set preloaded, in place of `haicc-setup.sh`.
- **Pear only ever triggers our boot**: from its folder on the host,
  the release boots into a **HAICC bridgehead** (a level set up as a node
  is), where Pear's world hands over to ours; it installs the HAICC platform
  on the part of a swarm that has the Pear distribution, or makes a separate
  swarm. From there, our design: the container node model (hardened
  containers, Docker through `docker-manager`, a node's Docker by the host's
  proxy) and the additional swarm security (our own DHT per swarm,
  authorised keys, invitations, initialisation's validation).
- **Kept clean by**: two upgrade mechanisms, each its own scope (Pear
  updates the release, the bootstrap; HAICC updates everything after it, by
  its repositories and links; a newer release matters at the next boot,
  never to a running platform, as "the setup's pair is a bootstrap" today);
  the preloaded packages a starting point only (after the boot, packages
  come through our sources and repositories); the network boundary visible
  (Pear distributes over its DHT; our swarms keep their own: `vision.md`, a
  public component and air-gapping).

*Why*: Pear's distribution, seeding and release updates, without its
constraints spilling into HAICC's design.

### Pear's model, our reference

From Pear's documentation (docs.pears.com, read 2026-11-09; its repositories
unreachable then), to verify when Pear comes in: Pear v3 installs apps
(`pear install pear://<key>`) into its Corestore under its platform folder
(`~/.config/pear` on Linux); `pear stage` writes a deployment folder (a
`package.json`, `by-arch/…/app` trees) into the app's Hyperdrive; an app's
`package.json` `upgrade` field names the link it follows, a running app is
told (`updating`, `updated`) and `applyUpdate()` swaps its folder (desktop
apps run from materialised folders, it seems); bundles and linked addons
documented for mobile and embedded use; Pear installed by
`install.pears.com`'s script (whether the first install needs the public DHT:
not found). Not used now (the human, 2026-11-09): the release built as a
folder (the bundle, `addons/` beside it, the manifest, Bare), the setup its
packed form; a Pear release later delivers the same folder.


As we know Pear's design (**to verify** with the probe):

- **An app** is identified by its key (a stage or release channel its own
  key); its code in Pear's shared platform store (deduplicated); its data in
  a storage folder of its own, apart from other apps' and from the code;
  separation by convention and the user's trust, not a sandbox. In our
  terms, the app is the package (its data in `apps/<package>/`).
- **Upgrades**: versions are lengths of the app's append-only drive (`pear
  stage` appends; `pear release` marks the released length; a link may pin
  key and length, which is also how to go back); the drive replicates in the
  background; the running app is told of a new release and decides (restart
  now, or at its next start; nothing swapped under running code); someone
  seeds it (`pear seed`); Pear's platform updates itself the same way.

Ours (**agreed**): a version is a bundle (its id and hash); the release
mark is its entry in the publisher's signed manifest (a newer sequence),
the level's `packages` layer holding what it installed; pinned or following, per layer (`repositories.md`, open); replication
signalled by RPC is the notification; the level's HAICC decides, after
validating the new version (intact, its validation set: initialisation's
check, which Pear lacks), restarting onto it or waiting; a rollback points
the link back to the previous commit; the platform's bundles are refreshed
by the same mechanism.
