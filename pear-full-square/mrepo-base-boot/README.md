# mrepo-base-boot

The mrepo boot protocol, the base variant: `deploy`, `teardown`,
`redeploy` (teardown, then deploy), executed by the parent. Carried by
`haiccing/base-package-boot`, linked into every mrepo that deploys others.

- `lib/build.js`: an mrepo built from its structure (`build({ from, work,
  name, time })`): a folder laid out by layers, a `layer.json` at each leaf,
  written as a standalone repository on the filesystem, one orphan branch a
  leaf, its files one commit (`layer.json` with them, not one of the
  layer's records); the inbox's files its working tree; `<work>/mrepo.json`
  set to `filesystem`. A fixed `time`: the same commits every build. The
  install routine's first piece.
- `lib/prerequisites.js`: an mrepo's prerequisites, checked before
  anything is written (`check(list, ctx)`): `platform`, `work`, `sources`,
  `bare` (fixed, with a yes: the pinned Bare put in place from the sources,
  a folder's `holepunchto/` or npm's registry, checked by its sha512),
  `docker` (installed, running, rootful, native, the user in its group); a
  condition each (`when: 'not-in-container'`). Stops at the first missing.
- Not yet: the actions themselves (deploy, teardown, redeploy), the
  overlay and the clean-up.

## Tests

- `npm test`: the unit tests (building, running a built mrepo on the
  runtime, the prerequisites).
