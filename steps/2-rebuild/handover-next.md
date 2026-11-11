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
- **READMEs cascade** (`rules.md`; every organisation but `splectrum`):
  whenever a repository or folder comes into the work, bring it to the
  rule first (its README linking down to every folder's; `lib/` and
  `test/` documented). Done: the two packages, the two docs repositories,
  the 12 modules the packages carry. Not yet: the other pear-full-square
  modules, `splectral/`, `bare-for-pear/`, haiccing's `base-demo-*`,
  `base-swarm-three-nodes`, `base-package-haicc`. Check with a crawl of the
  links from the root (every folder reached, none broken).
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

(2026-11-11) Phase 2's release (`tools/publish.sh`, `tools/setup/`) and
package writer are removed; the boot's release is being rebuilt (a
standalone executable, `docs/design/packages.md`). A test key: `tools/bare
tools/keygen.js <folder>`. The real publisher's key is on the local
machine only. Where the work stands now: `readme.md`, parts 14 to 16.

## Next session: packages from scratch, the boot first

Part 13 (`readme.md`), the design agreed with the human on 2026-11-10, after
finding the packages a mess: the package repositories in `haiccing` no
longer written, the boot's shell outside its package (`tools/setup/`), the
terminal's code as `base-package-haicc`'s only module, the docs saying
otherwise. The design: `docs/design/packages.md` ("What a package is",
"Installing an mrepo from its structure", "The boot mrepo: the root").

**In one page**:

- A package depends only on packages. `base-package-mrepo`: what every
  base mrepo has in common (the runtime, the protocols, the fixed layers,
  the install routine). A type's package (`base-package-haicc`) customises
  it: its external API, the structure of `main` (where child mrepos are
  linked in), the packages it requires.
- A recursive structure unit: `mrepo/` (the mrepo's definition, laid out by
  layers as the repository holds them, a `layer.json` at each leaf: its
  mode; committed), `test/`, further units by URI part name (dispatch,
  terminal, nodes); `modules/` once at the package's top (the code, copied
  whole).
- Installing an mrepo: the common `mrepo/` copied, the type's on top (whole
  files replace), renamed to `<work>/mrepos/<name>/`; built there (the
  `packages` leaf's list sourced and checked; each layer folder committed
  into its store); then cleaned up (left: `.git/`, `inbox/`, `packages/`).
  No deploy script, no `scratch`.
- The boot is an mrepo, the root (`<work>/mrepos/boot/`, on disk, git only),
  never torn down. Its `main` installs the host and links it in. `boot` and
  `teardown` are executed by the parent (`service boot /host` sent to the
  boot mrepo); an mrepo itself executes initialise/shutdown, start/stop,
  pause/resume.
- The boot's release is its bundle: `base-package-boot.bundle` carries the
  boot mrepo prebuilt (its git directory as files; or a git bundle inside,
  `mycelium-git`'s `writeBundle`/`readBundle`, if files prove awkward) and
  the code to unpack and start it. Run with Bare: `bare
  base-package-boot.bundle …` (the arguments are ours: `--work=`, a plain
  argument, or the current folder: to choose). Outside it only Bare ensured
  and the bundle's hash checked: a few lines of shell, the same for every
  release.

**The plan** (the human: with the existing tools, create a boot repo we can
bundle, so we can create the boot bare bundle, and then the other ones):

1. The structure here: `haiccing/base-package-mrepo/mrepo/` (the fixed
   layers, a `layer.json` each), `haiccing/base-package-boot/mrepo/` (the
   boot mrepo: its `main` with the host's definition and the request to
   boot it), `haiccing/base-package-haicc/mrepo/` (`main`, the packages it
   requires; `api.json` moved in). Docs follow, not before.
2. The install routine (overlay, build, clean up) as a module of the
   framework, from what exists: `haicc-base-boot`'s loading, checking and
   committing; `mycelium-git`'s writer; `p2pgitBackend` on disk.
3. The boot repo built on the development side with it, all on disk, and
   carried in `base-package-boot.bundle` (the package writer, `bare-pack`).
   Run: it unpacks into `<work>/mrepos/boot/`, starts, and its preloaded
   request boots the host from the mrepo and haicc bundles.
4. Then the other bundles, and the package repositories written again (each
   package whole, as `docs/design/packages.md` says).

**To settle on the way**: where a package's build instructions live (today
`packages.json`); the package's manifest; the boot mrepo's type and API;
the boot's argument form; whether the terminal input gets its own package
(the terminal a mini mrepo later); recording `requires` (haicc requires
mrepo). Known stale meanwhile: `structure.md` ("Packages as bundles": the
repository no longer holding `modules/`, wrong), `releases.md` and
`docs/guides/release.md` (the publishing), `packages.json`'s descriptions
(mrepo's "log", haicc's "level").

## Then, in the order discussed

1. **The terminal as a mini mrepo** (its boxes, its requests done).
2. **The dispatcher application** (like HAICC: its own API; requests to it
   processed, others routed; stray records returned to it as misdelivered;
   local subscriptions file operations, remote ones other nodes, followed
   or announced). Until then HAICC's input posts into the repository's
   inbox and reads its completed form from the outbox.
3. **The headers**: to plan with the human (the execution's metadata, the
   states a request ran on, are in the commits only meanwhile).
4. **Command help** (the help protocol's second stage; the first, the help
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
5. **Populating `main` and `initialise`**: a type's own actions (its
   package's functions, run as configured), documented in the same shape.
6. A request's own history in its document (step by step), when wanted.
7. Then swarms, nodes, the requests done centralised, the demos; step 3,
   the docs.

## Elsewhere

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
