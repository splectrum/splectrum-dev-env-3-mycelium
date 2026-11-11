# mrepo/

The runtime's part of every mrepo's structure, laid in first when an mrepo
is deployed. What is its own:

- **Its packages** (`packages/layer.json`): `haiccing/base-package-runtime`
  only. Deployed as the target, it makes an mrepo with a runtime and no
  protocols.
