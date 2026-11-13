# base-package-boot

HAICC's boot: the boot mrepo, the root, and the boot protocol that deploys the mrepos inside it.

Run with Bare from its bundle, it builds the boot mrepo, places its
packages and starts its runtime. It deploys nothing by itself: the boot
mrepo then takes commands, and the boot protocol deploys, tears down and
redeploys the mrepos linked in it. Bare and the sources are there before
it runs: `haicc boot/deploy`, of `haiccing/base-linux-haicc`, sees to that.

```sh
bare base-package-boot.bundle --work=<folder> --sources=folder:<sources>
```

| | |
|---|---|
| [mrepo/](mrepo/) | the boot mrepo's first-boot structure |
| [test/](test/) | its tests |
| [modules/](modules/) | its code, assembled: ours and the third-party code |

## Steps

The invocation is a request from the start, `boot deploy /boot`, with the
command as typed and a GUID. Each step's outcome is logged in it.

1. **The boot mrepo built** the first time into `<work>/mrepos/boot/`, from
   `mrepo/`, read out of the bundle it runs from.
2. **Its packages put in place**: those its `packages` layer lists, into
   the work folder's store `<work>/packages/`, checked against their
   manifest, each hard linked individually into
   `<work>/mrepos/boot/packages/`; the list, hashes, sources and store
   committed.
3. **Its request**, completed, into its `request/execute`, and printed.
4. **Its runtime started**, from its own `packages/`, by its directory, on
   the Bare that ran the boot, as its own process; its status printed
   last. It runs until stopped.
5. **Followed** with `--until-done[=<seconds>]` until every request is
   done, or on a terminal, or with `--follow`: every record as it moves
   through the request layers, one compact line a record, until Ctrl-C.
   The runtime keeps running.

## Options

- `--work=<folder>`: the work folder; the current one by default.
- `--sources=folder:<path>` or `--sources=github:<org>`, repeated: where
  packages come from, in order; `github:haiccing` when none is given.
- `--level=<level>`: its log's threshold, `info` by default.

## The boot mrepo

- Its unique URI is `local/boot`. It is the root: commands are addressed
  to it, and it passes on those for the mrepos linked in it.
- No `service`: it is not service managed, so it has no gate.
- Its protocols: `boot`, `haicc`, and the runtime package's `runtime` and
  `help`.

## The package

- `run.js`: the entry. `protocol.js`: the boot protocol's config and
  actions, from `mrepo-base-boot`.
- `main.js`: the dispatcher, the bundle's main, generated.

Written from the development repository
([splectrum/splectrum-dev-env-3-mycelium](https://github.com/splectrum/splectrum-dev-env-3-mycelium)):
not edited here. Its modules assembled by `tools/package-assemble.js`.
