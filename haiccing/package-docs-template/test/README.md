# test/

The package's tests, a folder each, and the sets that select them.

```
test/
  run.js          bare test/run.js [<set>]   validate by default
  validate.json   the deployment checked
  full.json       every test
  <name>/         a test: a structure unit, its entry run.js
```

## A set

```json
{
  "description": "The package as deployed.",
  "tests": ["start"]
}
```

Every package has `validate` (the package as deployed: its own tests) and
`full` (everything: also `modules`, the carried modules' own tests, each
from its folder on the package's copies); more sets as needed. A module's
tests stand on their own: nothing outside the module (a sources folder,
when needed, given as `SOURCES`).

## Running

`test/run.js` runs each test of the set as its own process
(`bare test/<name>/run.js`), in order. Exit: 0 all passed, 1 one failed,
2 no such set.
