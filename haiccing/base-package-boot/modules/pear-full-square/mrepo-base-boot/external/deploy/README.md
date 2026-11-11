# deploy

Builds a child mrepo inside its parent from a target package, links its packages and starts its runtime.

The target package's `mrepo/packages/layer.json` lists the packages the
child is made of, in order. Each is fetched into the work folder's store,
which the parent's packages manifest names. Their `mrepo/` parts are laid
in, in that order, and the child is built at `<parent>/main/<name>/`.

## Signature

`deploy(exec, { uri, body })`: `uri` is `/<name>`, one segment.

## Body

- `package`: the target package, `<org>/<package>`. Required.

## Returns

`{ deployed, name, package, packages, dir, layers, runtime: { pid } }`.
The same record, without `deployed`, is written at `/main/<name>.json`.

## Errors

- The child is deployed already, or its folder is in the way.
- No package in the body; the parent's packages manifest names no store.
- The target lists no packages; its runtime does not start.

## Design

- A documentation package, marked `docs` in its manifest entry, brings no
  structure.
  READMEs are never laid in.
- The packages are linked individually into the child's `packages/`.
- The runtime is started from the child's own packages, by its directory.
