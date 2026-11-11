# Packages

Status marks: **built** (in the code, tested), **agreed** (decided, not built).

## What a package is

**Agreed** (the human, 2026-11-10; restarted from scratch; phase 2's
structure and its package writer removed, 2026-11-11). A package
models a structure of mrepos and how it is built and installed.

- **A package depends only on packages**, never on a module elsewhere
  (below, "The packages of an mrepo"): the runtime, boot, mrepo and an
  application each contribute their part; an application's manifest lists
  the packages it requires.
- **A structure unit, the same at every level** (recursive: a package, an
  mrepo inside it, a test, an example), each part optional, a part present
  giving the unit what it is for: `run.js` executable, `modules/` (with
  `package.json`) its own dependencies, `mrepo/` an mrepo; no install code
  of its own (below, "The boot mrepo"). `test/` and `example/` are
  collections, a unit a folder, not units themselves:

```
<unit>/
  mrepo/             its mrepo's definition, by layers (below)
  test/<name>/       its tests, a folder each, each a structure unit (as needed:
                     an entry, run.js, executed: bare test/<name>/run.js)
  test/<set>.json    the tests for a purpose, { description, tests }: validate
                     (the deployment checked), full (all), ...
  test/run.js        a set run, each test its own process: bare test/run.js
                     [<set>], validate by default
  <name>/            a further unit: another mrepo (dispatch, terminal, a node), by its URI part name
  example/<name>/    optional: examples, a folder each, each a structure unit (no
                     other package named as one)
  modules/           its dependencies, where it has its own: ours copied whole
                     (<org>/<module>/), the third-party code (node_modules/)
```

- **One structure, many purposes** (the human, 2026-11-11): the same
  structure holds a definition (a package: `mrepo/` with its `layer.json`
  files), documentation in place (a docs package: a README where each
  level or layer would be), examples (actual configs) and tests (what a
  repository is checked against). Known once, found everywhere.
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

## The packages of an mrepo: the runtime and what plugs into it

**Agreed** (the human, 2026-11-11). An mrepo links several packages, each
for what it contributes; no copies between them:

| Package | Contributes |
|---|---|
| `base-package-runtime` | the engine and the entry point (the bundle Bare runs): the process, the store, the internal protocols (request, execute); its parts of the structure (`runtime/`, the boxes, `request/*`). No external protocol |
| `base-package-boot` | the `boot` protocol (`deploy`, `teardown`, `redeploy`): in an mrepo that deploys others |
| `base-package-mrepo` | the `service` protocol |
| an application (`base-package-haicc`) | `main`, its own protocol |

- **A package requires packages instead of copying them**: the application
  declares what it requires (the runtime, boot, mrepo); the runtime loads a
  protocol's package from `packages/` (its bundle, by path) and calls its
  actions. A protocol's actions import no framework code: they get what
  they need through the execution context (`exec.read`, `exec.put`,
  `exec.select`), so a protocol package carries its own logic only. Native
  addons are shared by hash anyway. Self-contained still: the runtime
  package, and a standalone release (the boot's).
- **Two roles, three entry points** (the human, 2026-11-11), each
  optional, at the package's top: `deploy.js`, deployment only (the
  package's part of the structure, `mrepo/`, and its requirements, read by
  the parent's `boot deploy`); `protocol.js`, its protocols' actions
  (loaded by the mrepo's runtime, named by each protocol's config); `run.js`,
  self-contained execution (run by Bare: the runtime package, a test, the
  boot's standalone release). One bundle a package, one hash. Its main,
  `main.js`, is the package's dispatcher (the human, 2026-11-11; **built**,
  written by `tools/package-bundle.js` from the entry points it has): started
  as the program (`bare <package>.bundle ...`), `run.js` runs; imported,
  nothing runs and `run`, `deploy`, `protocol` are offered (a bundle is
  loaded only through its main: once loaded, its modules can be imported by
  path).
- **Packages put in place are a boot activity** (the human, 2026-11-11):
  the store, `<work>/packages/<org>/<package>.bundle` (and
  `<work>/packages/addons/<sha256>`), holds each package an mrepo
  references, once a work folder; an mrepo's `packages/` hard links to it;
  its `packages` layer commits the list and the hashes, not the bytes.
  Sourced, checked and linked by `boot deploy`, the parent's; for the
  initial boot mrepo by the release, a prerequisite step (as Bare), from
  the bundles it carries. Changing an mrepo's packages is a `redeploy`: no
  packages protocol.
- **Deploy targets a package** (the human, 2026-11-11; **built**): `boot
  deploy /<name>` names its target in the body (`{ package }`); the
  target's `mrepo/packages/layer.json` lists, in order, the packages the
  child is made of (for the HAICC platform, `base-package-haicc`'s; for a
  test, the runtime alone: an mrepo with a runtime and no protocols); each
  package's `mrepo/` part, read from its bundle, laid in in that order (a
  later file replaces). The child lives inside its parent,
  `<parent>/main/<name>/`; its type recorded at the node, `/main/<name>.json`.
  Only a package with a deploy part brings structure (`base-package-boot`
  brings none: its protocol only). The boot mrepo's first-boot structure has
  no `service` (not service managed): its packages the runtime and boot, its
  preloaded request `boot deploy /host`.
 (the human, 2026-11-11): a URI, as
  `mycelium-xpath` navigates it, goes only forward from where it starts (no
  `..`); reaching outside takes a mapping, resolved under the hood
  (`repositories.md`, "Roots, boundaries, mappings"): the work folder's
  store, `<work>/packages/`, is reached that way, not by a path upwards.
  Children live inside their parent (the host at `boot/main/host/`), so
  the parent reaches a child's inbox folder forward. One store.
- **Each package hard linked individually** (the human, 2026-11-11): its
  bundle and each of its addons, into the mrepo's `packages/`, so the mrepo
  runs only the packages registered for it, at the versions its layer pins,
  and its folder shows what it runs. Linking is part of every deploy (a few
  dozen links, no data copied); a restart links nothing.
- **Deploy ends with the child's runtime started** (the human): from its
  own `packages/`, by its directory (`bare <repo>/packages/haiccing/
  base-package-runtime.bundle <repo>`; the runtime runs the mrepo it is
  given, its socket inside its directory: several in one work folder): its
  inbox operational. `teardown` stops it first (waiting until its process
  has ended). The first-time boot does the same for the boot mrepo: its
  request handed over, its runtime started from its own `packages/` (the
  human, 2026-11-11), which then deploys the host.
- **Linking registers a package's protocols** (the human, 2026-11-11):
  linking a package into an mrepo puts its bundle in `packages/` and writes
  the configs its `protocol.js` exports into the `protocols` layer, as
  global protocols: a deploy activity, generic, done by the routine, no
  code in the package. So a protocol-only package (`base-package-boot`,
  `base-package-mrepo`) needs no `deploy.js`; that is for a package that
  brings more structure (the runtime's layers, an application's `main`).
  Local registration (on a section of `main`) stays explicit.
- **Deploying is the boot protocol's `deploy`**, executed by the parent
  (the host: `boot deploy /host`, run by the boot mrepo): the
  application's requirements resolved into an order (runtime, boot, mrepo,
  the application), each sourced and checked, their `mrepo/` parts
  overlaid in that order, built, linked into `packages/`, cleaned up. No
  install code in a package; what is the application's own runs inside the
  new mrepo (its preloaded `service initialise`).
- Each component's part of the structure lives with it (the human): a
  module or package carries an `mrepo/` folder with its part, laid out by
  layers; the mrepo is their overlay.

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
- **Building is the boot protocol's**: the install routine (overlay,
  build, clean up) is in `base-package-boot`, which mounts the `boot`
  protocol (`deploy`, `teardown`); an mrepo that deploys others has it
  linked into its `packages` (the human, 2026-11-11; was the framework's,
  `base-package-mrepo`); no install code per unit.
- **The boot's release is its bundle**: `base-package-boot.bundle` carries
  the boot mrepo, prebuilt (its git directory as files, or a git bundle
  inside it if that proves awkward), and the code to unpack it; run with
  Bare (`bare base-package-boot.bundle --work=<work>`), it extracts its
  mrepo into `<work>/mrepos/boot/` (on disk, git only: no Corestore) and
  starts it. No separate setup to build: outside, only Bare ensured and the
  bundle's hash checked (the same few lines of shell for every release).

**Agreed** (the human, 2026-11-11): **the boot's release is a standalone
executable, platform-specific** (`bare-build --standalone`: Bare built in,
the bundle embedded, native libraries self-extracting; one a platform,
`linux-x64` first). No prerequisite outside it. It checks the machine at
the start of `run.js` (before anything is written), unpacks the boot mrepo,
puts Bare in place **only if none is there** (pinned, checked; or an
installed one used, below: every later mrepo process runs on it), and starts the boot's runtime from the
repository's own `packages/` (`base-package-mrepo`), then exits. The other
packages stay plain bundles. Tried (2026-11-11): a standalone of
`base-package-boot/run.js` builds (104 MB) and loads all its modules,
native addons included; files beside the code are not there inside it
(`import.meta.url` is `bare:/app.bundle/…`), so `mrepo/` travels as a
module; its Bare (v1.35.0, `bare-build` 1.6.2) is not the repository's
(v1.36.0). **The Bare version is the one provided** (the human,
2026-11-11): what `bare-build` builds in when the boot is built is the Bare
that release puts in place (pinned, checked); a newer `bare-build` moves
it. No custom runtime. **An installed Bare first** (the human, 2026-11-11,
replacing "one version"): the boot's check takes a Bare installed on the
machine (the first `bare` on the PATH) at the pinned major, the same
version or newer, and records it in `<work>/bare.json` (its path, its
version; the mrepos started there run on it; only its version can be
asked, no sha512); none there, the pinned one is put in place as before,
with a yes. **Built** (2026-11-11).

**Prerequisites** (agreed, the human, 2026-11-11): each mrepo checks its
own when it is deployed, declared with their conditions in its package's
config; a fix only with a yes, otherwise it stops and says what is
missing; the outcome recorded in the request.

| Prerequisite | When | Whose |
|---|---|---|
| platform (`linux-x64`), the work folder (writable, no other mrepo there), the sources reachable | always | the boot, at the start of `run.js` |
| Bare | always; an installed one (the pinned major, the same or newer) used, else the pinned one put in place | the boot |
| Docker Engine (installed, running, rootful, native; the user in its group) | only where nodes run as containers, and not inside a container itself (`/.dockerenv`, `/proc/1/cgroup`) | the host |

No longer needed: git (p2p-git), curl (fetching in Bare). In a container
the host runs no nodes (the HAICC platform alone).

**A prerequisite with a local option has it in the sources** (the human,
2026-11-11): what it can be fixed from is kept in a source, by its
organisation, so a machine without network can be set up from files
(`sources/` here, gitignored: `haiccing/`, `holepunchto/` for Bare's
tarball, `addons/` shared). Built for Bare. Next, with the host's
prerequisites: the nodes' container base image (`docker save`, loaded with
`docker load` when missing; e.g. `library/<image>-<tag>.tar`). Docker
Engine itself has none: a system install, only checked.

**Direction** (the human, 2026-11-11; not now): **`package-sources-https`**,
a package that fills a local sources folder with what is missing, over
HTTPS (the packages and their manifest from GitHub, Bare's tarball from
npm's registry, later the base image from Docker Hub), each by its
organisation and checked against its pin. The boot then reads `folder:`
sources only and carries no HTTPS addons (`bare-tls`, `bare-tcp`,
`bare-dns`, about 13 MB); a machine without network gets a filled
`sources/` copied to it. To settle: how the boot reaches it (a standalone
executable too, run before the boot or by it). Likewise each package
carries only the addons of what it imports: the p2p storage's
(`rocksdb-native` and others, about 10 MB) and the swarm's (`udx-native`,
`sodium-native`) with the packages that use them, not the boot. And,
once a swarm runs, **a sources swarm** (the human, 2026-11-11): a source
kind of its own (`swarm:<key>`), an mrepo whose `packages` layer (laid out
as a source) is replicated, a package fetched from any peer that has it,
checked by the same signed manifest. The boot unchanged either way: it
reads a filled sources folder.

**Built** (2026-11-10, the first piece): the boot mrepo's structure,
`haiccing/base-package-boot/mrepo/` (type `boot`, initialised already, its
API in `runtime/`; preloaded `service start /`), built into a standalone
repository by `mrepo-base-boot`'s `lib/build.js` and run on the `filesystem`
storage (p2p-git, every layer on the filesystem). Not yet: `service boot /host`, the
overlay on `base-package-mrepo`'s structure, the clean-up, the bundle.

**Open**: the package's manifest; the boot mrepo's API beyond the generic.

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
  side: a package's folder in `haiccing/<repo>/`, its `modules/`
  assembled from this repository's modules and `node_modules`
  (`tools/package-assemble.js`, never shipped); its bundles and the release
  written from it (to be rebuilt: phase 2's package writer and release
  removed, 2026-11-11).
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
contents; sha256). Was recorded by phase 2's package writer, checked by
the package manager (`verify`); to be recorded again when packages are
written. What is tested and hashed is what ships: the `LICENSE` in before
it is hashed (a release's candidate once failed without it).
