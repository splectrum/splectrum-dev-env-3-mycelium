# base-package-help

The help protocol: an mrepo's help, extracted from the READMEs of the packages it links and read by URI.

An mrepo that links it has a `help` layer. `help/extract` fills it from the
READMEs the linked packages carry, each at the URI it documents, with an
index; `help/get <URI>` reads one, with the one-liner of each link below
it, so the help can be walked down from the root.

| | |
|---|---|
| [mrepo/](mrepo/) | its part of the structure: the help layer |
| [test/](test/) | its tests: its protocol as mounted, and the generic ones |
| [test-reports/](test-reports/) | the report of its last pre-release |
| [modules/](modules/) | its code, assembled: ours and the third-party code |

## Commands

```
haicc / help/extract
haicc / help/get /
haicc / help/get /packages oneliner
haicc /host help/get /protocols detail
```

- `help/get <URI> [<level> | <section>]`: the levels are `oneliner`,
  `summary`, the default, and `detail`; or one section, by its title.
- `help/extract`: the help layer written again from the linked packages.
  Run by a hook: at `boot` in an mrepo without a service, at the
  service's `initialise` in one that has it.

## Package

- `protocol.js`: the `help` protocol, its config and its actions, from
  `mrepo-base-help`.
- `main.js`: the dispatcher, the bundle's main, generated.

Written from [splectrum/splectrum-dev-env-3-mycelium](https://github.com/splectrum/splectrum-dev-env-3-mycelium).
