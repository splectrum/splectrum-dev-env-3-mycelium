# mrepo/

The boot mrepo's first-boot structure, built once into `<work>/mrepos/boot/`
(in the release, embedded). What is its own:

- **No `service`**: no `runtime/service.json`, not service managed, no
  gate; its runtime runs until stopped.
- **Its packages** (`packages/layer.json`): `haiccing/base-package-runtime`,
  `haiccing/base-package-boot`.
- **One request preloaded** (`request/pending/default/`): `boot deploy
  /host`, body `{ "package": "haiccing/base-package-runtime" }`.
