# /packages

The code the mrepo runs, as bundles, linked from the work folder's store.

The layer is replicated: committed, and copied out as files for Bare to
run, at `<dir>/packages/`. Its `layer.json` lists the packages, in order;
its manifest records each one's hash and entry points.

```
/packages/<org>/<package>.bundle
/packages/addons/<sha256>          native addons, by hash, shared
/packages/manifest.json            the list, the hashes, the sources, the store
```

## Design

- **Sources**, in order, the first that has a package wins: `folder
  <path>`, local and offline. Other sources, such as GitHub, are not built
  yet.
- **Checked**: each bundle against its hash in its source's manifest.
- **Linked**: a bundle is one file in the work folder's store,
  `<work>/packages/<org>/<package>.bundle`, hard linked into each mrepo's
  `packages/`. The layer commits the list and the hashes, not the bytes.
  Never edited in place.
- **Each linked individually**, the bundle and each addon: the mrepo runs
  only the packages registered for it, at the versions it pins.
- **What a child is made of**: the target package's
  `mrepo/packages/layer.json`, in order. Each package's `mrepo/` part is
  laid in, a later file replacing an earlier one.
- **Documentation packages**, marked `docs` in their `package.json`, bring no structure,
  only READMEs, which the runtime extracts into the help layer.
- **Put in place by `boot deploy`**, the parent's, and for the initial
  boot mrepo by its release before it runs. Changing them is a `redeploy`.
- **The runtime is started from here**, by the mrepo's directory:
  `bare <dir>/packages/haiccing/base-package-runtime.bundle <dir>`.
- **Its tests run from here**: `runtime run
  /packages/<org>/<package>/test/<set>`, through the package's dispatcher,
  in a floating instance; the result is the request's output.
- **What each package contributes**: `base-package-runtime` the engine,
  in every mrepo; `base-package-boot` the `boot` protocol, in an mrepo that
  deploys others; `package-docs-mrepo` and `package-docs-template` the
  help; an application's package its `main` and its protocol.
