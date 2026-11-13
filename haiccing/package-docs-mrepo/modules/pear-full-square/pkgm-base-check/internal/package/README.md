# package

Checks a package against the structure it is to have, and that it tests what it provides.

A package that provides something and has no test of its own for it does
not pass: the reminder comes from the check, not from memory.

## Signature

- `checkOwn(pkg)`: all of it; asynchronous.
- `provides(pkg)`: what the package provides, read from its files;
  asynchronous, its `protocol.js` is imported.
- `checkFiles(pkg)`: its README, its LICENSE, its `package.json`.
- `checkSets(pkg, what)`: its test sets.
- `checkTests(pkg, what)`: its tests of its own.

`pkg` is the package's folder; `what` is what `provides` returned.

## Returns

`[{ check, detail }]`, `check` always `package`; none expected.

`provides` returns `{ docs, protocols, run, hooks, list, modules }`:
`protocols` the names its `protocol.js` configures (`null` when it could
not be loaded), the others whether it is a documentation package, has a
`run.js`, brings hooks, lists the packages of an mrepo of its own, and
carries modules of ours.

## Rules

- **Files**: `README.md`, `LICENSE`, `package.json` with its
  `description`, `license`, `type` `module` and `modules`, a list; the
  folder `test-reports/` with its README, where its test report goes.
- **Its pin**: `template.commit` in its `package.json`, the commit of the
  package template it was brought to. The template itself has none.
- **Sets**: `validate`, `validate-in-situ` and `full`, each with a
  description and its tests by name. `validate` and `full` hold `help`,
  `code`, `mrepo` and `package`; `full` also `modules` where modules are
  carried; `validate-in-situ` holds `help-in-situ` and `mrepo-in-situ`.
- **Every test has its folder**: each test a set names is `test/<name>/`,
  the generic ones too, with its `run.js` and its `README.md`.
- **A test of its own** also has a `*.test.js` and is named in `validate`
  and in `full`. Its name is the package's own.
- **It tests what it provides**: at least one test of its own where it
  provides a protocol, has a `run.js`, brings hooks, or lists the
  packages of an mrepo.
- **A documentation package** is asked for no test of its own.

## Also exported

- `GENERIC`: the names of the generic tests.
- `SETS`: the sets every package has, with the generic tests of each.
- `testFolders(pkg)`: the folders of its `test/`, by name.
- `ownTests(pkg)`: those that are not a generic test's.
- `TEMPLATE`: the package template's name.
