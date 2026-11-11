# /protocols

The mrepo's external API: one config a protocol. Atomic. What this layer
holds is what the mrepo offers; anything else is refused.

```
/protocols/boot.json        global, from base-package-boot where linked
/protocols/service.json     global
/protocols/<name>.json      global, from the application's package
/protocols/<section>/...    local: shadows /main/<section>
```

| protocol | actions | from |
|---|---|---|
| `service` | `initialise`, `start`, `stop`, `shutdown`, `pause`, `resume`, `run` | every mrepo: `base-package-mrepo` (the runtime runs protocols, has none) |
| `boot` | `deploy`, `teardown`, `redeploy` (teardown, then deploy): executed by the parent | `base-package-boot`, linked into an mrepo that deploys others |

An application adds its own (`haicc`, `dispatch`). A protocol comes with
the package that implements it: linking the package registers its
protocols here (their configs, from its `protocol.js`), as global ones;
the runtime loads the actions from the package's bundle (its dispatcher,
`main.js`: imported, nothing runs; its `protocol` entry).

- **Global**: at the layer's root, for the whole mrepo.
- **Local**: at the path of a `main` section; available there and below
  only. They add to those above; a same-named one deeper overrides,
  and can narrow, the one above.

A config says the protocol's actions, the URIs, the service states each is
allowed in, and the package that implements it.
