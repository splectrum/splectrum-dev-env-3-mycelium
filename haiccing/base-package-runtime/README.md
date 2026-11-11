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

- [mrepo/](mrepo/): the runtime's part of every mrepo's structure.
- `main.js`: the dispatcher, the bundle's main (generated): every entry and
  test by path, `run(target, { dryRun })`.
- `run.js`: the entry, the runtime's process.
- [modules/](modules/): the code, assembled: ours and the third-party code.
- [test/](test/): its tests.

Written from [splectrum/splectrum-dev-env-3-mycelium](https://github.com/splectrum/splectrum-dev-env-3-mycelium).
