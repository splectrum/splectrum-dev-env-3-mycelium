# mrepo-base-boot

The mrepo boot protocol, the base variant: `deploy`, `teardown`,
`redeploy` (teardown, then deploy), executed by the parent. Carried by
`haiccing/base-package-boot`, linked into every mrepo that deploys others.

- `lib/deploy.js`: the actions, each `(exec, form)` in the execution
  context: `deploy` (the child's definition, `/main/<name>/mrepo/` in the
  parent, built into `<work>/mrepos/<name>/` and linked into the parent's
  `main` as `/main/<name>.json`), `teardown` (the child's folder removed,
  its link out of `main`), `redeploy` (teardown, committed locally with
  `exec.commit()`, then deploy). The child named by the URI's one part
  (`/host`); the work folder from the context (`exec.runtime.work`).
- `lib/packages.js`: packages put in place (`place({ work, name, sources,
  list })`): each listed package from the sources (a folder by
  organisation: `<org>/<repo>.bundle`, `<org>/manifest.json`, `addons/`),
  checked by its sha256, into the work folder's store (`<work>/packages/`,
  once), hard linked into the mrepo's `packages/` (a copy across disks),
  the list and hashes committed into its `packages` layer (`/manifest.json`;
  unchanged: no commit).
- `lib/build.js`: an mrepo built from its structure (`build({ from, work,
  name, time, setting })`): a folder laid out by layers, a `layer.json` at each leaf,
  written as a standalone repository on the filesystem, one orphan branch a
  leaf, its files one commit (`layer.json` with them, not one of the
  layer's records); the inbox's files its working tree; `<work>/mrepo.json`
  set to `filesystem` (`setting: false`: not, for a child, the work
  folder's setting its parent's). A fixed `time`: the same commits every
  build. The install routine's first piece.
- `lib/prerequisites.js`: an mrepo's prerequisites, checked before
  anything is written (`check(list, ctx)`): `platform`, `work`, `sources`,
  `bare` (fixed, with a yes: the pinned Bare put in place from the sources,
  a folder's `holepunchto/` or npm's registry, checked by its sha512),
  `docker` (installed, running, rootful, native, the user in its group); a
  condition each (`when: 'not-in-container'`). Stops at the first missing.
- `index.js` exports them. `haiccing/base-package-boot`'s `protocol.js`
  offers the actions and their configs.
- Not yet: the requirements resolved into packages and overlaid, the
  clean-up, the child started; what an action does outside the repository
  (a child's folder) is not undone by a reset.

## Tests

- `npm test`: the unit tests (building, running a built mrepo on the
  runtime, the prerequisites, the actions).
