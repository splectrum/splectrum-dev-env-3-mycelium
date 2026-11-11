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
- **Linked**: a bundle is one file in a store, hard linked into each
  mrepo's `packages/`. Never edited in place.
- Every mrepo has `haiccing/base-package-mrepo`: the runtime, the
  common protocols. An mrepo that deploys others also has
  `haiccing/base-package-boot`: the `boot` protocol, the install routine.
