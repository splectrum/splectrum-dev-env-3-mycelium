# mrepo/

The boot component's part of the structure: the list of the packages the boot mrepo is made of.

- **Its packages** (`packages/layer.json`): the runtime, the help
  protocol, the boot protocol, the haicc protocol, the documentation
  packages, and this component last. Each brings its own part of the
  structure, laid one over the other.
- **Nothing preloaded, no data**: the boot mrepo deploys nothing by
  itself, and its `main` stays empty.
