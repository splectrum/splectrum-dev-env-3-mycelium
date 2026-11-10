# mrepo-base-execute

The mrepo execute protocol, base variant (`docs/design/repositories.md`, "A
running repository"): a request in `request/execute` executed in execution
branches made from their targets (`execute/main`, `execute/runtime`,
`execute/request/execute`), its action run inside the execution context
(read-only to it: the targets read overlaid, the execution branches written,
the runtime's context read through `exec.runtime`), its record completed,
each branch merged back into its own target. `executed(ctx, name, record)`
hands over a form completed elsewhere the same way (the boot's own request). Run by the repository's runtime
(`mrepo-base-runtime`). The base's actions are the framework's generic ones
(`rest`: get, put, delete; `service`: initialise, start, stop, shutdown).

## Tests

- `npm test`: the unit tests
