# pkgm-base-check

The checks a package runs on itself: its code, the integrity of its mrepo side, and its own structure.

Every package carrying it gets four units from its dispatcher: `/test/code`,
`/test/mrepo` and `/test/package` in its `validate`, `/test/mrepo-in-situ`
in its `validate-in-situ`. In the development repository,
`tools/code-check.js` runs the code rules over all the carried modules and
the package check over every package.

| | |
|---|---|
| [internal/](internal/) | the rules and the checks |
| [validate/](validate/) | the tests every package carrying it runs on itself |
| [test/](test/) | its own tests |

## Rules

The code rules:

- **Structure**: a method directory, `external/<name>/` or
  `internal/<name>/`, has its `index.js` and its `README.md`.
- **Imports**: a relative import stays inside its module; another of our
  modules is imported by its name, never into its files. A test may share
  another module's test helpers by name, `<module>/test/<file>`.
- **No transient references**: nothing points at the development
  repository's `docs/` or `steps/`.

The mrepo side:

- **Structure**: every leaf of `mrepo/` has a valid `layer.json`, with its
  mode and description; no README inside a layer; a file in a folder
  without a `layer.json` contributes to a layer another package defines;
  a preloaded request is a well formed record; the packages are listed by
  name.
- **Protocol**: every action its `protocol.js` configures has its
  function, and the other way round; each has its description and URIs.
  Every action is a documented method: the function mounted is the one
  `external/<action>/` of a carried module exports, and its README states
  its signature, what it returns, its errors, and its arguments where the
  config names any.
- **Carried**: no third-party module is carried that its record does not
  name, each at its recorded version; an omitted one is only its stub.
- **In situ**: the package is in the mrepo's packages manifest, its bundle
  there is the one the manifest names, and the layers it brings or
  contributes to exist.

The package itself:

- **Files**: its README, its LICENSE, its `package.json`, the folder its
  test report goes in.
- **Its pin**: the commit of the package template it was brought to.
- **Sets**: `validate`, `validate-in-situ` and `full`, the generic tests
  in the sets they belong to.
- **A folder for every test**: each test a set names, the generic ones
  too, is `test/<name>/` with its `run.js` and README.
- **Its own tests**: at least one, always; their names are the
  package's. Where nothing is specific to the package, a dummy that says
  so, an explicit decision.

## Tests

- `npm test`: packages and modules written for it, well formed and broken.
