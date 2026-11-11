# pkgm-base-check

The code rules, checked on a package's modules and its own code.

Every package carrying it runs `/test/code` in its `validate`: each module
of ours it carries, and its own entry points, against the rules. In the
development repository, `tools/code-check.js` runs the same rules over all
the carried modules.

| | |
|---|---|
| [internal/](internal/) | the rules |
| [validate/](validate/) | the test every package carrying it runs on itself |
| [test/](test/) | its own tests |

## Rules

- **Structure**: a method directory, `external/<name>/` or
  `internal/<name>/`, has its `index.js` and its `README.md`.
- **Imports**: a relative import stays inside its module; another of our
  modules is imported by its name, never into its files. A test may share
  another module's test helpers by name, `<module>/test/<file>`.
- **No transient references**: nothing points at the development
  repository's `docs/` or `steps/`.

## Tests

- `npm test`: a module that keeps the rules, one that breaks each.
