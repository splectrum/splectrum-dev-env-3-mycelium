# mrepo-base-execute

The mrepo execute protocol: it runs the request in `request/execute` and
merges its changes back.

An action runs on the request's own execution branches,
`execute/<key>/<target>`, inside an execution context: it reads the targets
overlaid and writes only those branches. It may commit locally as it goes. When it ends, each
branch is merged back into its target; a failure resets instead. The runtime,
`mrepo-base-runtime`, runs it, with the actions the mrepo's packages offer.

| | |
|---|---|
| [lib/](lib/) | its parts, a file each |
| [test/](test/) | its tests, what each checks |

## Design

- **Request branches**: each made from its target's head when the request
  first writes there; merged back and removed at its end, discarded on a
  failure. Nothing shared between requests: a waiting one keeps its own.
- **A wrapped remote command** (`lib/remote.js`): a request whose URI leads
  into a child mrepo (`/main/<name>/...`, its record at `/main/<name>.json`)
  is passed on whole to the child's inbox folder; its execution ends
  waiting, its record in `request/execute` with its remote state, its
  branch kept. Completed here once the request protocol has added the
  response in.

The mrepo execute protocol, base variant: a request in `request/execute`
executed in execution
branches made from their targets (`execute/main`, `execute/runtime`,
`execute/request/execute`), its action run inside the execution context
(read-only to it: the targets read overlaid, the execution branches written,
the runtime's context read through `exec.runtime`), its record completed,
each branch merged back into its own target. `executed(ctx, name, record)`
hands over a form completed elsewhere the same way (the boot's own request).
Run by the repository's runtime
(`mrepo-base-runtime`). `lib/actions.js` holds the generic `rest` actions
(get, put, delete), not mounted by a package yet: the tests use them. An
action writes the targets the mrepo has: `main`, `runtime`, `help`,
`protocols`.

## Tests

- `npm test`: the unit tests

The action's context (`exec`): `read`, `select` (overlaid: a target read
from its execution branch), `put`, `remove` (collected), `runtime` (the
runtime's context, read only: its name, its work folder, its directory). Two
contexts:
local, the action's: `commit()` (the writes so far committed to the
execution branches; later reads see them), `discard()` (the uncommitted writes
dropped), `rollback()` (the last local commit undone), `log(level, event, data)`
(an entry in the request's own record, at or above the mrepo's threshold:
`/runtime/log.json`'s level, else `info`), `reset()` (everything of this
execution
ditched, back to the start), the action going on; global, the runtime's,
not the action's: when the action ends, its writes committed and the
execution branches merged back, once; a failure resets.
