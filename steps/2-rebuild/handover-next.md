# For the next session: where step 2 stands

Written 2026-11-10 by the cloud session, before a context reset. Read this,
then `readme.md` here (each part's record), then `docs/design/repositories.md`
and `structure.md` (what holds now: built, agreed, open).

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
- **Bare only**: npm only to change dependencies (`npm install
  --ignore-scripts`; then `chmod +x node_modules/bare-runtime-linux-x64/bin/bare`,
  npm drops its exec bit). The repo's Bare:
  `node_modules/bare-runtime-linux-x64/bin/bare` (tests:
  `bare ../../node_modules/brittle/cmd.js test/*.test.js` in a module).
- **This development repository stays as it is** (its `rules.md`,
  `pending/default`, `capability/*`): behind in structure, not to be
  migrated; the new model is for mycelium repositories.
- **The headers stay empty** until their use is planned with the human.
- **A test waits for a runtime's process to end** (signal 0, `kill -0`), not
  only for it to stop answering.

## Done in step 2 (`readme.md`)

1–3: the boot creates the host's repository from a signed release; the
framework a package; the runtime started by the boot. 4–4b: the boxes; the
runtime (`mrepo-base-runtime`), the host's repository `host` in
`<work>/mrepos/host/`. 5: requests flowing (request and execute protocols,
the `runtime` layer, the type's API as a package, `haicc` every command a
request). 6: one repository over two stores (`mixedBackend`). 7: the boxes
as layers (`post`), a repository on native git (`<work>/mrepo.json`). 8:
records as an onion (a pre-filled form in a pre-addressed envelope). 9: log
events as records, a request's journey shown. 10: the key (a GUID) and order
by the commit chain. 11: the `log` layer, built, then removed in 12: no log,
a request is its own record (`request/done` the history; errors into the
request they happened to), the boot a request too, the action wrapped in a
read-only execution context; the command as typed in the form. The docs consolidated;
the module READMEs; the product repositories updated after each part.

The release check (no publishing): `sh tools/publish.sh <folder>
--key-dir=<folder>`, with a test key made by `tools/bare
tools/setup/keygen.js <folder>` (the container is temporary: make one). The
real publisher's key is on the local machine only.

## Open, in the order discussed

0. **Packages from scratch** (part 13, in progress): the design agreed so
   far in `docs/design/packages.md` (the structure unit, the overlay install,
   the boot mrepo as the root); next the build instructions, the manifest,
   the boot mrepo's type and API; then built (the boot package the first,
   `haiccing/base-package-boot/` here; the package repositories written
   again).

1. **The terminal as a mini mrepo** (its boxes, its requests done).
2. **The dispatcher application** (like HAICC: its own API; requests to it
   processed, others routed; stray records returned to it as misdelivered;
   local subscriptions file operations, remote ones other nodes, followed
   or announced). Until then HAICC's input posts into the repository's
   inbox and reads its completed form from the outbox.
3. **The headers**: to plan with the human (the execution's metadata, the
   states a request ran on, are in the commits only meanwhile).
4. **Populating `main` and `initialise`**: a type's own actions (its
   package's functions, run as configured).
5. A request's own history in its document (step by step), when wanted.
6. Then swarms, nodes, the requests done centralised, the demos; step 3,
   the docs.

## Elsewhere

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
