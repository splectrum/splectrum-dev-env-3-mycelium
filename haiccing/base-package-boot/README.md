# base-package-boot

HAICC's boot: the boot mrepo, the root, and the code to start it
(`docs/design/packages.md`, "The boot mrepo: the root"). Its release will be
its bundle, `base-package-boot.bundle`, run with Bare.

```sh
bare run.js --work=<folder>
```

The first time, the boot mrepo is built from its structure (`mrepo/`) into
`<work>/mrepos/boot/` (a standalone repository: p2p-git, every layer on the
filesystem, no Corestore; `<work>/mrepo.json` says so); then its runtime
runs, in this process. Its preloaded request (`service start /`) starts
it. A request posted to `<work>/mrepos/boot/inbox/` is answered in its
`outbox` layer. Stopped over its local connection (`<work>/runtime.sock`),
or by SIGTERM / SIGINT; run again, it opens what it left.

## The package

- `mrepo/`: the boot mrepo's structure, by layers, as the repository holds
  them, a `layer.json` at each leaf (its mode, what it is for): `main`,
  `runtime` (type `boot`, already initialised, its API), `inbox`, `outbox`,
  `request/pending/default` (the preloaded request), `request/execute`,
  `request/done`.
- `run.js`: the entry.
- `modules/`: the code, copied whole: ours (`modules/pear-full-square/`,
  from `mrepo-base-runtime`, all the way down) and the third-party code
  (`modules/node_modules/`, recorded in `modules/third-party.json`).
- `test/`: the tests, a folder each, each a structure unit as the package
  is (here only an entry, `run.js`): `test/boot/` runs the boot as above,
  built, answering, stopped, run again. The sets, a JSON file each (`{
  description, tests }`): `validate.json` (the package as deployed: it
  works where it is placed) and `full.json` (every test). `bare
  test/run.js [<set>]` runs a set, `validate` by default, each test as its
  own process.

Written from the development repository
([splectrum/splectrum-dev-env-3-mycelium](https://github.com/splectrum/splectrum-dev-env-3-mycelium)):
not edited here. Its modules assembled by `tools/package-assemble.js`.
