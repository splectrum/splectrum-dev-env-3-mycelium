# run

Runs an entry of a package the mrepo has linked, through that package's dispatcher: its tests above all.

The package's bundle, in the mrepo's `packages/`, is imported: nothing
runs but what is asked. A test runs self-contained, in a floating instance
of the package, each unit its own process, removed after.

## Signature

`run(exec, { args })`: requested as `runtime/run .
packages/<org>/<package><target> [dry-run]`. What it runs is an argument,
not the request's URI, which is where the request is executed.

## Arguments

1. The package's entry, a URI from the mrepo's root:
   `packages/<org>/<package><target>`. Required.
2. `dry-run`, optional: nothing is run, what the target would run is
   returned.

The target is the rest of the first argument after the package: `/test/<set>`,
`/test/<name>`, `/test/modules`, `/test/modules/<org>/<module>`,
`/protocol`, `/deploy`.

## Returns

- A test: its result, `{ target, ok, units }`, each unit with its tests,
  its asserts and its failures. A line a unit goes into the request's log.
- `/protocol`, `/deploy`: `{ target, offers }`, the names the entry offers.
- With `dry-run`: `{ target, runs }`, the units the target would run.

## Errors

- No first argument: `missing argument: target`.
- It is not a package's entry: `not a package's entry`.
- The target is `/run`: `not run here`. A package's program is not run
  inside the runtime's process.
- The package is not linked: `not a package of this mrepo`.
- Its bundle is missing, or has no dispatcher.

## Design

- **In situ**: the tests that run where the package is deployed are
  handed the mrepo (`MREPO`), the package (`PACKAGE`) and the mrepo's
  state in a file (`SITU`): its help as extracted, its layers, its
  packages' manifest, each linked bundle's hash. The file is removed
  after.
