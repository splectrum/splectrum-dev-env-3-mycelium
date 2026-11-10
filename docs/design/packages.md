# Packages

Status marks: **built** (in the code, tested), **agreed** (decided, not built).

## What a package is

**Agreed** (the human, 2026-11-10; restarted from scratch, not built: what
is built is phase 2's structure, below and in `packages.json`). A package
models a structure of mrepos and how it is built and installed.

- **A package depends only on packages**, never on a module elsewhere.
  `base-package-mrepo` holds what every base mrepo has in common (the
  runtime, the protocols, the fixed layers); a type's package (the type
  `haicc`: `base-package-haicc`) customises it with an external API and the
  structure of `main`, including where child mrepos are linked in. Its
  manifest lists the packages its mrepos require.
- **A structure unit, the same at every level** (recursive: a package, an
  mrepo inside it, a test), each part optional; no install code of its own
  (below, "The boot mrepo"):

```
<unit>/
  mrepo/             its mrepo's definition, by layers (below)
  test/              its test resources
  <name>/            a further unit: another mrepo (dispatch, terminal, a node), by its URI part name
modules/             once, at the package's top, shared by its units: its code, ours
                     copied whole (<org>/<module>/), the third-party code (node_modules/)
```

- **`mrepo/` is laid out by layers**, as the repository will hold them,
  with the same URIs (`mrepo/main/…` is `/main/…`): `main/`, `runtime/`,
  `packages/`, `inbox/`, `outbox/`, `request/pending/default/`, … At each
  leaf a config, `layer.json` (its mode: atomic, replicated, non-atomic;
  what it is for), so no folder is empty; committed with the layer
  (`initialise` may clean it up). The common package gives the fixed
  layers; the type's package `main` and what it customises. The `packages`
  leaf's config lists the packages to source.
- **Expanded folders, for readability**: what a person reads is what the
  repository will hold; a bundle (`bare-bundle`: its files listed by path,
  read by path) carries them, opaque, and they are copied out of it.

## Installing an mrepo from its structure

**Agreed** (the human, 2026-11-10). No deploy script: the install applies
the structure.

1. **Overlay**: the common `mrepo/` copied, then the type's on top: a file
   at the same path replaces the common one (whole files, never merged: a
   customised config is complete). The result renamed to the mrepo's URI
   part name: `<work>/mrepos/<name>/` (the host's: `host`). The folder is
   known before the repository exists: it is the build area (no
   `scratch`).
2. **Build**: the packages the `packages` leaf lists sourced (each checked
   against the signed manifest's hash) into `packages/`; each layer folder
   committed into its layer, in the store its `layer.json` names.
3. **Clean up**: what has no place on disk once committed removed: the
   atomic layers (`main`, `runtime`: in the Corestore only) and the
   non-atomic ones held in `.git` (`request/*`, `execute/*`, `outbox`).
   What stays: `.git/`, `inbox/` (its working tree), `packages/` (the
   replicated layer's files, what Bare runs).

A nested mrepo (dispatch, terminal, a node) is assembled the same way, from
its own unit, under its own URI part name. On a host, the code is in the
bundles (one a package, `packages/<org>/<package>.bundle`, carrying its own
copies); only native addons are shared, once by hash
(`packages/addons/<sha256>`).

## The boot mrepo: the root

**Agreed** (the human, 2026-11-10).

- **The boot is an mrepo, the first**, its root: `boot`. Its `main` holds
  what installs the host mrepo (its definition, a request preloaded to boot
  it); executing it builds the host into `<work>/mrepos/host/` and links it
  into the boot mrepo's `main`. The host then boots its own children
  (nodes, the dispatcher, the terminal) the same way.
- **`boot` and `teardown` are executed by the parent**, outside the mrepo
  they create or remove (`service boot /host`, sent to the boot mrepo); an
  mrepo itself executes `initialise`/`shutdown`, `start`/`stop`,
  `pause`/`resume`. **The boot mrepo is never torn down** (only the work
  folder removed by hand removes it).
- **Building is the framework's**: the install routine (overlay, build,
  clean up) a module of `base-package-mrepo`, the code a parent's `service
  boot` runs; no `boot.js` per unit.
- **The boot's release is its bundle**: `base-package-boot.bundle` carries
  the boot mrepo, prebuilt (its git directory as files, or a git bundle
  inside it if that proves awkward), and the code to unpack it; run with
  Bare (`bare base-package-boot.bundle --work=<work>`), it extracts its
  mrepo into `<work>/mrepos/boot/` (on disk, git only: no Corestore) and
  starts it. No separate setup to build: outside, only Bare ensured and the
  bundle's hash checked (the same few lines of shell for every release).

**Built** (2026-11-10, the first piece): the boot mrepo's structure,
`haiccing/base-package-boot/mrepo/` (type `boot`, initialised already, its
API in `runtime/`; preloaded `service start /`), built into a standalone
repository by `mrepo-base-runtime`'s `lib/build.js` and run on the `filesystem`
storage (p2p-git, every layer on the filesystem). Not yet: `service boot /host`, the
overlay on `base-package-mrepo`'s structure, the clean-up, the bundle.

**Open**: the build instructions in the package (today `packages.json`'s
entry); the package's manifest; the boot mrepo's API beyond the generic.

## Built: phase 2's structure (to be replaced)

```
<package>/
  package.json  README.md       its manifest ("pkgm": what it holds, its hash), its readme
  modules/
    <org>/<module>/             each module whole, as developed, with its own test/
    node_modules/               the third-party code they use; links to ours by name
    third-party.json            the record: each third-party module's version, licence, integrity
  swarms/<swarm>/               nodes.json, modules.json, splectral.json, host.json, README.md, test/
  platform/                     the platform's definitions (becomes mrepo/)
  test/
    validation.json full.json   its test sets
    <test>/                     a named test: its script (test, or boot), test.json, README.md,
                                and the package's parts it adds (modules/, swarms/, platform/)
```

The package writer writes it (`packages.json`, the hand-written parts in
`haiccing/<repo>/`), the bundle made from it (`structure.md`, "Packages as
bundles").

## Self-contained

**Built.** A package carries everything it runs on: its modules, the
modules of ours they use, the third-party code those use, all the way down;
no `requires`, nothing resolved across packages. What it holds is worked out
by one algorithm (`pkgm-base-manager/lib/closure.js`): ours by their imports
(by name, or by a relative path into another module) and their
package.json; third-party code by its dependencies, nearest first. Every
package also carries `brittle`, which its own tests run on.

In development the code is single-concern modules, each concern in one
place, modules using each other; a package is where they are copied
together. Shared in development, copied into packages: no copy is kept by
hand in a module.

*Why*: a package tested as the whole it is stays valid; a newer version of
something else changes nothing in it; and it works without a network. No
fine-grained versioning, upgrading and testing between packages: a package
is replaced as a whole (the human: like genes, each cell carries its own
copies, from one source).

## Sealed, validated, mixed

**Agreed.** haiccing's packages are **sealed**: used as they are. A swarm
made only from sealed packages of one source and ref (all `github haiccing
main`, or one release) is **validated**: the setup that was tested
together. Mixing (working trees, other branches, a user's packages) is
allowed for development and knowingly gives that up: such a swarm is
**mixed**, and says so. Nothing is refused for being mixed; everything is
recorded (each package's hash, in the swarm's record).

*Why*: a guarantee for what is used as published, and freedom for
development, without pretending one is the other (the human).

## Two sides of the airgap

**Built.**

- **Writing packages is the development environment's**, on the connected
  side: the package writer (`tools/package-writer`, in this repository,
  never shipped) writes haiccing's packages from this repository's modules
  (`packages.json`, and the hand-written parts in `haiccing/<repo>/`),
  taking the third-party code from this repository's `node_modules`.
  **Installed with Bare only** (2026-11-09, the human: no Node.js on the
  development side): `sh tools/install.sh` replays `package-lock.json`
  as `npm ci` would (Bare's runtime ensured first by the shell from its
  pinned tarball; then every package fetched with `curl`, checked against
  its sha512, unpacked; the git dependency at its commit; the workspaces
  linked); checked to give the same packages, versions and links as npm.
  npm is needed only to change the dependencies (resolve versions, write a
  new `package-lock.json`): the one contact with npm. Every package is
  staged and tested before any is written.
- **The package manager works only from packages made** (`pkgm-base-
  manager`, part of the platform): it checks a package intact, runs its
  tests, and assembles a swarm's codebase into a master's repository. It
  never writes a package.

*Why*: making and using never meet in one tool; what is used was made and
tested elsewhere, and can be carried across an airgap as files.

## A package's hash

**Built.** Its identity: everything in it but `package.json` and `.git`,
its `LICENSE` included, the readme last (paths, exec bits, links,
contents; sha256). Recorded by the package writer in `package.json`;
checked by the package manager (`verify`) wherever a copy is used. The
writer puts the `LICENSE` in (the published repository's own, else this
repository's) before it tests and hashes: what is tested and hashed is
what ships. (The ninth release's candidate failed without it: the hash was
taken before the repository's `LICENSE` was back, so every node refused
its copy; found by the local agent.)

## Packages in this repository

**Built.** `packages.json` defines the packages the writer writes, one a
step: `haicc` (the platform) and `swarm-three-nodes` (a configured swarm,
the p2p node as its codebase: 13 modules of ours, all on Bare). The writer
knows every module of this repository (its workspaces, `splectral/`), writes
every package's `modules-load` and `sets` tests, and gives a package that
brings no test sets the defaults (`validation`, `full`). The code-only packages (`p2p`,
`mycelium`, `splectral`) and the demos return one at a time, each on Bare,
each with its tests on the platform. `base-package-third-party` is no
longer written.
