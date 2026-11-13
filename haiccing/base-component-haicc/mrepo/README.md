# mrepo/

The component's part of the structure: the list of the packages the haicc mrepo is made of, and its runtime config.

- **Its packages** (`packages/layer.json`): the runtime, the help
  protocol, the protocol protocol, the boot protocol, the service
  protocol, the haicc protocol, the documentation packages, and this
  component last.
- **Its runtime config**: the service state and the hooks, below.
- **Nothing else**: no protocol, no data. `main` stays empty.

## Runtime config

- **`runtime/service.json`**: the service state, `booted`: the haicc
  mrepo is service managed.
- **At `boot`**: `haicc`, `help`, `runtime` and `service` activated. A
  closed haicc mrepo can be addressed, inspected and tested.
- **At `initialise`**: its help extracted.
- **At `start`**: `boot` activated. The boot protocol is what sits behind
  its door.
- **At `stop`**: `boot` deactivated again.

Runtime config is laid in from the last package of a list only, the one
that defines the mrepo. So the component states its own in full.
