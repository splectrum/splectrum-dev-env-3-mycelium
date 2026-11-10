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
- One poller fires the protocols in turn over their data states: the
  outbox dispatched, the request protocol (`mrepo-base-request`), the
  execute protocol (`mrepo-base-execute`). Once the service is shut down
  (booted, nothing waiting) the runtime ends; a request posted later starts
  it again (HAICC's input does).
- `test/fixture.js`: a booted host, for the tests.

## Tests

- `npm test`: the unit tests
