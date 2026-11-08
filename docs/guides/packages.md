# Writing a package

For a developer, in this repository (the development side of the airgap).

## Where a package comes from

- **Its definition**, in `packages.json` at the repository's root:

  ```json
  "haicc": {
    "repo": "base-package-haicc",
    "description": "...",
    "modules": ["pear-full-square/haicc-base-boot", "pear-full-square/pkgm-base-manager"],
    "readme": ["lines of its readme, when it has no README.md of its own"]
  }
  ```

  `modules`: ours it starts from (`<org>/<module>`, or `{ "path": ...,
  "from": ... }` for one kept elsewhere); `with`: other definitions' modules,
  written in with it (a convenience of the writer, not a requirement at run
  time).
- **Its hand-written parts**, in `haiccing/<repo>/`, copied as they are: a
  `README.md`, `swarms/<swarm>/` (agreed), `test/` (its sets and named
  tests), `platform/` (the platform's package only).
- **The rest is worked out**: the modules of ours its modules use, and the
  third-party code they use, all the way down, plus `brittle`; from this
  repository's `node_modules`, recorded in `modules/third-party.json`.
  `test/modules-load` is written by the writer.

## Writing it

```bash
npm install          # this repository's dependencies, Bare's runtime among them
tools/bare tools/package-writer/cli.js --out=<folder of package repositories> [--only=haicc] [--keep]
```

Every package is staged, then tested in place (its modules' tests, its
in-place named tests); only when all pass is any written, each into its
repository's folder in `--out` (`.git` kept). The result as JSON; exit 1 when
a test fails (`--keep` leaves the staged packages to look at).

## Trying it on the platform

```bash
sh pear-full-square/haicc-base-boot/release.sh <out>/base-package-haicc <scratch>/haicc-setup.sh \
   node_modules/bare-runtime-linux-x64/bin/bare
sh <scratch>/haicc-setup.sh <scratch>/work --sources=folder:<out>
<scratch>/work/boot --yes && <scratch>/work/haicc boot base-package-haicc/test
```

`--sources=folder:<out>`: the work folder takes packages from what you just
wrote, not from GitHub. Take Node.js off the PATH for the run, to be sure
nothing needs it.

## Changing a module

- Its tests move with it (`brittle`, Bare's modules): see `tests.md`.
- A new third-party dependency: add it to this repository's `package.json`,
  `npm install`, commit `package-lock.json` as npm writes it.
- Never edit a written package: change the source here, write it again.
