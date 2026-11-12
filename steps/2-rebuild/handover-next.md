# For the next session: where step 2 stands

Kept current by the cloud session (last: 2026-11-12, part 28). Read `CLAUDE.md`
first (what is here, how to validate), then this, then `readme.md` here
(each part's record; the latest parts last). The documentation of what is
built is in the packages: `haiccing/package-docs-template` and
`haiccing/package-docs-mrepo`, and each folder's README.

## How the human works with us

- **Ask point by point, briefly**: one question at a time, short; no walls
  of text. Discuss first; build what has settled; structure and design are
  decided with the human.
- **Check yourself before asking** (GitHub: `gh api -X GET search/repositories
  -f q='<name> in:name org:<org>'`; the code; the docs).
- **Few pushes** (GitHub suspended us once): one commit and one push per
  part; when a part is done, merge `execute/main` into `main` (a plain
  merge, a message file: `git merge --no-ff -F <file>`) and push both at
  once; then the product repositories (`sh tools/products.sh <module>...`,
  from `main`).
- **The lock file by hand**: a module added or removed is written into
  `package.json` (workspaces) and `package-lock.json` (its workspace entry,
  its link entry) directly, its link made in `node_modules/`; no npm run.
- **Bare only**: npm only to change dependencies (`npm install
  --ignore-scripts`; then `chmod +x node_modules/bare-runtime-linux-x64/bin/bare`,
  npm drops its exec bit). The repo's Bare:
  `node_modules/bare-runtime-linux-x64/bin/bare` (tests:
  `bare ../../node_modules/brittle/cmd.js test/*.test.js` in a module).
- **This development repository stays as it is** (its `rules.md`,
  `pending/default`, `capability/*`): behind in structure, not to be
  migrated; the new model is for mycelium repositories.
- **The headers stay empty** until their use is planned with the human.
- **Only what is in use is here** (2026-11-11): the modules no package
  carries, the old haiccing folders, `splectral/`, `notes/`, `docs/` were
  removed (the history has them; each module has its repository). Bringing
  one back: copy it from its repository, then bring it to the rules first
  (READMEs cascading, `external/`/`internal/` methods, the code rules), as
  the checks will demand. `CLAUDE.md` describes the repository as it is:
  keep it so.
- **A test waits for a runtime's process to end** (signal 0, `kill -0`), not
  only for it to stop answering.

## What is built (`readme.md`, parts 13 to 26)

- **Packages**: a package is one bundle carrying its structure (`mrepo/`),
  its code (`modules/`, assembled), its tests and its READMEs; its main a
  generated dispatcher running every entry by path (`/run`, `/protocol`,
  `/deploy`, `/test/...`). Assembly options per package (`assemble.omit`).
- **The boot** (`base-package-boot`): from nothing, prerequisites checked,
  the boot mrepo built, its packages placed, its runtime started; a
  standalone executable per platform (`tools/boot-release.js`). Its
  protocol: `boot deploy`, `teardown`, `redeploy` of a child, inside its
  parent (`main/<name>/`).
- **The runtime** (`base-package-runtime`): the engine of every mrepo; its
  `protocol.js` offers `runtime run` (a linked package's entry, its tests)
  and `help` (`get`, `extract`). Requests: one handler into pending;
  internal requests (the mrepo's own, not in the inbox) first, the inbox
  taken in once the mrepo is operational.
- **Help**: the READMEs of an mrepo's packages extracted into its `help`
  layer as it starts, read with `help get <uri>` at three levels.
- **Validation in every package**: `/test/help` (the README rules),
  `/test/code` (the code rules), `/test/mrepo` (the integrity of its mrepo
  side), `/test/modules` (the carried modules' own tests);
  `validate-in-situ` in a running mrepo (`help-in-situ`, `mrepo-in-situ`).
- **Documentation packages**: `package-docs-template`,
  `package-docs-mrepo`, linked into every mrepo, validating themselves.
- **The service** (`base-package-service`): an mrepo that links it is
  service managed: its external API gated by the service state, against
  the protocols its runtime loaded and recorded in its `protocols` layer.
  No protocol is built into the runtime: every one comes from a package.

## The roadmap, in order

Not built yet, and the platform is not deployed until the first two are
(they were in the earlier packages plan; kept here so they are not lost):

1. **`base-package-service`**: built (part 28): the `service` protocol as
   a package, the `protocols` layer, the gate on the loaded protocols'
   configs. Rule (the human): a package creates one entity, for a base
   package a protocol. The service's door closes a selection of
   protocols, those `gated` in their config (the human); the others stay
   open. Still open from it: the runtime's status beyond "not yet
   operational".
2. **`base-package-haicc`**: the `haicc` protocol. To discuss with the
   human first: what its functionality really is.
   Then **the mrepo application**: to design: what brings a selection of
   protocols together into one mrepo (today a target package's
   `mrepo/packages/layer.json` lists them). The boot's preloaded `boot
   deploy /host` then targets it (today: the runtime package, for now).
3. **`base-package-crud`** (the human: CRUD, not rest): the generic
   actions on an mrepo's data as a protocol of its own, gated. It gets its
   full meaning with mutable and immutable implemented: an update on the
   mutable side from a stream of immutable change events. Until then the
   `rest` actions stay in `mrepo-base-execute`, unmounted, the tests' own.
4. **Release and sourcing, deferred**: bundles signed and the manifest
   checked against the publisher's key (the key tool was removed with the
   clean-up: to be rebuilt with it); a GitHub source beside the folder
   source; the Docker prerequisite used (nodes).

Then, as discussed:

5. **The terminal as a mini mrepo** (its boxes, its requests done).
6. **The dispatcher application** (like HAICC: its own API; requests to it
   processed, others routed; stray records returned to it as misdelivered;
   local subscriptions file operations, remote ones other nodes, followed
   or announced). Until then HAICC's input posts into the repository's
   inbox and reads its completed form from the outbox.
7. **The headers**: to plan with the human (the execution's metadata, the
   states a request ran on, are in the commits only meanwhile).
8. **Command help** (the help protocol's second stage; the first, the help
   layer and `runtime help`, is built). Agreed with the human:
   - **The external API, structured**: a post-processing step of the help
     parser, a view of the protocols and their actions the mrepo offers,
     each joining the package's mounting (`protocol.js`: URIs, states)
     with the module method's README (`external/<action>/`: body, returns,
     errors).
   - **URI dismantling**: what a (local) URI really points to: its layer,
     the folder or package, a mapping out.
   - **The help flag is a rewrite**: `<protocol> <action> <uri> --help`
     becomes a help command whose input is the original request; answered
     with the request's context (allowed here and now, the draft body
     checked), nothing executed. No header needed.
   Here because the dispatcher brings requests from outside. The modules
   get their `external/`/`internal/` directories as work reaches them
   (done: `mrepo-base-boot`). Third stage, later: AI enhanced help.
9. **Populating `main` and `initialise`**: a type's own actions (its
   package's functions, run as configured), documented in the same shape.
10. A request's own history in its document (step by step), when wanted.
11. **A mini tool for the modules kept here** (`tools/`), no npm run: a
   module added (brought back from its repository, or new) or removed is
   written into `package.json` (workspaces), `package-lock.json` (its
   workspace entry, its link entry) and `node_modules/` (its link); and the
   third-party code nothing here uses any more is pruned from the three
   (worked out with the closure, as the assembler does). Done by hand
   until then (part 26). Here because the swarms bring modules back.
12. Then swarms, nodes, the requests done centralised, the demos; step 3,
   the docs.

## Elsewhere

- **Validation, for autonomy** (step 2, parts 23-25): every package's
  `validate` checks its help (`/test/help`, the README rules) and its code
  (`/test/code`, the code rules); `validate-in-situ` in a running mrepo.
  Run before every commit: `tools/bare tools/help-extract.js` (and
  `--files`), `tools/bare tools/code-check.js`, each package's set from its
  bundle. Run the boot's test several times when the runtime or the
  repository code changed: a race shows one run in a few.
- **Open, p2p-git**: a ref is written in place (for an instant unreadable
  to another process); to be written aside and renamed. `mycelium-git`'s
  `listBranches` tolerates it meanwhile.
- **Internal requests** (part 24): placed by the mrepo itself, straight to
  the handler into pending (`admit`), no mark: internal is having no
  record in the inbox (`isInternal`); the inbox waits until the mrepo's own
  are done. The runtime's status (operational) starts there.
- **Assembly options per package** (part 24): `assemble.omit` in a
  package's `package.json`, a default in the root; try and see, its
  `validate` the proof.
- **`mrepo-base-help`**: built (step 2, part 24): the help protocol, the
  extraction, the validation; documentation packages marked `docs`.
- **The local agent** builds, tests and publishes releases
  (`prompt-local.md`, `handover-local.md`); it was busy with a release when
  this was written: its record will be in `local-run.md`.
- **The seed `dev-env-3-mrepo-native`** is on `splectrum/roadmap-1`
  (`seeds/dev-env-3-mrepo-native/`, a copy in `seed-dev-env-3-mrepo-native/`
  here): the mrepo framework on native git, standalone. Its repository,
  `splectrum/dev-env-3-mrepo-native`, to be created by the human. Its
  request's step 2 (the storage setting, the opener) and the boxes as
  layers are already built here (part 7 on): open whether to update the
  seed to say so (one commit to `roadmap-1`).
- `pear-full-square/mrepo-base-log` (created empty by the human): dropped,
  to be archived by the human.
- The product repositories of removed modules (`mycelium-repo`,
  `haicc-reconcile`, `p2p-swarm-manager`) are archived.
