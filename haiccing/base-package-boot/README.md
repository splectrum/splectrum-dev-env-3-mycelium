# base-package-boot

HAICC's boot: the boot mrepo, the root, and the code to start it
(`docs/design/packages.md`, "The boot mrepo: the root"). Its release will be
its bundle, `base-package-boot.bundle`, run with Bare.

```sh
bare run.js --work=<folder> [--sources=folder:<path>|github:<org>]... [--yes]
```

The invocation is a request from the start: a record, `boot deploy
/boot`, the command as typed, its key a GUID; each step's outcome is
logged in it. Completed, it is put into the boot mrepo's `request/execute`
once the mrepo is there, before its runtime starts: the runtime moves it to
`request/done` first, the history's first entry of each run. Without an
mrepo (a prerequisite missing) it is printed only.

First its prerequisites (`prerequisites.json`), before anything is
written: the platform (`linux-x64`), the work folder (writable, no other
mrepo there), the sources (reachable; `github:haiccing` when none is
given), Bare (`bare.json`: the pinned version at `<work>/bare/`, put in
place from the sources if missing, only with a yes: `--yes`, or asked on a
terminal). One missing: it says which and stops (exit 3).

The first time, the boot mrepo is then built from its structure (`mrepo/`)
into `<work>/mrepos/boot/` (a standalone repository: p2p-git, every layer
on the filesystem, no Corestore; `<work>/mrepo.json` says so); then its
runtime runs, in this process. Its preloaded request (`service start /`)
starts it. A request posted to `<work>/mrepos/boot/inbox/` is answered in
its `outbox` layer. Stopped over its local connection
(`<work>/runtime.sock`), or by SIGTERM / SIGINT; run again, it opens what
it left.

## The package

- `mrepo/`: the boot mrepo's structure, by layers, as the repository holds
  them, a `layer.json` at each leaf (its mode, what it is for): `main`,
  `runtime` (type `boot`, already initialised, its API), `inbox`, `outbox`,
  `request/pending/default` (the preloaded request), `request/execute`,
  `request/done`.
- `run.js`: the entry; `prerequisites.json`: what it checks first;
  `bare.json`: the Bare it puts in place, pinned.
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
