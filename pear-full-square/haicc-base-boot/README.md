# haicc-base-boot

HAICC's cold boot, the boot package's entry: from a setup (a source folder:
the packages' bundles, their native addons by hash, the publisher's signed
manifest; with Bare and `boot.json`) into a host. Built step by step
(phase 3, step 2; `docs/design/structure.md` of the development repository).

- `boot --work=<folder>`: the machine checked; the manifest loaded from the
  sources (the setup's own folder first, then `boot.json`'s), its signature
  and sequence checked, pinned; HAICC's package (`base-package-haicc`)
  loaded into the scope and run once.
- `fetch <package> --work=<folder>`: another package, lazily, as the pinned
  manifest lists it.
- `index.js`: the same, as a library; `boot.js`: the command line.
