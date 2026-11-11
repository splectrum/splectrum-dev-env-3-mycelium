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

## The folders

| | |
|---|---|
| [lib/](lib/) | its parts, a file each |
| [test/](test/) | its tests, what each checks |

## Tests

- `npm test`: the unit tests

The action's context (`exec`): `read`, `select` (overlaid: a target read
from its execution branch), `put`, `remove` (collected), `runtime` (the
runtime's context, read only: its name, its work folder, its directory). Two contexts:
local, the action's: `commit()` (the writes so far committed to the
execution branches; later reads see them), `discard()` (the uncommitted writes
dropped), `rollback()` (the last local commit undone), `log(level, event, data)`
(an entry in the request's own record, at or above the mrepo's threshold:
`/runtime/log.json`'s level, else `info`), `reset()` (everything of this execution
ditched, back to the start), the action going on; global, the runtime's,
not the action's: when the action ends, its writes committed and the
execution branches merged back, once; a failure resets.
