# mrepo/

The boot mrepo's first-boot structure, built once into `<work>/mrepos/boot/`.

Run from its bundle, the boot reads it out of the bundle. What is its own:

- **No `service`**: no `runtime/service.json`, not service managed, no
  gate; its runtime runs until stopped.
- **Its identity** (`runtime/mrepo.json`): its unique URI, `local/boot`.
- **Its packages** (`packages/layer.json`): `haiccing/base-package-runtime`,
  `haiccing/base-package-boot`, `haiccing/base-package-haicc` and the
  documentation packages.
- **Nothing preloaded**: the boot mrepo deploys nothing by itself. It
  takes commands, the first of them `boot/deploy host <package>`.
