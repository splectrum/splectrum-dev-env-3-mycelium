# mrepo/

The component's part of the structure: the list of the packages the haicc mrepo is made of, and its runtime config.

- **Its packages** (`packages/layer.json`): the runtime, the help
  protocol, the boot protocol, the service protocol, the haicc protocol,
  the documentation packages, and this component last. Each brings its
  own part of the structure, laid one over the other.
- **Its runtime config** (`runtime/service.json`): the service state,
  `booted`: the haicc mrepo is service managed.
- **Nothing else**: no protocol, no data. `main` stays empty.

## Runtime config

Runtime config is laid in from the last package of a list only, the one
that defines the mrepo. So the component states its own in full, and what
the service package carries for itself is not laid in here.
