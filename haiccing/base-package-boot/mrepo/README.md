# mrepo/

The boot mrepo's first-boot structure, by layers, a `layer.json` at each
leaf (its mode, what it is for). Built once, the first time the boot runs,
into `<work>/mrepos/boot/` (on the filesystem storage); in the release,
embedded. No README inside a layer: it would be committed into it.

| layer | mode | holds |
|---|---|---|
| `main` | atomic | the boot mrepo's data: its children, each in `main/<name>/`, its record at `main/<name>.json` |
| `runtime` | atomic | the runtime's data; no `service.json`: the boot mrepo is not service managed, no gate |
| `packages` | replicated | its `layer.json` lists the packages: `haiccing/base-package-runtime`, `haiccing/base-package-boot` |
| `inbox` | non-atomic | requests posted to it (its folder, `inbox/`: the filesystem's way in) |
| `outbox` | non-atomic | completed forms sent back (its folder, `outbox/`) |
| `request/pending/default` | non-atomic | the preloaded request: `boot deploy /host`, body `{ "package": "haiccing/base-package-runtime" }` |
| `request/execute` | non-atomic | the request executing: first, the boot's own, handed over |
| `request/done` | non-atomic | requests done |

The layers in general: `haiccing/package-docs-mrepo`, `mrepo/`.
