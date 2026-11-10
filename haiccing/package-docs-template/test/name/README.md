# test/<name>/

One test: a structure unit, as the package is, with what it needs. At
least its entry, `run.js`, run on its own: `bare test/<name>/run.js`. Its
exit code is its outcome.

It uses the package's own `modules/`, by relative path (no node_modules
above it): `../../modules/node_modules/brittle/index.js`.
