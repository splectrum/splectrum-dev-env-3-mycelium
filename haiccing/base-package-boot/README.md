# base-package-boot

HAICC's boot: the boot mrepo, the root, and the code to start it
(`docs/design/packages.md`, "The boot mrepo: the root"). Its release will be
its bundle, `base-package-boot.bundle`, run with Bare.

The release, for a platform (`tools/boot-release.js` in the development
repository): a standalone executable, Bare built in, and the sources beside
it (`sources/haiccing/`: the runtime's bundle; `sources/addons/`;
`sources/holepunchto/`: the Bare it puts in place, the one built in).

```sh
./base-package-boot --work=<folder> --sources=folder:<release>/sources --yes
```

From the package's folder, the same: `bare run.js --work=<folder> ...`.
The invocation is a request from the start, `boot deploy /boot` (the
command as typed, a GUID), each step's outcome logged in it:

1. **Prerequisites** (`prerequisites.json`), before anything is written:
   the platform (`linux-x64`), the work folder (writable, not the
   filesystem's root, no other mrepo there), the sources, Bare (`bare.json`:
   put in place at `<work>/bare/` if missing, only with a yes). One missing:
   it says which and stops (exit 3), the request printed only.
2. **The boot mrepo built** the first time into `<work>/mrepos/boot/` (from
   `mrepo/`; in the release, embedded).
3. **Its packages put in place**: those its `packages` layer lists (the
   runtime and the boot protocol), into the work folder's store
   `<work>/packages/`, checked against their manifest, each hard linked
   individually into `<work>/mrepos/boot/packages/`; the list, hashes,
   sources and store committed.
4. **Its request**, completed, into its `request/execute`, and printed, with
   `next`: the command that starts its runtime. The runtime is not started
   by the boot (for now): `<work>/bare/bin/bare
   <work>/mrepos/boot/packages/haiccing/base-package-runtime.bundle
   <work>/mrepos/boot`. Started, it moves the request to `request/done`
   first, then executes its preloaded `boot deploy /host` (the runtime the
   target, for now): the host built inside it, `main/host/`, its runtime
   started. The boot mrepo has no `service`: its packages are the runtime
   and the boot protocol.

## The package

- `mrepo/`: the boot mrepo's first-boot structure, by layers, a
  `layer.json` at each leaf (its mode, what it is for): `main`, `runtime`,
  `inbox`, `outbox`, `packages` (the runtime and the boot protocol),
  `request/pending/default` (the preloaded `boot deploy /host`),
  `request/execute`, `request/done`. No `service`.
- `run.js`: the entry; `prerequisites.json`: what it checks first;
  `bare.json`: the Bare it puts in place, pinned (in the release: the one
  built in); `protocol.js`: the boot protocol's configs and actions.
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
