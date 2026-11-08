# A package's functionality, and its tests

Status marks: **built** (in the code, tested), **agreed** (decided, not built).

## Functionality by URI

**Built for tests; agreed for swarms.** Everything a package offers (a
swarm, a test, whatever comes next) is a folder in the package, addressed by
URI, booted the same way: `./haicc boot <repo>[/<type>/<name>]`
(`--from=<folder>` for another root than `haiccing/`).

- **Its cold boot**: its own `boot` script (sh), when it has one, else its
  type's default from the platform (`platform/<type>/boot`). The cold boot
  can be customised as required: it sets up what it needs, hands over to
  the warm boot (`./haicc ...`), does what it is for, cleans up as part of
  its execution.
- **Its teardown**: its own `teardown` script, else its type's default
  (`platform/<type>/teardown`).
- **Its type** decides where it lands (a test's run: `swarms/test/<name>/`;
  a swarm: `swarms/<name>/`) and its defaults. Nothing else distinguishes
  the types.

*Why*: one mechanism for every scenario; a package brings its own
lifecycle, so the package is the environment (the human).

## Tests

**Built.**

- **A test is a folder** `test/<test>/` in its package, with `test.json`
  (`categories`: the sets it is in; `needs`: e.g. `docker`; `destroys`:
  what outside its run it changes, and how to restore it), a `README.md`,
  and either:
  - a `test` script: it **runs in place** (no work folder needed; the
    package manager runs it: what an install's validation can run), or
  - a `boot` script: it is **booted** (`./haicc boot <repo>/test/<test>`):
    its folder copied into its run, `swarms/test/<test>/`; its cold boot
    run there, with `HAICC_WORK` (the work folder), `HAICC_PACKAGE` (the
    package under test), `HAICC_RUN` (its run); **its result its exit
    code**; then its teardown, on completion (`--keep`: left to look at).
- **Sets**: `test/<set>.json` lists its tests in order, and whether the
  modules' own tests (`modules`) and the swarms' (`swarms`) are in it. `validation` (the package as it is, nothing
  started: what an install and a node's warm boot run) and `full`
  (everything: before a release, and on a downloaded release). A test's
  `categories` and the sets agree (the `sets` test checks it).
- **Bottom up**: the modules' own tests, then the swarms'
  (`swarms/<swarm>/test/`: each executable, in the swarm's folder), then
  the package's named tests.
- **Needs and destroys**: a test that needs what the host does not have is
  skipped and said, never passed; one that changes what is outside its run
  repairs it in its teardown, or declares it and runs only with a yes.
- **Running them**: `./haicc boot <repo>/test` (a set: `--set=`, default
  `full`; in-place tests first, then each booted one), `./haicc boot
  <repo>/test/<test>` (one), or a node's `./haicc test <package>
  [--set=]`. The package manager runs in-place tests (`testPackage`); a
  test that does not end is stopped and fails (10 minutes).

## base-package-haicc's tests

**Built.**

| test | how | sets | checks |
|---|---|---|---|
| the modules' own | in place, brittle | full | `haicc-base-boot`, `haicc-deployment`, `haicc-reconcile`, `pkgm-base-manager` |
| `modules-load` | in place (written by the package writer) | validation, full | every module of ours loads |
| `sets` | in place | validation, full | the sets and the tests' categories agree |
| `platform` | booted; needs Docker | full | a fresh install of the package under test, set up inside its run: `./boot`, a swarm and two nodes made from the test's own configuration (`--from`; mixed), booted again from its own copy, a node added by hand and torn down, each node validated, a file replaced in a node's copy (not intact, not up, the swarm's boot stops, repaired), every level shut down and booted, teardown, the cold shutdown, `./boot` again (24 steps); its teardown removes the install |

*Why the platform test sets up its own install*: testing the platform is
installing it; a test that brings a platform needs an install of its own.
