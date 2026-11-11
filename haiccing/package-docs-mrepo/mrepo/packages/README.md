# /packages

The code the mrepo runs, as bundles. Replicated: committed, and copied
out as files for Bare to run (`<work>/mrepos/<name>/packages/`).

```
/packages/<org>/<package>.bundle
/packages/addons/<sha256>          native addons, by hash, shared
```

Its `layer.json` lists the packages and where they come from:

```json
{
  "mode": "replicated",
  "description": "The packages the mrepo runs on.",
  "sources": ["github haiccing"],
  "packages": ["haiccing/base-package-mrepo"]
}
```

- **Sources**, in order, the first that has a package wins: `github
  <org>` (the default), `folder <path>` (local, offline).
- **Checked**: each bundle against its hash in the signed manifest,
  wherever it came from.
- **Linked**: a bundle is one file in the work folder's store,
  `<work>/packages/<org>/<package>.bundle`, hard linked into each mrepo's
  `packages/`; the layer commits the list and the hashes, not the bytes.
  Never edited in place.
- **Each linked individually**, the bundle and each addon: the mrepo runs
  only the packages registered for it, at the versions it pins.
- **Put in place by `boot deploy`** (the parent's; for the initial boot
  mrepo, by its release, before it runs). Changing them: a `redeploy`.
- **The runtime is started from here**, by the mrepo's directory:
  `bare <repo>/packages/haiccing/base-package-runtime.bundle <repo>`.
- The packages an mrepo links, each for what it contributes:
  `base-package-runtime` (the engine, the entry point: every mrepo),
  `base-package-mrepo` (the `service` protocol: every mrepo),
  `base-package-boot` (the `boot` protocol: an mrepo that deploys others),
  an application's (`main`, its protocol). A package requires others
  instead of copying them; deploying (`boot deploy`) links them all.
