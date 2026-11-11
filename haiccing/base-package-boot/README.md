# base-package-boot

HAICC's boot: the boot mrepo, the root, and the code to start it.

From nothing, it checks its prerequisites, builds the boot mrepo, places
its packages and starts its runtime, which deploys the host inside it. Its
release is a standalone executable per platform, with Bare built in.

```sh
./base-package-boot --work=<folder> --sources=folder:<release>/sources --yes
```

## Release

The release, for a platform (`tools/boot-release.js` in the development
repository): a standalone executable, Bare built in, and the sources beside
it (`sources/haiccing/`: the runtime's bundle; `sources/addons/`;
`sources/holepunchto/`: the Bare it puts in place, the one built in).

From the package's folder, the same: `bare run.js --work=<folder> ...`.
The invocation is a request from the start, `boot deploy /boot` (the
command as typed, a GUID), each step's outcome logged in it.

## Steps


1. **Prerequisites** (`prerequisites.json`), before anything is written:
   the platform (`linux-x64`), the work folder (writable, not the
   filesystem's root, no other mrepo there), the sources, Bare (one
   installed on the PATH at `bare.json`'s major, the same version or newer;
   else the pinned one, `bare.json`, put in place at `<work>/bare/`, only
   with a yes; the one used recorded in `<work>/bare.json`). One missing:
   it says which and stops (exit 3), the request printed only.
2. **The boot mrepo built** the first time into `<work>/mrepos/boot/` (from
   `mrepo/`; in the release, embedded).
3. **Its packages put in place**: those its `packages` layer lists (the
   runtime and the boot protocol), into the work folder's store
   `<work>/packages/`, checked against their manifest, each hard linked
   individually into `<work>/mrepos/boot/packages/`; the list, hashes,
   sources and store committed.
4. **Its request**, completed (each step an entry in its `log`, at or
   above `--level`, `info` by default), into its `request/execute`, and
   printed.
5. **Its runtime started**, from its own `packages/`, by its directory, on
   the Bare recorded (an installed one, or the one put in place: `<the Bare>
   <work>/mrepos/boot/packages/haiccing/base-package-runtime.bundle
   <work>/mrepos/boot`), as its own process; its status printed last. It
   moves the request to `request/done` first, then executes its preloaded
   `boot deploy /host` (the runtime the target, for now): the host built
   inside it, `main/host/`, its runtime started. The boot mrepo has no
   `service`: its packages are the runtime and the boot protocol; its
   runtime runs until stopped (SIGTERM, or `stop` on its socket).
6. **Followed** with `--until-done[=<seconds>]` until every request is
   done (none pending or executing in the boot mrepo or the host; then
   exit 0, not in time exit 4), or on a terminal, or with `--follow`
   (`--no-follow`: not):
   every record as it moves through the request layers, the boot mrepo's
   and the host's, one compact line a record, until Ctrl-C (the runtimes
   keep running).

## The package

- [mrepo/](mrepo/): the boot mrepo's first-boot structure.
- `run.js`: the entry; `prerequisites.json`: what it checks first;
  `bare.json`: the Bare it puts in place, pinned (in the release: the one
  built in); `protocol.js`: the boot protocol's configs and actions.
- [modules/](modules/): the code, assembled: ours and the third-party code.
- [test/](test/): its tests.

Written from the development repository
([splectrum/splectrum-dev-env-3-mycelium](https://github.com/splectrum/splectrum-dev-env-3-mycelium)):
not edited here. Its modules assembled by `tools/package-assemble.js`.
