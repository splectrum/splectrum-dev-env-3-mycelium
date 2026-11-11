# package-docs-template

The haiccing package structure, documented. Each folder here is a part
of a structure unit; its README says what goes there.

## A structure unit

A folder, at any level: a package, a further unit inside it, a test, an
example. Every part is optional; a part present gives the unit what it
is for.

| part | the unit then |
|---|---|
| `run.js` | can be executed on its own: `bare run.js [arguments]` |
| `main.js` | its dispatcher, the bundle's main (generated): `run(target, { dryRun })`, every entry by path (`/run`, `/protocol`, `/deploy`, the tests: [test/](test/)); as the program, the target named, else `/run`; imported, nothing runs |
| `deploy.js` | brings structure beyond its protocols: its part of the mrepo and its requirements, to the parent's `boot deploy` |
| `protocol.js` | provides protocols: their configs and actions; linked into an mrepo, its protocols are registered, the actions loaded by the runtime |
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

- One structure, many purposes: a definition, documentation in place,
  examples, tests.
- A package depends only on packages.
- Entry points, each optional: `run.js` (executed on its own),
  `deploy.js` (deployment only), `protocol.js` (protocol actions).
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

A package is released as one bundle, its main the dispatcher (`main.js`),
and run with Bare:

```sh
bare <package>.bundle [arguments]
```

A target first runs that entry (`bare <package>.bundle /test/validate`).
From its folder, the same: `bare main.js [target] [arguments]`. Imported, a
bundle runs nothing: a runtime takes its protocols (`run('/protocol')`), a
deploy its structure (`mrepo/`, read from the bundle).

The boot is the exception: released as a standalone executable, one per
platform, Bare built in, so nothing is needed before it. It uses an
installed Bare at its pinned major (the same version or newer), else puts
its own in place, then starts the boot mrepo's runtime.

```sh
./base-package-boot --work=<folder> --sources=folder:<sources> [--yes]
```

Written from [splectrum/splectrum-dev-env-3-mycelium](https://github.com/splectrum/splectrum-dev-env-3-mycelium).
