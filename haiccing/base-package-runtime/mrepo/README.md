# mrepo/

The runtime's part of every mrepo's structure, laid in when an mrepo is deployed: its layers.

- **The layers** every mrepo has: `main`, `runtime`, `packages`,
  `protocols`, the boxes and the request layers.
- **The `protocols` layer**: the active protocols, one file each.

## Deployed alone

Deployed as the target, the runtime package makes an mrepo with a runtime
and its help, and no other protocol:

- **Its packages** (`packages/layer.json`): the help protocol, the
  protocol protocol, the documentation packages, and itself last.
- **Its hooks** (`runtime/hooks/boot/`): `help` and `runtime` activated,
  its help extracted. Runtime config: laid in only when this package is
  the one deployed.
