# mycelium-repo-main

A running mycelium repository's main thread, always on: it holds the store
as its single writer, keeps the required watchers running, serves the local
connection to readers and submitters, and restarts what stops. Packaged as
`haiccing/base-package-mycelium`, installed by HAICC's boot into a level's
packages. Built step by step (phase 3, step 2).

- `index.js`: the library; `main.js`: the command line, the package's entry.
  `version` for now.
