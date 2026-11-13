# mrepo/

The boot component's part of the structure: the list of the packages the boot mrepo is made of, and its runtime config.

- **Its packages** (`packages/layer.json`): the runtime, the help
  protocol, the protocol protocol, the boot protocol, the haicc protocol,
  the documentation packages, and this component last.
- **Its runtime config**: its hooks, below. No service state: the boot
  mrepo is not service managed.
- **Nothing preloaded, no data**: the boot mrepo deploys nothing by
  itself, and its `main` stays empty.

## Runtime config

With no service, everything hangs on `boot`, which its runtime fires
each time it starts:

- `boot`, `haicc`, `help` and `runtime` activated: the boot mrepo takes
  commands for them.
- Its help extracted.
