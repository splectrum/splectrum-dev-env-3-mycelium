# The levels' structure, code without a code folder, Pear below HAICC

Status marks: **built** (in the code, tested), **agreed** (decided, not
built), **open** (to settle), **to probe** (to try before designing
further). Decided with the human, 2026-11-08 (phase 3, step 1's review); the
folder structure to be fixed in this phase, step by step.

## Every level set up as a node is

**Agreed.** The host, a swarm's master, a node: the same structure. Its code
from the packages repository (a view, or a module protocol: below); its
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

*Why*: the same structure everywhere makes execution portable and the
platform one thing to build and test.

## A level's folder

**Open** (to probe and settle):

```
<level>/
  store/            the level's own store: its repositories, the packages repository among them
  addons/           native addons, extracted by hash
  apps/<package>/   a package's own data: its store, its repositories (made at deploy, removed at teardown)
  log/              the minimal plain-file log
  haicc             its launcher
```

No code folder (below); a view of code only where Docker or a person needs
it. A minimal plain-file log stays (**open**: its scope), for the cold boot
(before any store exists) and the store's own failures. How config is
changed, once it is in a repository (a `haicc` command, or a view edited and
committed): **open**.

## Code without a code folder

**To probe.** Bare's module loader (`bare-module`) resolves and loads every
module through a protocol (`resolve`, `exists`, `read`, `addon`, `asset`);
custom protocols exist for loading from a Hyperdrive. Two constraints: `read`
is synchronous, so the code must be local before it runs (replicated,
prefetched, or one bundle file); native addons (`.bare`, by `dlopen`: RocksDB,
sodium, UDX) must be real files. `bare-bundle` holds many modules in one file
Bare runs directly.

So a package runs through a mycelium protocol (its tree at the commit its
`packages/<purpose>` link names; its closure fetched first, as the package
manager's `closure.js` computes it), or from a `bare-bundle` built from that
tree; native addons extracted by hash. Unlike Pear's drive of files, ours
holds git objects: every version addressable by its commit and checked
against its hash.

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
tested, viewed); a bundle is the closure of one entry point (the node's
program, HAICC, Splectral's server: a bundle per entry point, not per
package), made by the package writer when it writes the package (tested,
hashed and sealed with it; only the writer makes them, the package manager
checks them), and the package's tests run the bundles too: what runs is
what was tested.

**A closed release, single files at the levels.** A bundle fixes the
modules, how they resolve and the entry point, in one hashed file: nothing
about running it changes without a new bundle, a new identity. A level then
holds the bundles it runs (one file per entry point, the same hash
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
| Splectral's server (`splectral-server/cli.js`, its extensions) | a server bundle, its browser files as assets (**to probe**) |
| the package manager, imported by HAICC from beside it (the pair) | the package manager's code in HAICC's bundle; its own release a bundle of its own (bundles disjoint: below) |
| the cold boot's shell (`boot.sh`, `shutdown.sh`, the setup) | stays shell (before Bare; scripts are glue) |
| a swarm's config (`nodes.json`, `modules.json`, `splectral.json`) | stays data, in the level's repositories |
| the tests (modules' `test/`, the package's named tests) | **open**: tests running the bundles (what runs is what was tested); the module tests where the package is written; the warm boot's validation set against the bundle the level will run |

So a level holds bundles and runs them, with its addons, its data and the
cold boot's shell; the package folder lives in the package repository, the
source and where tests run. Deciding whether it holds: assets (served from
inside a bundle).

### Packages as bundles, published as releases

**Agreed** (the human, 2026-11-09; implemented next, the probe's points
first). Our haiccing and splectral packages are bundles; a bundle is a
built artifact, not source: it is published as a release, not kept in the
repository's history (as `haicc-setup.sh`, a release asset of
`base-package-haicc`, already is).

- **A release** (a version, one hash, immutable) carries a bundle per entry
  point (the programs, and the tests: a test is a mini package triggered by
  its `boot`, an entry point like any other), the native addons they name,
  and a manifest (each bundle's hash; the commit it was made from). Data
  files (a swarm's configuration, a default, a page) travel inside the
  bundles, read without unpacking (`bare-bundle`: the files listed, one
  read by its offset and length; tried 2026-11-09) or extracted where a
  person or a tool needs them.
- **Made by the package writer**: `packages.json` declares a package's entry
  points; the writer bundles each entry point's closure (resolutions fixed),
  runs the tests as bundles, records the hashes. Only the writer makes
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
  package manager's verify and the warm boot's "intact" become the
  bundle's hash.
- **On our p2p layer, the same split**: a release a blob outside the
  repository's git history (a releases drive per package repository, a
  record per release: version, commit, the bundles' hashes); a
  `packages/<purpose>` link names a release (repository key, release,
  bundle, hash). No deltas needed for bundles (the human).
- **To settle in the probe first**: assets served from inside a bundle
  (Splectral's browser files); module types (a bundled `.js` taken as a
  module); a real closure's size and addons.

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
- **The cold-to-warm move is a switch of bundles**: the cold boot runs the
  bundle the setup or the release brought (the bootstrap); it fetches the
  current one, checks its hash, copies it into the scope; the warm boot runs
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
| the host's global store | every bundle the host has fetched, by hash, once | fetched from the sources, checked against the release's manifest |
| a swarm's store | the bundles the swarm uses, on our p2p layer | from the host's store into the swarm's packages repository, replicated to its nodes |
| an execution scope | the bundles one level runs | a plain file copy from the store it sits under |

- **What changes from what is built**: the package manager's `assemble` (a
  swarm's codebase into the master's `packages/`) becomes copying bundles
  into the swarm's store; the mount of the master's `packages/` into the
  nodes goes; the warm boot's "intact" becomes a hash per bundle.

**The probe**: (1) a custom protocol loading a small package from a commit's
tree in a p2p-git repository, on Bare; (2) a real package's closure as a
bundle (`p2p-node`'s): does it run, its size, its addons, its module types;
`closure.js` against `bare-module-traverse`; (3) native addons (Pear's way;
extracted by hash).

## Pear as a substrate execution layer below HAICC

**Agreed** (the release itself out of phase 3's scope: the request has Pear
not in this phase; `vision.md`: Pear when versions are fixed).

- **Pear distributes our releases**: a Pear app is our release, extracted,
  potentially the full package set preloaded, in place of `haicc-setup.sh`.
- **Pear only ever triggers our cold boot**: from its folder on the host,
  the release boots into a **HAICC bridgehead** (a level set up as a node
  is), where Pear's world hands over to ours; it installs the HAICC platform
  on the part of a swarm that has the Pear distribution, or makes a separate
  swarm. From there, our design: the container node model (hardened
  containers, Docker through `docker-manager`, a node's Docker by the host's
  proxy) and the additional swarm security (our own DHT per swarm,
  authorised keys, invitations, the warm boot's validation).
- **Kept clean by**: two upgrade mechanisms, each its own scope (Pear
  updates the release, the bootstrap; HAICC updates everything after it, by
  its repositories and links; a newer release matters at the next cold boot,
  never to a running platform, as "the setup's pair is a bootstrap" today);
  the preloaded packages a starting point only (after the boot, packages
  come through our sources and repositories); the network boundary visible
  (Pear distributes over its DHT; our swarms keep their own: `vision.md`, a
  public component and air-gapping).

*Why*: Pear's distribution, seeding and release updates, without its
constraints spilling into HAICC's design.

### Pear's model, our reference

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

Ours (**agreed**): a version is a commit of the package's repository; the
link in `packages/default`, promoted from `packages/test`, is the release
mark; pinned or following, per layer (`repositories.md`, open); replication
signalled by RPC is the notification; the level's HAICC decides, after
validating the new version (intact, its validation set: the warm boot's
check, which Pear lacks), restarting onto it or waiting; a rollback points
the link back to the previous commit; the platform's pair is refreshed by
the same mechanism.
