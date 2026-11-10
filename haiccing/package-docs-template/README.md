# package-docs-template

The haiccing package structure, documented. Each folder here is a level of
a package; its README says what goes there.

```
<package>/
  README.md        the package: what it is, how to run it
  package.json     its name, entry, modules
  run.js           its entry: bare run.js [arguments]
  mrepo/           its mrepo, by layers
  test/            its tests and test sets
  <name>/          a further unit (another mrepo), by its URI part name
  modules/         its code, assembled, once at the top
```

| level | |
|---|---|
| [mrepo/](mrepo/) | an mrepo's definition, by layers |
| [test/](test/) | tests, a folder each, and the sets |
| [unit/](unit/) | a further unit, the same structure again |
| [modules/](modules/) | the code the package carries |

The example: [haiccing/base-package-boot](https://github.com/haiccing/base-package-boot).

## The rules

- A package depends only on packages.
- A structure unit is the same at every level: a package, an mrepo inside
  it, a test. Each part is optional.
- Every unit's entry is `run.js`.
- No install code in a unit: building an mrepo is the framework's.
- What a person reads is what the repository will hold: expanded folders,
  carried in the package's bundle and read from it by path.
- `modules/` is assembled, never edited by hand.

## package.json

```json
{
  "name": "base-package-boot",
  "description": "HAICC's boot.",
  "private": true,
  "license": "MIT",
  "type": "module",
  "main": "run.js",
  "modules": ["pear-full-square/mrepo-base-runtime"],
  "scripts": { "test": "bare test/run.js" }
}
```

`modules`: our modules the package starts from; what they use is worked
out from them ([modules/](modules/)).

## Running

A package is released as one bundle and run with Bare:

```sh
bare <package>.bundle --work=<folder>
```

From its folder, the same: `bare run.js --work=<folder>`.

Written from [splectrum/splectrum-dev-env-3-mycelium](https://github.com/splectrum/splectrum-dev-env-3-mycelium).
