# mrepo/

The service protocol's part of an mrepo's structure: the service state, booted.

- **`runtime/service.json`**: `{ "state": "booted" }`, laid into the
  runtime layer, which the runtime package defines. An mrepo that has it is
  service managed: its external API is gated by the state.
- **Its packages** (`packages/layer.json`): the runtime, the help
  protocol, the documentation packages, and this package last. Deployed as
  the target, it makes an mrepo with a service and nothing else. Linked
  into another package's list, its service state is not laid in: runtime
  config comes from the last package of a list only.
