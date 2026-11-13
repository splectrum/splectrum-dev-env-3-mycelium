# tools/

The development side's tools, by what they are for. Each says in its own header what it does and how it is run.

Kept well structured: they are to become packages themselves, run on the
haicc platform. One tool one concern; what two tools share is in `lib/`;
a tool reads and writes files and prints one line of JSON a result, so
another can use it.

## Setting up

| tool | does |
|---|---|
| `install.sh` | the dependencies replayed from the lockfile, without npm |
| `ensure-bare.sh` | Bare's runtime put in place from its pinned tarball |
| `bare` | Bare, as this repository runs it |

## A package: built, tested, brought to the template

| tool | does |
|---|---|
| `package-assemble.js` | a package's `modules/` written: our modules copied, the third-party code they use |
| `package-bundle.js` | a package written as a bundle into the sources, its entry in the manifest |
| `package-test.js` | a package's pre-release: built, its `full` set run unless its report is current, the report written and bundled |
| `package-template.sh` | a package brought to the package template: the generic tests' folders, `test-reports/`, the pin |

## All packages

| tool | does |
|---|---|
| `release.js` | every package assembled and bundled into the sources, Bare's tarball, the `haicc` installer; each package's test report stated |
| `code-check.js` | the code rules over the carried modules; each package against the package structure |
| `help-extract.js` | the help tree extracted from the bundles; the README rules on it, and on the source READMEs |

## The product repositories

| tool | does |
|---|---|
| `products.sh` | a module's own repository updated from here |
| `packages.sh` | a package's own repository updated from here |

## lib/

| file | holds |
|---|---|
| `lib/dispatcher.js` | a package's dispatcher and test runner, written into the package |
| `lib/report.js` | a package's test report: its status against a bundle, the report to read |
