# package-docs-template

The haiccing package structure, documented. Each folder here is a part
of a structure unit; its README says what goes there.

## A structure unit

A folder, at any level: a package, a further unit inside it, a test, an
example. Every part is optional; a part present gives the unit what it
is for.

| part | the unit then |
|---|---|
| `run.js` | can be executed: `bare run.js [arguments]` |
| `modules/`, `package.json` | carries its own dependencies |
| `mrepo/` | comes with an mrepo, by layers |
| `test/` | has tests and test sets |
| `<name>/` | holds a further unit, by its URI part name |
| `example/` | has examples |
| `README.md` | says what it is |

| | |
|---|---|
| [mrepo/](mrepo/) | an mrepo's definition, by layers |
| [test/](test/) | tests, a folder each, and the sets |
| [name/](name/) | a further unit |
| [example/](example/) | examples, a folder each |
| [modules/](modules/) | a unit's dependencies |

## The rules

- A package depends only on packages.
- A unit's entry is `run.js`.
- A collection folder (`test/`, `example/`) holds units, a folder each;
  it is not a unit itself.
- Examples in `example/<name>/`, never a reference to another package.
- No install code in a unit: building an mrepo is the framework's.
- What a person reads is what the repository will hold: expanded folders,
  carried in the package's bundle and read from it by path.
- `modules/` is assembled, never edited by hand.

## package.json

```json
{
  "name": "base-package-example",
  "description": "An example package.",
  "private": true,
  "license": "MIT",
  "type": "module",
  "main": "run.js",
  "modules": ["<org>/<module>"],
  "scripts": { "test": "bare test/run.js" }
}
```

`modules`: our modules the unit starts from; what they use is worked out
from them ([modules/](modules/)).

## Running

A package is released as one bundle and run with Bare:

```sh
bare <package>.bundle --work=<folder>
```

From its folder, the same: `bare run.js --work=<folder>`.

Written from [splectrum/splectrum-dev-env-3-mycelium](https://github.com/splectrum/splectrum-dev-env-3-mycelium).
