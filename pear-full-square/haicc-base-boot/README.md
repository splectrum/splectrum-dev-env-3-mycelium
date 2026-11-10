# haicc-base-boot

HAICC's boot (the service protocol's `boot`), the boot package's entry: from
a setup (a source folder: the packages' bundles, their native addons by
hash, the publisher's signed manifest; with Bare and `boot.json`) into the
host's repository, running. Built step by step (phase 3, step 2;
`docs/design/structure.md` of the development repository, "Boot").

```sh
bare base-package-boot.bundle boot --work=<folder> [--setup=<folder>]
bare base-package-boot.bundle fetch <package> --work=<folder> [--setup=<folder>]
```

- `boot`: the machine checked (Linux x86-64); the manifest loaded from the
  sources (the setup's own folder first, then `boot.json`'s), its
  signature and sequence checked; the boot's, HAICC's and mrepo's packages
  loaded, each checked by hash; the repository `host` created
  (`p2p-mrepo`, its disk side at `<work>/mrepos/host/.git`) with its layers
  `main`, `packages`, `runtime`, `request/pending/default`,
  `request/execute`, `request/done`; the packages and the pinned manifest
  committed into `packages`; `/runtime/service.json` booted, of type
  `haicc`; preloaded with the request `service initialise /`; HAICC's and
  mrepo's bundles and their addons copied out to
  `<work>/mrepos/host/packages/`; then the runtime started
  (`mrepo-base-runtime`), which runs the preloaded request. Each step said
  as a JSON line, the result last. A folder already booted is not booted
  again (a restore comes later).
- `fetch`: another package, lazily, as the pinned manifest lists it, into
  `packages` and its files.
- `index.js`: the same, as a library; `boot.js`: the command line.
- `npm test`: its tests, on Bare.
