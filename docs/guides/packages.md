# Writing a package

For a developer, in this repository (the development side of the airgap).

## Where a package comes from

- **Its definition**, in `packages.json` at the repository's root:

  ```json
  "haicc": {
    "description": "...",
    "modules": ["pear-full-square/haicc-base-cli"],
    "entries": { "haicc": "pear-full-square/haicc-base-cli/haicc.js" },
    "readme": ["lines of its readme, when it has no README.md of its own"]
  }
  ```

  `repo`: its repository's name, `base-package-<name>` when not given;
  `entries`: its entry points (the first its bundle's main), for a package
  written as a bundle.

  `modules`: ours it starts from (`<org>/<module>`, or `{ "path": ...,
  "from": ... }` for one kept elsewhere); `with`: other definitions' modules,
  written in with it (a convenience of the writer, not a requirement at run
  time).
- **Its hand-written parts**, in `haiccing/<repo>/`, copied as they are: a
  `README.md`, `swarms/<swarm>/` (agreed), `test/` (its sets and named
  tests), `platform/` (the platform's package only); a repository type's
  API declaration, `api.json` (`haiccing/base-package-haicc/api.json`: read
  from the bundle by `service initialise`).
- **The rest is worked out**: the modules of ours its modules use, and the
  third-party code they use, all the way down, plus `brittle`; from this
  repository's `node_modules`, recorded in `modules/third-party.json`.
  `test/modules-load` is written by the writer.

## Writing it

```bash
sh tools/install.sh  # this repository's dependencies, from the lockfile, Bare only
tools/bare tools/package-writer/cli.js --out=<folder> [--only=boot,haicc,mrepo] [--keep] \
   [--sequence=<n>] [--sign-key=<file>]
```

Every package is staged, then tested in place (its modules' tests, its
in-place named tests); only when all pass is any written. A package with
`entries` is written as a bundle (`bare-pack`: the closure of its entry
points, every other file of the package as files, native addons offloaded
by hash), together as one source, `<out>/source/` (the bundles by
`[org]/[package]`, `addons/<sha256>`, one manifest, signed with
`--sign-key`). The result as JSON; exit 1 when a test fails (`--keep` leaves
the staged packages to look at).

## Trying it on the platform

```bash
tools/bare tools/setup/keygen.js <scratch>/keys    # a key of your own, once
sh tools/publish.sh <scratch>/release --key-dir=<scratch>/keys
```

Without `--push` it only builds and checks: the packages written and
signed, the setup built, booted in a fresh folder with Node.js off the PATH
and taken through a cycle of requests (`release.md`). The checked folder
stays at `<scratch>/release/check` to look at.

## Changing a module

- Its tests move with it (`brittle`, Bare's modules): see `tests.md`.
- A new third-party dependency: add it to this repository's `package.json`,
  run `npm install` (the one use of npm: it resolves the versions and writes
  `package-lock.json`), commit `package-lock.json` as npm writes it.
- Never edit a written package: change the source here, write it again.
