# mrepo/

The boot mrepo's first-boot structure, built once into `<work>/mrepos/boot/`.

In the release it is embedded. What is its own:

- **No `service`**: no `runtime/service.json`, not service managed, no
  gate; its runtime runs until stopped.
- **Its identity** (`runtime/mrepo.json`): its unique URI, `local/boot`.
- **Its packages** (`packages/layer.json`): `haiccing/base-package-runtime`,
  `haiccing/base-package-boot`, `haiccing/base-package-haicc` and the
  documentation packages.
- **One request preloaded** (`request/pending/default/`): `boot deploy
  /host haiccing/base-package-runtime`.
