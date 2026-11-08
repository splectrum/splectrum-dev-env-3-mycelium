# Packages

Status marks: **built** (in the code, tested), **agreed** (decided, not built).

## What a package is

**Built**, except where marked. A package is a self-contained folder,
published as a haiccing repository. Its structure, every part optional:

```
<package>/
  package.json  README.md       its manifest ("pkgm": what it holds, its hash), its readme
  modules/
    <org>/<module>/             each module whole, as developed, with its own test/
    node_modules/               the third-party code they use; links to ours by name
    third-party.json            the record: each third-party module's version, licence, integrity
  swarms/<swarm>/               agreed: nodes.json, modules.json, splectral.json, host.json, README.md, test/
  platform/                     the platform's definitions, when the package carries the platform
  test/
    validation.json full.json   its test sets
    <test>/                     a named test: its script (test, or boot), test.json, README.md
```

- **A package is what it holds**: modules only (code), swarms (a configured
  swarm), both (a demo), the platform. Recognised by its contents; `base-`
  is a naming convention for haiccing's packages.
- **Modules once, at the package's top**, shared by its swarms; each swarm
  names the ones it uses (`modules.json`: its codebase). *Agreed.*
- **One concern per file** in a swarm: its nodes (`nodes.json`), its
  codebase (`modules.json`), what Splectral shows (`splectral.json`), what
  the host must provide (`host.json`). *Agreed.*
- **The platform is a pair of packages** (agreed): `base-package-haicc` and
  `base-package-pkgm`; HAICC uses the package manager from beside it, the
  one exception to self-containment (`design/platform.md`).
- **The platform's definitions are a part like any other** (`platform/`): the levels'
  definitions and defaults (built: `platform/test/teardown`; agreed: each
  level's layout and the swarm config schemas). Any package that carries
  the platform can be released.

## Self-contained

**Built.** A package carries everything it runs on: its modules, the
modules of ours they use, the third-party code those use, all the way down;
no `requires`, nothing resolved across packages. What it holds is worked out
by one algorithm (`pkgm-base-manager/lib/closure.js`): ours by their imports
(by name, or by a relative path into another module) and their
package.json; third-party code by its dependencies, nearest first. Every
package also carries `brittle`, which its own tests run on.

*Why*: a package tested as the whole it is stays valid; a newer version of
something else changes nothing in it; and it works without a network.

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
  taking the third-party code from this repository's `node_modules` (the
  one contact with npm). Every package is staged and tested before any is
  written.
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
