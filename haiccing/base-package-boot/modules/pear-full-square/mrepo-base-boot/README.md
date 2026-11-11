# mrepo-base-boot

The mrepo boot protocol, the base variant: `deploy`, `teardown`,
`redeploy` (teardown, then deploy), executed by the parent. Carried by
`haiccing/base-package-boot`, linked into every mrepo that deploys others.

- `lib/deploy.js`: the actions, each `(exec, form)` in the execution
  context: `deploy` (the target package from the body; its
  `mrepo/packages/layer.json` the packages, in order; each fetched into the
  store, reached by the store the parent's packages manifest records, its
  `mrepo/` part laid in in that order; built inside the parent,
  `<parent>/main/<name>/`; its packages linked individually; its type
  recorded at the node, `/main/<name>.json`; its runtime started from its
  own `packages/`, by its directory), `teardown` (its runtime stopped until
  its process ended, its folder removed, its record out), `redeploy`
  (teardown, a local commit, deploy: the recorded type unless the body
  names one). The parent's directory from the context (`exec.runtime.dir`).
- `lib/packages.js`: packages put in place: `fetch` (into the work folder's
  store once, from the sources, checked by sha256), `structureOf` (a
  package's `mrepo/` part, from its bundle), `place({ dir, store, sources,
  list })` (each linked individually into `<dir>/packages/`: the mrepo runs
  only what is registered for it; its `packages` layer's manifest
  committed: the packages with their entry points, the sources, the store).
- `lib/build.js`: an mrepo built from its structure (`build({ from, work,
  name, dir, time, setting })`; `dir`: a child, inside its parent): a folder laid out by layers, a `layer.json` at each leaf,
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
  clean-up; what an action does outside the repository (a runtime started,
  a child's folder removed) is not undone by a reset.

## Tests

- `npm test`: the unit tests (building, running a built mrepo on the
  runtime, the prerequisites, the actions).
