# base-package-runtime

The mrepo runtime: the engine every mrepo runs on. Its process holds the
mrepo's store, runs its protocols (request and execute built in, the
others from the packages linked in), and serves its local connection.

```sh
bare <dir>/packages/haiccing/base-package-runtime.bundle <dir>
```

The mrepo at `<dir>` (on the filesystem storage), started from its own
`packages/` (its pinned runtime): by the boot for the boot mrepo, by a
parent's `boot deploy` for a child. It loads the protocols its linked
packages offer. Stopped over its local connection (`<dir>/runtime.sock`;
a short path in the temporary folder when that is too long), by SIGTERM or
SIGINT; with `service`, by itself once shut down. (`--work=<folder>`: the
mrepo a work folder's setting names, as the p2p host.)

## The package

- `mrepo/`: the runtime's part of every mrepo's structure: `main`,
  `runtime`, the boxes, the request layers, `packages` (its
  `layer.json` lists `haiccing/base-package-runtime`: deployed as the target,
  an mrepo with a runtime and no protocols).
- `main.js`: the dispatcher, the bundle's main (generated): every entry and
  test by path, `run(target, { dryRun })`.

- `run.js`: the entry, the runtime's process.
- `modules/`: the code (`mrepo-base-runtime` and what it uses), assembled.
- `test/`: `bare test/run.js [<set>]`, or `bare <bundle> /test/<set>`, or
  `runtime run /packages/haiccing/base-package-runtime/test/<set>` in a running
  mrepo; `validate` the package as deployed (`test/start/`), `full` also the
  generic modules test (each carried module's own tests, on the package's
  copies). From the bundle in a floating instance; the result returned.
  `SOURCES`: a sources folder, for the tests that need one. See
  `haiccing/package-docs-template`, `test/README.md`.

## The folders

| | |
|---|---|
| [mrepo/](mrepo/) | its part of the structure, by layers |
| [test/](test/) | its tests and sets |
| [modules/](modules/) | its code, assembled: ours and the third-party code |

Written from [splectrum/splectrum-dev-env-3-mycelium](https://github.com/splectrum/splectrum-dev-env-3-mycelium).
