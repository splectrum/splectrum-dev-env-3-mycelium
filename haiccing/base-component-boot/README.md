# base-component-boot

The boot component: the initial boot mrepo, the root of a host, and the program that puts it in place.

Run with Bare from its bundle, it builds the boot mrepo, places its
packages and starts its runtime. It deploys nothing by itself: the boot
mrepo then takes commands, and deploys the mrepos linked in it. Bare and
the sources are there before it runs: `haicc boot/deploy`, of
`haiccing/base-app-haicc`, runs it from the sources.

```sh
bare base-component-boot.bundle --work=<folder> --sources=folder:<sources>
```

| | |
|---|---|
| [mrepo/](mrepo/) | its part of the structure: the list of its packages |
| [test/](test/) | its tests: the boot end to end, and the generic ones |
| [test-reports/](test-reports/) | the report of its last pre-release |
| [modules/](modules/) | its code, assembled: ours and the third-party code |

## Packages

| package | brings |
|---|---|
| `base-package-runtime` | the runtime, its layers, the `runtime` protocol |
| `base-package-help` | the `help` protocol and the help layer |
| `base-package-protocol` | the `protocol` protocol: activate, deactivate |
| `base-package-boot` | the `boot` protocol: deploy, teardown, redeploy |
| `base-package-haicc` | the `haicc` protocol: goto |
| `package-docs-mrepo`, `package-docs-template` | the documentation |

## Steps

The invocation is a request from the start, `boot deploy /boot`, with the
command as typed and a GUID. Each step's outcome is logged in it.

1. **The boot mrepo built** the first time into `<work>/mrepos/boot/`, as
   any mrepo is: this component's list fetched into the work folder's
   store, `<work>/packages/`, and laid in, each package's part of the
   structure in order; its identity written, `local/boot`.
2. **Its packages put in place**: checked against their manifest, each
   hard linked individually into `<work>/mrepos/boot/packages/`; the list,
   hashes, sources and store committed.
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
- No `service`: it is not service managed. Its `boot` hooks, fired by its
  runtime each time it starts, activate its protocols and extract its
  help.

## Package

- `run.js`: the entry, the program above.
- `main.js`: the dispatcher, the bundle's main, generated.
- No protocol of its own.

Written from [splectrum/splectrum-dev-env-3-mycelium](https://github.com/splectrum/splectrum-dev-env-3-mycelium).
