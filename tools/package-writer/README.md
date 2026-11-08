# The package writer

The development environment's side of the airgap: haiccing's packages
written from this repository's modules, never shipped. The package manager
(`pear-full-square/pkgm-base-manager`) only works from packages made: it
assembles a swarm's codebase into its master's package repository, and
tests.

```sh
tools/bare tools/package-writer/cli.js --out=<folder of package repositories> [--only=haicc,swarm-three-nodes] [--keep]
```

- **What**: `packages.json` at the repository's root, one definition a
  package: its modules (`<org>/<module>`, or `{ path, from }` for one from
  elsewhere), `with` (other definitions' modules written in with it: a
  convenience here, not a requirement at run time), its readme lines.
- **The hand-written parts** from `haiccing/<repo>/` as they are: its
  README, `swarms/<swarm>/` (`nodes.json`, `modules.json`, ...), `test/`,
  `platform/`.
- **Self-contained**: from what it starts from (its modules, its swarms'
  `modules.json`), the writer works out the rest, all the way down
  (`pkgm-base-manager/lib/closure.js`, the same algorithm the package
  manager uses): ours by their imports (by name, or a relative path into
  another module) and their package.json, third-party code by its
  dependencies, from this repository's `node_modules/` (the one contact
  with npm), recorded in `modules/third-party.json`.
- **Tested before written**: every package staged and tested by the
  package manager, bottom up (its modules' tests, its swarms', its named
  tests: `test/modules-load` written here); only when all pass is any
  written, each into its repository's folder in `--out` (`.git` kept).

The structure: `notes/packages.md`, "Packages, platforms, swarms and tests".
