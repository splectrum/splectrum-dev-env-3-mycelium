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

- **Request branches**: a request is processed on its own,
  `execute/<key>/<target>`. Its branch of `request/execute` holds its
  principal, begun there by the request protocol, and only ever adds; the
  others are made as the request first writes a target. Merged back and
  removed at its end, discarded on a failure. No history kept in them.
- **A command sent on** (`exec.forward(to, command)`, `lib/remote.js`): an
  action that finds its position a shortcut sends the command that follows
  to the mrepo linked there, unchanged, into its inbox folder. Nothing of
  the request is executed here; its processing ends: what it waits for
  (`remote`) is added to its principal. A request branch not being
  processed has a waiting principal. Once the request protocol has added
  the other mrepo's response to the branch, the principal is returned with
  it here.
- **What is not there is said with what is**: `no protocol: <name>`, with
  the mrepo's protocols; `no action: <protocol> <action>`, with the
  protocol's actions.
- **A command executed here** (`exec.run(command)`): its parts
  interpreted, checked as the request itself is, its action run in the
  same execution; its value returned.

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
`protocols`, `xpath`.

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
