# test/

The package's tests, a folder each, and the sets that select them. Run
through the package's dispatcher (`main.js`, its bundle's main), every one
by path.

```
test/
  run.js          bare test/run.js [<set>]   validate by default
  validate.json   the deployment checked
  full.json       every test
  <name>/         a test: a structure unit, its entry run.js
```

## The targets

| target | runs |
|---|---|
| `/test/<name>` | a test folder: its `*.test.js` |
| `/test/modules/<org>/<module>` | a carried module's own tests (`modules/<org>/<module>/test/*.test.js`) |
| `/test/modules` | the generic modules test: every carried module's own tests |
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

Every package has `validate` (the package as deployed: its own tests) and
`full` (everything: also `modules`). More sets as needed.

## The generic modules test

Every package has it, written for it: nothing to add. A package carries
its modules (`modules/<org>/<module>/`, ours copied whole); each module's
own tests come with it and run there, against the package's copies, the
code the package really runs. A module's tests stand on their own: what
they need they make, or take from the environment (a sources folder as
`SOURCES`).

## Self-contained: a floating instance

A test makes what it needs (an mrepo deployed, initialised, torn down) and
leaves nothing behind. From a bundle the dispatcher first writes the
package into a temporary folder (its files, its native addons back in
place, its module links), runs the units there, removes it, returns the
result: an instance that floats, attached to nothing.

## Running

```
bare test/run.js [<set>]                        from the package's folder
bare <package>.bundle /test/<target> [--dry-run]  from its bundle
runtime run /packages/<org>/<package>/test/<target>   in a running mrepo,
                                                  body { dryRun }
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
