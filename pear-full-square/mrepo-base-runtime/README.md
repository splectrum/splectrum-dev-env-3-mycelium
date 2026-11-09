# mrepo-base-runtime

A running mycelium repository's runtime, always on: the framework that runs
the repository's protocols (request, execute, log: `docs/design/repositories.md`).
It holds the store as its single writer, keeps the required watchers
running, serves the local connection, and restarts what stops. The base
variant: a simple implementation. Packaged as `haiccing/base-package-mrepo`,
installed by HAICC's boot into the host's packages. Built step by step
(phase 3, step 2).

- `index.js`: the library; `runtime.js`: the command line, the package's
  entry (`start --work=<folder>`, `version`).
- `lib/boxes.js`: the host's inbox and outbox, the local dispatcher;
  `lib/view.js`: a repository's folder, `<work>/mrepos/<name>/`.

## Tests

- `npm test`: the unit tests
