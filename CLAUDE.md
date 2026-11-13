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
  `base-package-boot`, `base-package-runtime`, `base-package-service`,
  `base-package-haicc` (one package, one protocol), the component
  `base-component-haicc` (several packages deployed together, `main`
  empty), and the documentation
  packages `package-docs-template` (the package structure, the README
  rules, modules and methods, tests) and `package-docs-mrepo` (the mrepo,
  layer by layer).
- `pear-full-square/`: the modules those packages carry, and
  `pkgm-base-manager`, which the tools use. A documented method is a
  directory, under `external/` (protocol actions) or `internal/`.
- `tools/`: assembling and bundling a package (`package-assemble.js`,
  `package-bundle.js`), the release into the sources (`release.js`), the product
  repositories (`products.sh`), the checks (`help-extract.js`,
  `code-check.js`). `sources/` (ignored by git): the bundles built here.
- `rules.md`: this repository's own rules (branches, layers, commits,
  URIs, records, data names). `vision.md`: directions to take into
  account, not settled.
- `steps/`: the records. Where work stands: `steps/2-rebuild/readme.md`
  and, after a context reset, `steps/2-rebuild/handover-next.md`: how the
  human works with us, what is done, what is open, the roadmap.

## Documentation

- **It follows the implementation:** it says what was built, nothing more.
- **A fact lives once, beside what it documents:** a README in every
  folder, linked from the one above (they cascade from the root). The
  generic lives in the documentation packages; a package or a module
  documents only what is its own. A decision and its reason: the step's
  record.
- **The rules are checked**, not remembered: the README rules and the code
  rules are in `package-docs-template` and run as tests.

## Validation, before every commit

- Each package's `validate` set from its bundle (its own tests, `help`,
  `code`, `mrepo`), `full` when modules changed:
  `SOURCES=$PWD/sources tools/bare sources/haiccing/<package>.bundle /test/full`.
- `tools/bare tools/help-extract.js` (and `--files`) and
  `tools/bare tools/code-check.js`: no problems.
- When the runtime or the repository code changed, the boot's test several
  times: a race shows one run in a few. Nothing left running after.
- Rebuild first: `tools/bare tools/package-assemble.js haiccing/<package>`,
  then `tools/bare tools/package-bundle.js haiccing/<package>`.

## Execution

- **It can be repeated exactly:** record units so they can be rerun;
  metrics and audit only at the boundary.
- **Product repositories:** a session can attach other repositories and
  push to them. After a change, each module's repository is updated
  (`sh tools/products.sh <module>...`, from `main`) and each package's
  (copied from `haiccing/<package>/`). New repositories are created by the
  human.
- **Planning:** the phase's request comes from `splectrum/roadmap-1`; the
  work is planned here, as it goes, and its outcome reported back.
- In a Claude Code cloud session, execution runs on `execute/main`, merged
  into `main` with a plain merge, both pushed.
