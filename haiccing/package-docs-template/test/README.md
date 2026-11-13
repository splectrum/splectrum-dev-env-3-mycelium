# test/

The package's tests, a folder each, and the sets that select them.

```
test/
  run.js                  bare test/run.js [<set>]   validate by default
  validate.json           the package on its own
  validate-in-situ.json   the package where it is deployed
  full.json               every test
  <name>/                 a test or a test group: its run.js, its README
```

| | |
|---|---|
| [help/](help/) | generic: the READMEs against the README rules |
| [code/](code/) | generic: the code against the code rules |
| [mrepo/](mrepo/) | generic: the integrity of the mrepo side |
| [package/](package/) | generic: the package against this structure |
| [modules/](modules/) | generic, a group: every carried module's own tests |
| [help-in-situ/](help-in-situ/) | generic: the help where it is deployed |
| [mrepo-in-situ/](mrepo-in-situ/) | generic: the package as an mrepo holds it |
| [name/](name/) | a test of the package's own |

## A folder each

Every test has its folder here, the generic ones too: nothing runs that
has no folder. The generic tests are the same in every package and come
with this template; a test of the package's own is named as the package
likes. Run through the package's dispatcher (`main.js`, its bundle's
main), every one by path.

A package's `test/README.md` lists its sets and links to each test's
README.

## The targets

| target | runs |
|---|---|
| `/test/<name>` | a test folder: its `run.js` |
| `/test/modules/<org>/<module>` | a carried module's own tests (`modules/<org>/<module>/test/*.test.js`) |
| `/test/modules` | the generic modules test: every carried module's own tests |
| `/test/help` | the package's help, extracted from its own files, checked against the README rules |
| `/test/help-in-situ` | the package's help as a running mrepo's runtime extracted it, checked |
| `/test/code` | the package's code, its modules and its own, checked against the code rules |
| `/test/mrepo` | the integrity of its mrepo side: its structure, its protocols, what it carries |
| `/test/mrepo-in-situ` | the package as a running mrepo holds it: linked, its bundle, its layers |
| `/test/package` | the package against this structure: its files, its sets, its tests, a test of its own for what it provides |
| `/test/<set>` | a set: its tests, in order (`modules` expands to every module) |

Each a unit, each unit its own process. Beside them the entry points,
`/run`, `/protocol`, `/deploy`; `/` lists every target (a dry run only).

## A set

```json
{
  "description": "The package as deployed.",
  "tests": ["start"]
}
```

Every package has `validate` (the package on its own, in a floating
instance: its own tests, `help`, `code`, `mrepo` and `package`),
`validate-in-situ` (where it is deployed: `help-in-situ` and
`mrepo-in-situ`, run with `runtime run`, which names the mrepo and the
package) and `full` (everything: also `modules`). More sets as needed.

## Its own tests

A package tests what it provides, in tests of its own: nothing it brings
is left to another package's test. Their names are the package's own. A
test can be as large as it needs: a test mrepo made for it with test
data, a whole deployment, several swarms.

Every package has at least one. For a protocol: a test mrepo with test
data, the protocol's actions, its hooks and its configs tested there.

A test of its own is a folder with its `run.js`, its `README.md` and a
`*.test.js`, named in `validate` and in `full`.

## Nothing to test

For each package the question is asked: is there anything package
specific that needs testing? Where the answer is no, the package says so
with a dummy: a test of its own that runs nothing, its README giving the
reason. It shows in the report as 0 of 0.

The dummy is not part of this template and is never copied: it is written
for the package, as the answer to that question.

`/test/package` checks all of this in every package: one that has no test
of its own, real or dummy, fails its own validation.

## Modules test

Every package has it, in `test/modules/`: nothing to add. A package carries
its modules (`modules/<org>/<module>/`, ours copied whole); each module's
own tests come with it and run there, against the package's copies, the
code the package really runs. A module's tests stand on their own: what
they need they make, or take from the environment (a sources folder as
`SOURCES`).

## Floating instance

A test makes what it needs (an mrepo deployed, initialised, torn down) and
leaves nothing behind. From a bundle the dispatcher first writes the
package into a temporary folder (its files, its native addons back in
place, its module links), runs the units there, removes it, returns the
result: an instance that floats, attached to nothing.

## Running

```
bare test/run.js [<set>]                        from the package's folder
bare <package>.bundle /test/<target> [--dry-run]  from its bundle
runtime run /packages/<org>/<package>/test/<target> [dry-run]
                                                  in a running mrepo
```

Imported: `run(target, { dryRun })`. A dry run returns the units the
target would run, nothing run.

## The result

```json
{
  "target": "/test/validate",
  "ok": true,
  "units": [
    { "unit": "/test/start", "ok": true,
      "tests": { "passed": 1, "total": 1 },
      "asserts": { "passed": 4, "total": 4 },
      "failures": [] }
  ]
}
```

`failures`: the failed tests' names. From the command line the result is
printed last, one line; exit 0 all passed, 1 one failed, 2 no such set.
