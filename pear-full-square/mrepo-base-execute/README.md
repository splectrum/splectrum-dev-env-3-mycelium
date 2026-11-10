# mrepo-base-execute

The mrepo execute protocol, base variant (`docs/design/repositories.md`, "A
running repository"): a request in `request/execute` executed in execution
branches made from their targets (`execute/main`, `execute/runtime`,
`execute/request/execute`), its action reading the targets overlaid and
writing the execution branches, its record completed, each branch merged
back into its own target. Run by the repository's runtime
(`mrepo-base-runtime`). The base's actions are the framework's generic ones
(`rest`: get, put, delete; `service`: initialise, start, stop, shutdown).

## Tests

- `npm test`: the unit tests
