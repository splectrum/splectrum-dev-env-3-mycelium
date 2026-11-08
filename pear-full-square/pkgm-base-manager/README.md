# pkgm-base-manager

The package manager. It works only from packages made (making them is the
development environment's, the other side of the airgap: the package
writer, `tools/package-writer` in the development repository): a swarm's
codebase assembled from its package into the master's package repository,
and a package's tests, bottom up. On Bare (Bare's own modules): no npm, no git.

```sh
pkgm assemble <package folder> <swarm> --into=<repository>   # the swarm's codebase into its master's repository
pkgm test     <package folder | repository>                 # its tests, bottom up
pkgm contents <repository>                                  # what is there, and where it came from
```

(`pkgm` is `node <...>/modules/pear-full-square/pkgm-base-manager/cli.js`.)
The platform's package (`base-package-haicc`) carries it.

## A package

```
<package>/
  package.json  README.md       "pkgm": { package, modules: { ours, third }, swarms, tests, platform, hash }
  modules/<org>/<module>/        ours, each with its own tests
  modules/node_modules/          third-party code; links to ours by name
  modules/third-party.json       the record: version, licence, integrity of each
  swarms/<swarm>/                nodes.json, modules.json (its codebase), splectral.json, host.json, test/
  platform/                      when it carries the platform
  test/<test>/test               its named tests
```

Self-contained: it carries what it runs on, no requires. The design:
`notes/packages.md` in the development repository, "Packages, platforms,
swarms and tests".

## Assembling a swarm's codebase

`swarms/<swarm>/modules.json` names the modules the swarm uses; the
package manager works out what those use, all the way down (`lib/closure.js`:
ours by their imports, by name or by a relative path into another module,
and their package.json; third-party code by its dependencies, nearest
first) and copies exactly that from the package's `modules/` into the
repository's: staged beside it, then moved in place. `contents.json` says
what is there: the package (its name, hash, folder), the swarm, the modules,
the hash of what was assembled, when. A name the package does not hold:
refused, nothing changed. Nodes use only what is in the master's repository.

## Tests, within the package, bottom up

Each module's `test` script in its folder; then each executable in each
`swarms/<swarm>/test/`, in the swarm's folder; then each named test,
`test/<test>/test`, in its folder. Each a normal executable; a run's counts
read from its output (`# tests N`, `# pass N`), its exit code decides. A
repository is tested the same way: its modules' tests, in place.
