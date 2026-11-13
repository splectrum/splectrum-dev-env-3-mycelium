# lay

Lays a target package's list into a folder: the structure an mrepo is built from.

The target package's `mrepo/packages/layer.json` lists the packages the
mrepo is made of, in order. Each is fetched into the store, and its
`mrepo/` part is written into the folder, a later file replacing an
earlier one. Deploy uses it for a child; the boot component uses it for
the boot mrepo: one rule for every mrepo, the first included.

## Signature

`lay({ store, sources, target, into })`

- `store`, `sources`: where packages are kept and where they come from.
- `target`: the package deployed, `<org>/<package>`.
- `into`: the folder written.

## Returns

`{ list }`: the packages laid in, in order.

## Errors

- The target, or a package it lists, is in neither the store nor the
  sources, or is not as its manifest says.
- The target lists no packages.

## Design

- **Runtime config comes from the last package only.** What a package
  drops into the runtime layer, its hooks and its service state, is laid
  in only for the last package in the list: the one that defines the
  mrepo. A protocol package's own runtime config counts only when it is
  itself the one deployed. The runtime layer's own definition,
  `runtime/layer.json`, is structure and comes from whichever package
  brings it.
- **A list ends with its own package**, so that the two say the same.
- **A documentation package**, marked `docs` in its manifest entry,
  brings no structure. READMEs are never laid in.

## Also exported

- `isRuntimeConfig(path)`: whether a file of a package's structure is
  runtime config.
