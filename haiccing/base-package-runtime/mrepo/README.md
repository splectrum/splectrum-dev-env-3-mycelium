# mrepo/

The runtime's part of every mrepo's structure, laid in first when an mrepo
is deployed. What is its own:

- **The `xpath` layer** (`xpath/layer.json`): the mrepo's navigation
  directives, its shortcuts. XPath is the runtime's own, internal
  functionality, so the layer comes with it.
- **Its packages** (`packages/layer.json`): the help protocol, the
  documentation packages, and itself last. Deployed as the target, it
  makes an mrepo with a runtime and its help, and no other protocol.
