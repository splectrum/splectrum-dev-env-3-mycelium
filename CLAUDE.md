# CLAUDE.md — dev-env-3-mycelium

How to work in this repository, for AI use. Keep this file up to date as
the landscape changes: it describes what is here now.

- **The aim:** full AI autonomy, from a need to running software that
  satisfies it. KISS, consistent rules and self-containment make it
  possible.
- **Autonomy first.** Collaboration only where required — meaning, missing
  or inaccessible information, any exception that halts the work — and
  collaboration is discussion: discuss first, write what has settled.
  Structure and design are decided with the human, not alone. Natural
  language; KISS.
- **Proposals, not decisions:** the rules are proposals to be tested. When
  practice shows a rule is wrong, raise it.

## What is here

Only what is in use. What nothing uses is removed (it stays in the
history, and each module has its own repository) and brought back when
the work reaches it.

- `haiccing/`: the packages, each at the path of its repository:
  `base-package-runtime`, `base-package-protocol`, `base-package-help`,
  `base-package-boot`, `base-package-service`, `base-package-haicc` (one
  package, one protocol); the components `base-component-boot` (the
  initial boot mrepo and the program that puts it in place) and
  `base-component-haicc`
  (several packages deployed together, `main` empty; a list ends with its
  own package, which states the mrepo's runtime config);
  `base-linux-haicc` (the `haicc` command: sh scripts, no bundle); and the
  documentation packages `package-docs-template` (the package structure,
  the README rules, modules and methods, tests; the template a package
  starts from: its `test/` holds the generic tests, a folder each) and
  `package-docs-mrepo` (the mrepo, layer by layer).
- `pear-full-square/`: the modules those packages carry, and
  `pkgm-base-manager`, which the tools use. A documented method is a
  directory, under `external/` (protocol actions) or `internal/`.
- `tools/`: the dependencies replayed from the lockfile (`install.sh`),
  assembling and bundling a package (`package-assemble.js`,
  `package-bundle.js`), the release into the sources (`release.js`: every
  package, Bare's tarball, the `haicc` installer; it says each package's
  test report against the bundle built), a package's pre-release
  (`package-test.js`: built, its `full` set run from the bundle unless its
  report is current, the report written into `test-reports/` and bundled
  with it), a package brought to the template (`package-template.sh`: the
  generic tests' folders and `test-reports/` copied from the template's
  repository, the package pinned to that commit), the product
  repositories (`products.sh` for the modules, `packages.sh` for the
  packages), the checks (`help-extract.js`, `code-check.js`). `sources/`
  and `node_modules/` are ignored by git: a fresh clone needs
  `sh tools/install.sh`, then `tools/bare tools/release.js`.
- `rules.md`: this repository's own rules (branches, layers, commits,
  URIs, records, data names). `vision.md`: directions to take into
  account, not settled.
- `steps/`: the records. Where work stands: `steps/2-rebuild/readme.md`
  and, after a context reset, `steps/2-rebuild/handover-next.md`: how the
  human works with us, what is done, what is open, the roadmap. Tasks
  discussed and waiting to be built: `steps/2-rebuild/tasks.md`.

## Documentation

- **It follows the implementation:** it says what was built, nothing more.
- **A fact lives once, beside what it documents:** a README in every
  folder, linked from the one above (they cascade from the root). The
  generic lives in the documentation packages; a package or a module
  documents only what is its own. A decision and its reason: the step's
  record.
- **The rules are checked**, not remembered: the README rules, the code
  rules and a package's structure (among it: a package tests what it
  provides) are in `package-docs-template` and run as tests.

## Validation, before every commit

- **A package that changed: its pre-release**, one command:
  `tools/bare tools/package-test.js haiccing/<package>`. It rebuilds the
  package, runs its `full` set from the bundle when its content changed,
  and writes the report (`test-reports/`) that is committed with it.
  Nothing changed: nothing run, the same bundle. A module that changed:
  the pre-release of every package that carries it.
- **Everything**: `tools/bare tools/release.js --strict`: every package
  rebuilt, and it refuses unless every package's report is current.
- `tools/bare tools/help-extract.js` (and `--files`) and
  `tools/bare tools/code-check.js`: no problems. The second also checks
  every package against the package structure.
- When the runtime or the repository code changed, the boot's test
  several times: a race shows one run in a few
  (`SOURCES=$PWD/sources tools/bare sources/haiccing/base-component-boot.bundle /test/validate`).
  Nothing left running after (`pgrep -fa "bin/bare"`).
- The `haicc` command end to end, when anything it touches changed (the
  scripts, the boot, the component, the request form):
  `sh haiccing/base-linux-haicc/test/run.sh`.
- **A package tests what it provides**, in a test of its own, a folder in
  its `test/`; where nothing is specific to it, a dummy that says so, an
  explicit decision. A test that runs nothing by accident fails. A new
  package starts from the template (`sh tools/package-template.sh`) and
  fails its own validation until that question is answered.

## Execution

- **It can be repeated exactly:** record units so they can be rerun;
  metrics and audit only at the boundary.
- **Product repositories:** a session can attach other repositories and
  push to them. After a change, each module's repository is updated
  (`sh tools/products.sh <module>...`, from `main`) and each package's
  (`sh tools/packages.sh -m "<what changed>" <package>...`). New
  repositories are created by the human.
- **Planning:** the phase's request comes from `splectrum/roadmap-1`; the
  work is planned here, as it goes, and its outcome reported back.
- In a Claude Code cloud session, execution runs on `execute/main`, merged
  into `main` with a plain merge, both pushed.
