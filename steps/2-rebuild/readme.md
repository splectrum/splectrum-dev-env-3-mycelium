# Step 2. The rebuild

Request: `c0e14a4:pending/phase-3/step-2-rebuild/request.md` on
`pending/default`. Design: `docs/design/`. Collaborative: decided with the
human as it moves along. The thin path first: (1) boot creates the
repository; (2) the functional framework added (the mycelium bundle); (3)
`mycelium-repo-main` started; (4) the inbox and outbox, a minimal
dispatcher; (5) requests flowing, demo functionality, `haicc request add`.
Then `main` populated and the warm boot (repository functionality); swarms,
nodes, centralised logs, the demos.

## 1. Boot creates the repository: in progress

**The bundle release** (2026-11-09):

- `haicc-base-boot` reset (the old module and `haiccing/base-package-haicc`'s
  hand-written parts removed; their product repositories renamed and
  archived by the human, new ones created): a new module, `index.js` (the
  commands, a library) and `haicc.js` (the command line, the package's
  entry); `version` for now; its tests 6 of 6.
- `packages.json`: the `haicc` package its module and its entry point
  (`entries`); no pair (`together` gone).
- The package writer (`tools/package-writer/bundle.js`): a package with
  entries is written as its release: `<repo>.bundle` (the full package: the
  closure of its entry by `bare-pack`, the Bare resolver, paths
  canonicalised, the package's other files as files), `addons/<sha256>`
  beside it (offloaded; named `/../addons/<sha256>`), `manifest.json`.
  `bare-pack` 3.0.2 a dependency of this repository (the development side).
  The writer's tests 3 of 3 (a release written and run).
- `base-package-haicc`'s release: a 374 KB bundle (107 files: the code
  reached from the entry, the package's README, LICENSE, its module's tests,
  its named tests and sets), 12 addons; `bare base-package-haicc.bundle
  version` answers here and in the node image with only Bare and the release
  folder (read-only).

Not yet: the tests run from the bundle (their third-party code, brittle,
is not reached from the entry); the other packages (`swarm-three-nodes`, the
demos) still defined on the old platform, written with `--only` meanwhile;
`haicc-deployment` still pointing into the old `haicc-base-boot`.
