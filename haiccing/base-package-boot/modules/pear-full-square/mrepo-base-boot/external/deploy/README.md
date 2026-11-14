# deploy

Builds a child mrepo inside its parent from a target package, links its packages and starts its runtime.

The target package's `mrepo/packages/layer.json` lists the packages the
child is made of, in order. Each is fetched into the work folder's store,
which the parent's packages manifest names. Their `mrepo/` parts are laid
in, in that order, and the child is built at `<parent>/main/<name>/`.

## Signature

`deploy(exec, { uri, args })`: requested as `boot/deploy <name>
<package>`. `uri` is the child's position from the mrepo's root,
`main/<name>`, one segment below `main`.

## Arguments

1. The target package, `<org>/<package>`. Required. The package alone
   means `haiccing/<package>`.

## Returns

`{ deployed, mrepo, package, packages, layers, runtime: { pid } }`;
`deployed` is the position as written at `main`, `<name>`. The
same record, without `deployed`, is the child's shortcut, written at
`/xpath/<name>/shortcut.json`. `mrepo` is the child's unique URI.

## Errors

- No target, `main` itself or the root: `missing argument: target`. One
  cannot deploy the mrepo itself.
- A URI that is not in `main`: `not a position in main`.
- No package: `missing argument: package`.
- The child is deployed already, or its folder is in the way.
- The position exists locally, as data in `main`: the boot protocol
  cannot target it.
- The parent's packages manifest names no store.
- The target lists no packages; its runtime does not start.

## Design

- A documentation package, marked `docs` in its manifest entry, brings no
  structure.
  READMEs are never laid in.
- The packages are linked individually into the child's `packages/`.
- The child has no presence in the parent's `main`: its shortcut is all
  the parent holds of it.
- The child's unique URI is in its parent's swarm, `<swarm>/<name>`: what
  the boot mrepo deploys is `local/<name>`. It is written into the child's
  own runtime layer, `/runtime/mrepo.json`, where it has one.
- The runtime is started from the child's own packages, by its directory.
