# mrepo/

The runtime's part of every mrepo's structure, by layers, a `layer.json`
at each leaf. Laid in first when an mrepo is deployed; deployed as the
target itself, it makes an mrepo with a runtime and no protocols (the
boot package's test deploys it so). No README inside a layer: it would be
committed into it.

| layer | mode | holds |
|---|---|---|
| `main` | atomic | the mrepo's data |
| `runtime` | atomic | the runtime's data |
| `packages` | replicated | its `layer.json` lists `haiccing/base-package-runtime` |
| `inbox` | non-atomic | requests posted to it (its folder, `inbox/`) |
| `outbox` | non-atomic | completed forms sent back (its folder, `outbox/`) |
| `request/pending/default` | non-atomic | requests waiting |
| `request/execute` | non-atomic | the request executing |
| `request/done` | non-atomic | requests done |

The layers in general: `haiccing/package-docs-mrepo`, `mrepo/`.
