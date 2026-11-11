# base-package-runtime

The mrepo runtime: the engine every mrepo runs on. Its process holds the
mrepo's store, runs its protocols (request and execute built in, the
others from the packages linked in), and serves its local connection.

```sh
bare <repo>/packages/haiccing/base-package-runtime.bundle <repo>
```

The mrepo is the one the work folder's setting names (`<work>/mrepo.json`).
Started from an mrepo's own `packages/`: by the boot's release for the boot
mrepo, by a parent's `boot deploy` for a child. Stopped over its local
connection (`<work>/runtime.sock`), by SIGTERM or SIGINT, or by itself once
shut down.

## The package

- `mrepo/`: the runtime's part of every mrepo's structure: `main`,
  `runtime`, the boxes, the request layers, `packages` (its
  `layer.json` lists `haiccing/base-package-runtime`: deployed as the target,
  an mrepo with a runtime and no protocols).
- `main.js`: the bundle's dispatcher (written by `tools/package-bundle.js`).

- `run.js`: the entry, the runtime's process.
- `modules/`: the code (`mrepo-base-runtime` and what it uses), assembled.
- `test/`: `bare test/run.js [<set>]`; `test/start/` runs the runtime over
  an mrepo written for it (set `RUNTIME` to a bundle to test that instead).

Written from [splectrum/splectrum-dev-env-3-mycelium](https://github.com/splectrum/splectrum-dev-env-3-mycelium).
