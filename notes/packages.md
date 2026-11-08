# Packages and cascading click and runs

> **History.** The current design is in `docs/design/` (with `docs/rules.md` and
> `docs/guides/`). This file keeps the decisions as they were made, by date;
> where it and `docs/` differ, `docs/` holds.

Agreed with the human, 2026-11-04. Design, not built yet: the direction
for the next phase.

## Packages

A package is a set of modules referenced as one unit. Projects reference
packages; nothing depends on outside software once a package is made.

| Package | Holds |
|---|---|
| `third-party` | below mycelium, not ours: bare and holepunch, isomorphic-git, react and htm; changes only by a recorded import |
| `p2p` | ours: the p2p substrate (the series, rns, mrepo, the node, the managers) |
| `mycelium` | the repository layer, with `p2p-git` (git on Hyperdrive, which `mycelium-git` runs on; developed in its own repository, `pear-full-square/p2p-git`, used at its latest). Moved here from `p2p` when built (part 1): the `p2p` modules use `mycelium-*`, so the two packages would have required each other |
| `splectral` | the platform |
| `haicc` | reconcile, deployment |

- Grouped by what makes sense functionally: few packages, a mixture of
  concern and practicality. The prerequisites (everything below mycelium)
  are two packages: `third-party` and ours, `p2p`, so our changes never
  carry the imported tree again.
- **Third-party code comes in once, at a deliberate boundary**: an import,
  recorded (versions, integrity, licences), the only contact with npm.
- **No fixed versions yet**: a package is rebuilt from the latest version
  of its modules (our products' `main`, the last import). Versions, and
  their release (Pear's main use for us), come later.
- **Platforms**: a package with native code is made per platform; Linux
  x64 first, and then only its binaries. Bare's runtime belongs to
  `third-party` too, so the node image needs no global install. Android arm64 next (below); only `third-party` has native code today.
- One root for now (this repository's workspace root, the modules side by
  side, fully qualified: `<org>/<repo>`), with room to loosen later: each
  project deriving its own root, then products depending on each other by
  name rather than by path.
- **Pinning** comes as soon as there is a working system; until then the
  packages are written as a consistent set (tested together, at their
  latest).

## Testing: always within the package

(Where tests run, who runs them and where their logs go: superseded by "Packages, platforms, swarms and tests", Tests.)

Agreed 2026-11-04.
- **Tests live in a module and in its package**: a module's own tests,
  and the package's tests of its modules together.
- **They always run with the package.** When a module is updated: the
  package is deployed, the module overwritten with its new version, then
  the module's and the package's tests run. A module is never validated
  on its own, only in the package it is used in.

**Decided with the human (2026-11-06), to build with the package manager
work, not before:**
- **A test is a normal executable** in the package (a script or a program:
  it runs, prints, exits 0 or not); no HAICC harness to run it.
- **The package manager runs them**: once released, wherever the package
  is installed (`pkgm test <package>`); in the development environment,
  writing the packages installs and tests them together.
- **Only the latest run's log is kept**, with the package (small: logs
  only); older runs in the repository's history, or later in a more
  central HAICC solution. Benchmarks are tests like any other.
- **Known issues** are kept with the package.
- **Nothing of the environment a test ran in is kept**: the throwaway work
  folder is removed; only the test and its output log stay.
- **A harness, if one is ever needed,** is a `haiccing` package of its own,
  installed first (a chicken and egg: so avoided).
- **The release is stored once, clean**: the GitHub release of
  `base-package-haicc`, nowhere else.
- Until then, a test needed at the root is an `sh` script test on the
  root's HAICC.

## The package manager, and booting it

Agreed 2026-11-04. Managing packages is an application of its own
(`pkgm`, code in `pear-full-square`), not part of HAICC: HAICC uses it
through its provider. The packages are its data: `haiccing/base-package-<name>`,
**self-contained**: each holds its code, ready to run, with its tests.
Nothing is assembled at use, so nothing has to be pinned: a package is
taken as its repository has it (the latest). The development repository
writes a package's code into its repository when its modules change and
the package's tests pass.

**Booting** (agreed with the human, 2026-11-05; it replaces the stages
written before):

- **A folder of `haiccing` repositories side by side**, as in the
  organisation, is the starting point: at least `base-package-haicc` and
  `base-package-pkgm`, with the packages a project needs beside them. It
  may be a clone of each, or a plain folder copy: nothing in booting
  relies on git.
- **Boot is only between HAICC and the package manager.** Their two
  packages each carry a boot, in plain shell:
  - **HAICC's boot** (`base-package-haicc`): the host's prerequisites
    (step 0, below);
  - **the package manager's boot** (`base-package-pkgm`): installs the
    package manager into the host's install folder.
- **What a kick runs**:
  - kicking the package manager (its shell script): HAICC's boot, then
    the package manager's boot and install; then it exits;
  - kicking HAICC (its shell script): HAICC's boot, the package manager's
    boot, the package manager's install, then HAICC's install (by the
    package manager); then it exits. `haicc` is then available
    (`~/.haicc/bin/haicc`).
- **A higher-level package** (a demo project, any `haiccing` repository
  above them) has no boot: its script kicks HAICC if HAICC is not
  installed yet, assuming its prerequisite repositories are its siblings
  in the folder, and then calls HAICC the proper way (`haicc run
  <project>`, `haicc install <package>`), which installs and runs what
  it needs through the package manager.
- **Idempotent**: a kick finding the package manager or HAICC installed
  and current skips to what is left.
- **Missing siblings are said, not guessed**: which repository is missing
  from the folder, and where to get it; fetching from the organisation
  with git is an explicit option.

Packages are built and tested in the development repository, with the
proper package manager run in place; elsewhere a machine only boots from
what was built there.

**Two stages** (agreed 2026-11-04): the boot is **folder-based** (git
into a host folder, nothing more); the **p2p version does the heavy
lifting**: the swarm's code repository (below), kept current by
replication and mirrored to the folder code runs from (Holepunch's
`localdrive` and `mirror-drive`, as Pear keeps an app's files), only the
differences applied; code always runs from the folder.

**One code repository per swarm** (the human's simplification, for the
no-versions scenario: always the latest at install): a mycelium
repository on the master whose capability branch is the register of what
is installed, synced to every node. An install needing a dependency not
there requests it from the master, which installs it from its package
(`haiccing`) and commits; the change replicates to all. One tree, one
writer, one commit: every node runs the same, consistent set. It
generalises the master's `packages` repository (steps 4 and 5); the
`haiccing` package repositories stay the source installs come from, and
the boot's, before there is a swarm.

**On deploy, missing packages added** (the human, 2026-11-04): when a
manager deploys, the package manager adds the packages the deployment
needs that the swarm's code repository lacks. So the code is there once,
in layers of that repository; every node is provisioned the same, from
it; and the package manager's scope is global: the swarm, not a machine. **The container the same way**:
a node's boot already takes its code by replication from the master's
packages repository and extracts it; with packages, it is the same
mechanism as the host's, writing only what changed, the image keeping
Bare and the boot only.

## Self-contained packages, the work folder, the log (agreed 2026-11-06)

Decided with the human after the fourth release; to build next. Where this
section and older ones differ, this one holds.

**Self-contained packages.**
- **A package carries everything it runs on**: its modules, the modules of
  ours they import (from other packages), and the third-party code they
  use, all the way down. No `requires`: imports never leave the package
  (relative ones between modules keep working inside it).
- **Installing is copying the repository in, whole**: `packages/<repository>/`,
  as the repository has it; nothing taken apart, nothing resolved across
  packages. The package manager's registry is the sealed version of each
  repository installed.
- **Once sealed, only the repository's version counts**: tested as the
  whole it is, once; a new version of another package changes nothing in
  it. No retesting on a dependency's upgrade, no version tracking across
  repositories.
- **Splectral's components** (`splectral/`) are self-contained the same way:
  a view or a scenario is its own files, run by the platform; a project's
  package carries its components and the platform.
- **The writer works each package's set out**: its modules, ours they
  import, the third-party code those use, all the way down.
- **Sizes** (measured 2026-11-06, Linux x64, as imported): `haicc`, `pkgm`:
  no third-party code (well under 1 MB each); `mycelium`: 41 MB; `p2p`,
  `splectral` and each demo: 139 to 144 MB, of which Bare's runtime 97 MB
  (published with debug information), RocksDB 20 MB (a Node.js build for the
  host, a Bare one for the nodes), the rest 20 to 25 MB. Our own code about
  3 MB. A manager typically installs one project's package, about 120 MB
  with the runtime stripped; two projects carry two copies.
- **Bare's runtime, stripped, for deployment** (68 MB): in the packages that
  build node images; the import's record says so (the published version's
  integrity, and that it was stripped, with the stripped file's checksum).
  The full runtime belongs to the root, with the host's move to Bare (the
  roadmap: `plan.md`, "The host on Bare"); the host runs on Node.js for now.
- **Names stay plain for now**, as today (`base-package-haicc`).
  **Versioned packages are a later feature**: then the version goes into
  the name (major.minor, e.g. `base-package-haicc-1.2`), so versions sit
  side by side in `packages/` and are used side by side.

**The work folder**, the same shape at the root and in a manager:

```
<work>/
  haicc        the launcher
  haiccing/    boot, sources, [install], the repositories as fetched
  packages/    the code: repositories, whole (the root: base-package-haicc; a manager: its packages, and pkgm/)
  nodejs/      Node.js, when HAICC had to install it (named so: a node is a swarm's)
  log/         the log files
  manager/     the same shape again
```

- `install/` goes. One variable, `HAICC_WORK`: the folder HAICC works in
  (the root, or a manager); `packages/`, `nodejs/`, `log/` follow from it.
  `HAICC_HOME` goes.
- The root runs its HAICC (`haicc-base-boot`) from
  `packages/base-package-haicc/`, a copy made at the first boot: `haiccing/`
  stays what is fetched, `packages/` what runs.
- Still no hidden folders.

**The log on a timeline.**
- Files of 10 KB, each named by the start of its first command, in UTC
  (`log/20261106T103312Z.log`): `ls log/` reads in time order; the newest is
  the current one. A command appends to it, or starts a new file named by
  its own start once the current one is over 10 KB (whole commands a file).
  The setup, the boot's stage 1 (shell) and HAICC (Node.js) do the same.
- Each command: a header with its real start time (seconds in shell,
  milliseconds in Node.js; no invented `.000Z`), and a close line with its
  duration (`== exit 0, 1.2 s`), the setup's included. Not every line.
- The instructions (the readmes, `haiccing`'s profile) say where the log
  is: in `log/`, newest last.

## Packages, platforms, swarms and tests (agreed 2026-11-06/07, not built)

Supersedes "Boot and shutdown by level" below (its table restated here,
with the new paths) and, where they differ, the earlier sections on the
work folder and on where tests run. Judged by consistency with the design,
not by what exists: the rebuild is step by step. Reviewed independently
(2026-11-07); its findings settled here.

### A package

```
<package>/
  package.json  README.md
  modules/                       shared by its swarms (and what runs at the host level, in a platform package)
    <org>/<module>/              each module whole, as developed
      test/                      the module's own tests
    node_modules/                the third-party code they use (Bare's runtime stripped)
  swarms/
    <swarm>/                     one per swarm, named by its folder
      nodes.json                 its nodes and their roles
      modules.json               its codebase: the package's modules it uses (one list, the swarm's)
      splectral.json             its Splectral components: which, on which node, their settings
      host.json                  what the host must provide for it (networks, Docker): requirements
      README.md
      test/                      the swarm's own: its config valid (against the platform's schemas)
  platform/
    host/  swarm/  node/         the levels: each its layout (layout.json, data), its Splectral
                                 components, its tests; swarm/ the config schemas
  test/
    <test>/                      a named test, for what it checks (e.g. three-nodes-up)
      README.md
      modules/  swarms/  platform/   the package's structure, only the parts it adds
      test                       its run: an executable, any language; exit 0 when it passes
```

- **Every part is optional; a package is what it holds**: modules only (a
  package of code), swarms only (a configured swarm), both (a demo: swarms
  and the Splectral components they show), a platform. Recognized by its
  contents, not its name. `base-` is a convention for a package group.
- **One concern per file** (`rules.md`): a swarm's nodes, its codebase,
  what Splectral shows, what the host provides.
- **Modules once, at the package's top**, shared by its swarms; each swarm
  uses its own selection (`modules.json`). A named test's `modules/`,
  `swarms/`, `platform/` add to the package's parts (test-only ones); a
  name the package already has: refused.
- **The platform is a part like any other**: any package may carry
  `platform/`, and any package that does can be released (a setup): the
  platform plus that package's content. `platform/` holds the levels'
  shape, what they show and their tests; the code is in `modules/`. The
  swarm config schemas are the platform's: a swarm's test checks its
  config against them, before anything boots.
- **Tests at their level, from the bottom up**: the modules', the
  swarms' (config), the package's named tests. A named test has the
  package's structure, no `test/` inside it; a check that the package's
  parts fit together is a named test too. `test` is reserved as a name
  within a package.

### Sealed, validated, mixed

- **haiccing's packages are sealed**: self-contained (they carry what they
  import), used as they are. A swarm made only from sealed packages of one
  source and ref (all `github haiccing main`, or one release) is
  **validated**: the setup that was tested together.
- **Mix and match is allowed, and knowingly gives that up**: working
  trees, other branches, `user/` packages; for development. A swarm made so
  is **mixed**; `./haicc list` says which a swarm is. Local and
  self-contained, even mixed, beats importing from remote (air-gapping).
- **The codebase is per swarm**: the master node's **package repository**
  is assembled by the package manager from the swarm's reference list
  (`modules.json`) and the code in its package's `modules/`. **Nodes use
  only what is in the master's repository**: an application refers to it,
  carries no copies. A package it refers to that is not there: it fails
  (and the failure may trigger an install request, with the p2p step). For
  now the repository is a folder on the master, mounted read-only into the
  containers on its host; replicated to other hosts with the p2p step (a
  repository in mycelium's sense).
- The platform's levels are separate: the host and swarm folders run the
  root's HAICC (the work folder's `packages/`); a node's own HAICC and
  package manager are the platform's node level. A node's HAICC can differ
  from the root's.
- **Recorded, not refused**: `swarms.json` records the package's hash as
  the swarm is made. The master's repository assembled again later takes
  what the root holds now, and says what differs from what the swarm was
  made with.
- **Bare**: only the stripped runtime in packages and in production. The
  full executable is kept at the platform level (the root's HAICC), used
  by an override where it is needed.

### A work folder

```
<parent>/                        a folder of installs: platform releases, side by side
  <install>/                     a work folder: one platform (the setup's target)
    boot  shutdown  haicc        the cold boot and shutdown; the launcher
    haicc.lock                   while a command that changes state runs (visible)
    haiccing/                    haiccing's packages; sources, contents.json
    user/                        other packages; sources, contents.json
    packages/  nodejs/  log/     what runs at the root (with contents.json); Node.js; the log
    swarms/
      swarms.json                the host's swarms, fully qualified
      <swarm>/                   a swarm: its whole folder from its package, and its launcher
        haicc  nodes.json  modules.json  splectral.json  host.json  README.md  test/
        master/                  haicc  log/  repository/ (the swarm's package repository, with contents.json)
        <node>/                  haicc  log/  (the master's repository, read-only)
      test/                      reserved: test runs
        <test>/                  one run: swarms.json, <swarm>/<node>/, the same shape
```

- **The top is fixed**; the user's names are under `swarms/`. The URI
  stays `/<swarm>/<node>` (a test run's: `/test/<test>/<swarm>/<node>`).
- **One platform per work folder**, the one it was set up from. Another
  platform, or another release: another install in the parent folder. A
  package that brings a different platform: refused in this install.
- **Docker**: every container, network and image labelled with its
  install (its absolute path: two installs may share a name) and its path
  within it; names derived from the same, within Docker's limits.
  Cleanup goes by label: a shutdown, a cold `./shutdown`, a test run's
  leftovers after an interruption.
- **One state-changing command at a time** per work folder:
  `haicc.lock`, visible; a second says what holds it and stops.

### The levels

A `haicc boot` or `shutdown` works on the config of the folder it is
called from, and keeps it.

| Called from | Its config (kept) | `haicc shutdown` | `haicc boot` |
|---|---|---|---|
| node `swarms/<swarm>/<node>/` | the node's own | its container removed | its container started again |
| swarm `swarms/<swarm>/` | its config files (and its launcher) | each node's cold shutdown (its folder removed), the master last | each node in `nodes.json` built from scratch and booted, the master first; `boot <node>`: that node rebuilt |
| root `<work>/` | `swarms/swarms.json` | each swarm's shutdown (not `swarms/test/`) | the host's prerequisites, then each swarm booted (not `swarms/test/`) |
| work folder, cold | `haiccing/`, `user/`, `log/`, `nodejs/` | `./shutdown`: its Docker resources (by label), `swarms/`, `packages/`, `./haicc` removed | `./boot`: set up from `haiccing/`, then `./haicc boot` |

- **A swarm comes only from a package**; no empty swarms, no building by
  hand. Its nodes are its config's: `./swarms/<swarm>/haicc boot|shutdown
  <node>` only for nodes in its `nodes.json`. A swarm changed: its package
  changed, the swarm made again (`teardown`, then `boot`). Upgrading a
  running swarm: out of scope.
- **`./haicc teardown <swarm>`**: its shutdown, its folder and its entry
  removed; asked first. A plain remove; logs kept; checkpointing and
  backup: on the roadmap.
- **No current swarm**: the folder is the context (`cd swarms/<swarm>`,
  its own `./haicc`). KISS.
- The host's structure (the root, a swarm's folder) runs the root's HAICC
  and logs in the root's `log/`; each node runs its own, logging in its
  own `log/`, echoed back (`--no-echo`: the outcome only).
- No copies in the nodes: they refer to the master's repository
  (`vision.md`: links, not copies).

### `./haicc boot`: what, and from where

```sh
./haicc boot base-package-haicc                          # all its swarms, named by the repository
./haicc boot base-package-haicc/three-nodes --as=t1      # one swarm, under another name
./haicc boot base-package-haicc/test/three-nodes-up      # a test's swarms, into swarms/test/three-nodes-up/
./haicc boot my-swarms --from=user                       # a package of the user's
./haicc boot my-swarms/test/smoke --from=/home/you/repos/myorg
```

- **The argument is a repository and a path within it**:
  `<repo>[/test/<test>][/<swarm>]`. Most commands are this alone: a
  haiccing package.
- **`--from` is the root**, the folder the repository sits in: `haiccing`
  by default, `user`, or any folder (read in place, recorded like any
  source). It kicks in for tests and user packages.
- **`--as`** renames, only when the path names one swarm.
- **Swarms are named by the repository**, its folder names under
  `swarms/`: one or several, all booted. Each stands alone: those made
  stay made, a failure is said. A config is checked against the
  platform's schemas before it is copied: a broken copy is never made.
- **A swarm already here**: from the same root and path, booted from its
  own copy (the package not read again); from another: refused.
- **`swarms.json` is fully qualified**: each swarm's root and path, and
  each package's `contents.json` entry as it was when the swarm was made
  (source, commit, uncommitted, hash).

### Functionality: a URI, a cold boot, a teardown (agreed 2026-11-07)

Everything a package offers (a swarm, a test, whatever comes next) is a
**functionality**: a folder in the package, addressed by URI, booted the same
way.

- **URI: `<repo>[/<type>/<name>]`**, booted by `./haicc boot <uri>`
  (`--from=` for another root than `haiccing/`). The repository alone: its
  swarms (all of them). The type decides where it lands in the work folder
  (`swarms/<name>/`, a test's run in `swarms/test/<name>/`) and its
  defaults. `<repo>/test`: a set of tests (`--set=`, default `full`).
- **Its cold boot**: the functionality's own `boot` (sh), when it has one,
  else its type's default from the platform (`platform/<type>/boot`). The
  cold boot can be customised as required: it sets up what it needs, hands
  over to the warm boot (`./haicc ...`), does what it is for, cleans up as
  part of its execution. Nothing else distinguishes the types.
- **Its teardown**: its own `teardown` (sh), else its type's default. A
  test is torn down on completion by default; its result is its cold
  boot's exit code; what it printed stays in the log.
- **A test that changes what is outside its run** (the host, shared
  resources, the install itself) repairs it in its teardown, or declares it
  (`test.json`: `"destroys": "<what, and how to restore it>"`) and is run
  only with a yes, the message saying a new install may be needed.
- **Tests**: `test/<test>/` with `test.json` (`categories`, `needs`,
  `destroys`); a test with a `boot` is booted (it needs a work folder); one
  with only a `test` script runs in place (the package manager runs it, no
  work folder: what an install's validation can run). The sets:
  `test/validation.json` (in place, nothing started: an install, a node's
  warm boot), `test/full.json` (everything: before a release, a downloaded
  release); each lists its tests, and whether the modules' own tests are in
  it. A test's `categories` and the sets agree (a validation test checks
  it).
- **The platform test** needs no special case: its cold boot sets up a
  fresh install from the package under test, inside its run's folder,
  boots it, works the levels with its `./haicc`, and its teardown removes it.
- **A downloaded release tests itself**: `sh haicc-setup.sh ~/haicc-work &&
  ~/haicc-work/boot && ~/haicc-work/haicc boot base-package-haicc/test`.
  The package is the environment; the development repository is storage
  and communication.

### Built: step 1, haicc (2026-11-07)

The rebuild goes one package a step, each tested on the platform before the
next. (A first pass wrote every package at once, untested on the platform:
narrowed back to haicc, the human's call.)

- **The package writer** (`tools/package-writer`, the development
  environment's): a package in the structure above, self-contained, tested
  before it is written. The third-party code is its input (this
  repository's `node_modules/`, recorded in `modules/third-party.json`): no
  `third-party` package. `packages.json` defines haicc only, for now.
- **The package manager**: `assemble` (a swarm's codebase into a master's
  repository, `contents.json`), `test` (bottom up; a run that does not end
  stopped after 10 minutes, failed). One algorithm for what a set of modules
  runs on (`lib/closure.js`), shared by both sides.
- **The new `base-package-haicc`**: `modules/pear-full-square/` (the boot,
  reconcile, deployment, the package manager), `test/modules-load`. HAICC's
  paths through `modules/`. A node's cold boot copies in only this package;
  its warm boot, the self-test, bottom up. A node's HAICC: `boot`,
  `shutdown`, `list`, `version`, `fetch`, `test <package>`; the project
  verbs go (a node installs nothing).
- **Tested on the platform**: `steps/phase-3/2-package-structure/1-haicc/run.sh`
  (written, released, set up, booted, a swarm and two nodes, every level
  shut down and booted, teardown, the cold shutdown, `./boot` again): 21
  steps passed (`run.log`).
- **Tests on the platform, carried by the package** (2026-11-07): `./haicc
  boot <repo>/test[/<test>]` (the functionality design above, for type
  test); the package manager's `test --set=`; `base-package-haicc/test/`:
  `validation.json` (`modules-load`, `sets`), `full.json` (the modules, both,
  and `platform`: a fresh install inside its run, every level, 19 steps);
  `platform/test/teardown`, the default teardown. A node's warm boot runs
  the validation set. On a freshly set up release: `./haicc boot
  base-package-haicc/test`, 7 passed, 26 s. The first script
  (`steps/.../1-haicc/run.sh`) is gone: the package carries its tests.
- **On Bare** (2026-11-07; the human: Bare only, `brittle` for tests, no
  Node.js equivalence; the runtime carried by the platform's package; hard
  links for copies within a work folder): HAICC, reconcile, deployment and
  the package manager on Bare's own modules (`bare-fs`, `bare-subprocess`,
  `bare-tcp`, `bare-dgram`, ...), their tests on `brittle`; the package
  writer on Bare too (`tools/bare`, this repository's runtime). **The
  setup carries the full runtime** (97 MB; the setup 36 MB), not the
  package's git (the human, after the local agent's finding: one 92.6 MB
  file in git, near GitHub's 100 MiB limit, and every Bare upgrade added to
  the history): `release.sh` puts it in the setup, pinned by its sha256;
  the setup extracts it to `bare/` and checks it; step 0 checks it runs
  here; the launchers run `bare`; no Node.js, no download. The package:
  27 MB, mostly `bare-tls` (12 MB, brought by `brittle`'s dependencies:
  HAICC makes no TLS connections) and `bare-crypto` (6 MB): to trim, later. Packages carry `brittle` (their own tests run on it); a named
  test, outside `modules/`, imports by its path in the package. Found on
  the way (the probe's record): Bare's `spawnSync` has no time limit
  (coreutils' `timeout`) and hangs on `input`; `console.log` bypasses
  `process.stdout` (the log now takes every line through one synchronous
  writer: in order, nothing lost to an exit); `brittle` takes relative
  paths. The full set from a fresh release, Node.js off the PATH: 7
  passed, 41 s.
- **Step 2: a node's boot, validated by the node itself** (2026-11-07):
  the warm boot checks each package copied in intact (its hash, the
  package manager's `packageHash`, the one the package writer records:
  everything but `package.json` and `.git`, the readme last), then runs its
  validation set; up only when both pass, else it says which, its tests are
  not run, and the swarm's boot stops there. On demand: `./<swarm>/<node>/
  haicc test <package> [--set=]`, intact first. Copies are hard links: a
  file changed in place would change every copy (and the original); a file
  replaced breaks the link for that copy only, and its hash says so. The
  platform test: 23 steps (a node validated; a file replaced in node-1's
  copy: not intact, not up, the swarm's boot stops; repaired by its
  shutdown and a boot from scratch). From a fresh release: 7 passed.
- **A node's boot, cold and warm** (the human): cold makes the node's
  folder and copies in the minimum code; then warm takes over.
- **Next: the package manager, the second package**: its named tests run
  on the haicc platform, deploying and testing node creation (a test swarm
  in `test/<test>/swarms/`, its codebase assembled into the master's
  repository).

### Two sides of the airgap

- **Creating packages is the development environment's**, on the
  connected side: a tool of this repository (not shipped) writes
  haiccing's packages from its modules (the third-party import with it,
  the one contact with npm): the code-only packages (`p2p`, `mycelium`,
  `splectral`: published, for development) and the platform and swarm
  packages, in the structure above.
- **The package manager works only from packages made**: from the host's
  packages (`haiccing/`, `user/`) into a master's package repository. It
  installs and tests; it never creates.

### Sources and contents: each packages folder describes itself

```
# haiccing/sources: one line per package, or * for the rest; the first that matches wins
base-package-haicc  folder /home/you/repos/haiccing             # the files as they are: development
base-package-p2p    git    /home/you/repos/haiccing feature-x   # committed, a local clone (default main)
*                   github haiccing                              # committed, GitHub (default main)
```

- **`folder`**: any folder, as it is, uncommitted changes included (test
  before committing). **`git`**: a ref of a local clone: the same content
  as GitHub, without the network. **`github`**: with a ref. Locally,
  clones in `<org>/<repo>`: a `folder` or `git` line on the org's folder.
- **Mix and match**, per package: the folder's `contents.json` shows it.
- **`contents.json`** in every packages folder (`haiccing/`, `user/`, the
  root's `packages/`, each master's `repository/`): each package, its source, commit,
  uncommitted or not, hash (SHA-256 over its sorted paths and contents,
  `.git` excluded), when it came; written by what put it there. A hash
  that no longer matches: "changed since fetched". A package placed by
  hand: "placed by hand", recorded on first use.
- **A missing package is fetched** as its root's `sources` say. Sources
  changed: nothing fetched again until `./haicc fetch`; `./haicc list`
  shows the difference.
- **Air-gapped**: no `github` line; Node.js from a local folder named in
  the sources; the node containers' base image from a local file
  (`docker load`), with the master's swarm step.

### Tests

- **Run by the user** (a person or an AI), by hand: no `test` command at
  the root, no package manager there. The package manager runs a
  package's tests where it runs (in a swarm), later.
- A named test's `test` runs with `HAICC_WORK` set to the work folder;
  it boots its swarms with `./haicc boot <repo>/test/<test>` (into
  `swarms/test/<test>/`), checks them, and shuts them down. It never
  writes into the package; its output goes to `log/`.
- Passed: its run's folder removed (its Docker resources by label);
  failed: kept to look at; the next run removes it first.
- A test that brings its own `platform/` runs in its own install in the
  parent folder.

## Boot and shutdown by level (agreed 2026-11-06; superseded by the section above, kept as history)

```
<work>/
  boot  shutdown                                  the cold boot and shutdown (stubs naming the setup)
  haicc  haiccing/  packages/  nodejs/  log/     the root
  swarms.json                                     the host's swarms (the root's config)
  <swarm>/                                        a swarm on this host (e.g. hosts): the host's structure
    haicc                                         its launcher: the root's HAICC, in this swarm
    nodes.json                                    its nodes here and their roles (the swarm's config)
    <node>/                                       a node's manager (master, node-1, ...): the swarm's structure
      haicc  packages/  log/                      the node's own HAICC (installed for the swarm), its log
```

- **A `haicc boot` or `shutdown` works on the config in the folder it is
  called from**, and keeps it. Then there is the work folder's cold boot
  and shutdown (`./boot`, `./shutdown`), which make and remove the root's
  HAICC.

| Called from | Its config (kept) | `haicc shutdown` | `haicc boot` |
|---|---|---|---|
| node `<swarm>/<node>/` | the node's own | its container removed | its container started again |
| swarm `<swarm>/` | `nodes.json` (and its launcher) | each node's cold shutdown (node folder removed) | each node in `nodes.json` built from scratch and booted, master first |
| root `<work>/` | `swarms.json` | each swarm's `haicc shutdown` | each swarm in `swarms.json` booted |
| work folder, cold | `haiccing/`, `log/`, `nodejs/` | `./shutdown`: everything removed back to the setup | `./boot`: set up from `haiccing/`, then `./haicc boot` |

- **One thing made or removed, from its parent:** `<swarm>/haicc boot
  <node>` adds the node to `nodes.json` and boots it; `<swarm>/haicc
  teardown <node>` removes the node and its entry. `./haicc boot <swarm>`
  adds the swarm to `swarms.json` and makes its folder; `./haicc teardown
  <swarm>` removes the swarm and its entry.
- **A swarm's shutdown is a cold shutdown of its nodes** (their folders
  removed), keeping the swarm's config: its boot builds them again from
  `nodes.json`. A node's data backup: not in scope now.
- **Folders, mirroring the URI** (`/<swarm>/<node>` is `<swarm>/<node>/`).
  Names required, made URI parts if they are not (the change said).
- **The host's structure** (the root, a swarm's folder) runs the root's
  HAICC and logs in the root's `log/`. **The swarm's structure** (each
  node) runs the node's own HAICC, logging in its own `log/`, echoed back
  (`--no-echo`: its outcome only).
- **A node's boot**: its manager made, the package manager and HAICC
  copied in whole, then its own boot: the self-test of what was copied in.
  Its container: with the swarm's step.
- A plain remove for now, asked first. **Logs are kept**; **external
  third-party downloads are retained** (`nodejs/`; Bare's runtime later).
  Teardown with checkpointing and backup: on the roadmap.

## The work folder, one route, a double boot (agreed 2026-11-05, revised 2026-11-06)

**Decided by the human, 2026-11-06, over what follows: no hidden folders, full
stop.** "It doesn't make sense to have visible state change in a hidden
folder." Done (2026-11-06): `install/` and `log/`, below; `.haicc`
elsewhere in this note is the history it replaced.

**Decided by the human, 2026-11-06, over the layout below: `packages/`, `node/`
and `log/` at the top of a work folder and of a manager; `install/` goes. A
timestamp and a duration per command; log files timestamped in their names,
so the folder sorts on the timeline.** To build: `next.md`.

```
<work>/
  haicc                 the launcher: ./haicc <command>
  haiccing/             boot (the stub), sources, [install], the repositories
  install/              the root install: node/, haicc-base-boot/
  log/                  the log: haicc.log (the setup's, the boot's, every command's)
  manager/              the swarm: self-contained (next: haicc boot <manager>)
```

- **The setup** is a release of `base-package-haicc`: a self-extracting
  shell archive (`haicc-setup.sh`: `sh` and `tar` only) extracting
  `haiccing/boot`, `haiccing/sources`, `haiccing/base-package-haicc/`.
- **Stage 1, `haiccing/boot`** (shell, before Node.js): only what HAICC
  needs to run: Linux x86-64 and Node.js (fixed with a yes, into
  `install/node`); the root's part of HAICC, `haicc-base-boot`, copied into
  `install/` at the first boot only (versions later); `./haicc` written;
  then stage 2.
- **Stage 2, `./haicc boot`** (the root's HAICC): the host's other
  prerequisites, git and Docker Engine (installed, running, rootful,
  native, the user in its group), checked and fixed with a yes; then
  `haiccing/install` (one `./haicc` command a line), or the next commands.
- **The root is `haicc-base-boot` alone** (76 KB, Node.js built-ins):
  the boot, `fetch`, `list` (the managers), `boot <manager>` (next). No
  package manager, no engine, no deployments: those are the managers'.
  Dependencies are only between `haiccing` repositories, so the root
  depends on nothing: its host checks are its own copy of
  `haicc-reconcile`'s machine kinds, a test keeping the two agreeing.
- **HAICC runs on Node.js alone**: its package requires only `pkgm`. Its
  records are files (journals, JSON lines); its name check its own (a URI
  part). Topics are not HAICC's: a sync into topics is a separate process,
  installed into a swarm, later.
- **The log is what a command prints**: stdout and stderr appended to
  `log/haicc.log` in order, from the setup on, a header line and a close line per
  command; files of 10 KB, rotated as a command starts (whole commands a
  file). Levels: normal (the state changes and the outcome), `--verbose`,
  `--debug`. Every visible state change is printed.
- **No hidden folders** (the human, 2026-11-06): `install/`, `log/`; an
  install's registry `pkgm/`; the owner's mark `haicc-owner`; no
  temporary dot-files. A manager has the same shape: `<manager>/install/`,
  `<manager>/log/`.
- **The setup** logs too, from its first line; set up again over the same
  setup it says so (exit 0), over another it names both and says to use a
  new folder (exit 1). The published commands are one command joined with
  `&&`, `curl` retrying. Where the log is, the instructions say.
- **Each swarm self-contained** (the manager boot, next): HAICC installed
  in the manager too, with the swarm's packages; processes there resolve
  their modules from the manager's folder; the manager's HAICC logs locally,
  echoed back to the root's or not (a config). The master's manager folder
  syncs its packages into the swarm; a node's are synced from the swarm into
  its manager folder (the p2p version).

## Folders on a machine

One root, each repository its own folder, laid out by fully qualified
name (`<root>/<org>/<repo>`). A package lays its modules into the root at
module level (`<root>/<org>/<module>`), the third-party code once
(`<root>/node_modules`): no module in two packages, so no collisions and
no duplication; the package manager records which package owns which
folders, so a package is still updated or removed as one unit. Folders
are units of storage and update; processes are by function (the Splectral
server, a watcher, a node manager each), importing from whichever folders
they need. Packages get folders of their own outright once modules import
each other by name.

## Sizes (measured 2026-11-04, pruned for Linux x64)

| Package | Size |
|---|---|
| `haicc` | 0.1 MB |
| `splectral` | 0.2 MB |
| `mycelium` | 0.4 MB |
| `p2p` | 1.3 MB (0.3 MB modules, `p2p-git` 1.0 MB) |
| `third-party` | 144 MB as imported (part 1), 1,822 files: Bare's runtime 97 MB (with debug information; left out of this first measure), and native binaries 30.5 MB (`rocksdb-native` 19.5 MB, `sodium-native` 2.1 MB, `udx-native` 0.5 MB, the `bare-*` modules), React, react-dom and htm 5.0 MB, other JavaScript about 5 MB |

An update adds only the files that changed: our modules a few KB; the
third-party package only at an import, and only the modules whose versions
changed. The `mycelium-*` modules' separate installs held another 24 MB of
duplicates (a second Corestore, Hyperdrive, isomorphic-git, `rocksdb-native`,
`p2p-git`): gone once they join the one workspace.

**Step 0, the host's prerequisites** (agreed 2026-11-05): HAICC's boot, in
plain shell, before Node exists.
- `check`: each prerequisite with the version found, the version
  required, ok or not, and what `fix` would do; it changes nothing. The
  required versions in one file, read by check and fix alike: Linux
  x86-64; Node.js 22 or later; git 2.25 or later; Docker Engine, rootful,
  native, running; the user in the `docker` group. All needed to boot:
  nodes always run in Docker containers. (The shell twin of
  `haicc-reconcile`'s machine providers.)
- `fix`, only with the human's yes, asking before anything needing
  `sudo`: Node.js, the official release for Linux x64, into a folder of
  ours (`~/.haicc/node`, no `sudo`; Ubuntu's own is too old); git with
  `apt`; Docker Engine with `apt`, the `docker` group, the daemon started
  (saying what needs a new login); checked again after each fix.
- Bare is not a host prerequisite: its runtime comes in `third-party`,
  and the node image takes it from there.

**From scratch**: each `haiccing` repository's readme gives a script for a
bare machine with only `curl` and `tar`: the repositories needed fetched
as archives and unpacked side by side, then the kick. Since code then
comes from the install folder rather than a git tree, the node image is
built from a folder too.

**Names**: the boots' and the package manager's code in
`pear-full-square/pkgm-base-boot` and `pkgm-base-manager` (the human,
leaving room for more sophisticated versions); HAICC's boot with HAICC's
code in `pear-full-square` (a `haicc-` module). The packages:
`haiccing/base-package-haicc` (the entry), `-pkgm`, `-third-party`,
`-p2p`, `-mycelium`, `-splectral`.

**Other aspects of booting**:
- **one install folder on the host** (`~/.haicc/packages`), shared by
  projects, laid out fully qualified (see "Folders on a machine");
- **whole or nothing**: a package installed into a temporary folder and
  moved in place, so a failed install leaves no half package;
- **the platform**: `third-party` for the host's platform;
- **the boots kept tiny and stable** (plain shell; they say their
  version);
- **no secrets**: boot never touches a vault;
- **trust**: today the repositories as they are; later signed releases
  (Pear);
- later, a node's own boot could use the same package code.

## Cascading click and runs

Every layer is a `haiccing` project, a click and run of its own, whose
prerequisites (other projects, strict or not) are a state reconciled like
any requirement. Bootstrapping and layering, one step at a time: `start`
on a project brings up the layers below it. The click and run is a
project's script: it kicks HAICC if needed (booting), then `haicc run
<project>`: deploy and start what the project needs, open the browser; the lifecycle verbs (`deploy`, `start`, `stop`,
`teardown`) stay for each step on its own.

1. a workspace: the packages a project needs, installed by the package
   manager from their side-by-side repositories (no npm);
2. a swarm host: the node image, a swarm on this host;
3. a demo: Splectral with its components, and its scenario.

**Each project carries its tests**: its state as declared, and a smoke
test of what it provides; validated before use (in the development
repository) and when deployed (`sh haicc test`).

## Then: Android

After Linux x64 runs: a skeleton node on Android, probed first with Termux
on the human's phone, by the local Claude Code agent. Bare runs a minimal
node (identity, joining a swarm from an invitation, liveness, its own
repository) and a small local web server; the phone's browser opens
`http://127.0.0.1:<port>`. Before it, the `third-party` package for
Android arm64. An app with Bare Kit after the probe.
