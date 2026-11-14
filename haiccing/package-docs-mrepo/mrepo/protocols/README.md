# /protocols

The mrepo's external API: the protocols that are active, one file a protocol, holding its config.

A protocol comes with the package that implements it, and every linked
package's protocols are loaded as the runtime starts. Loaded is not
offered: a request from outside is accepted only for a protocol that is
active, and nothing is active by default. This layer is the active set.
`protocol/activate` writes a protocol's file here, `protocol/deactivate`
removes it; the hooks of the mrepo's status transitions call them. The
layer is atomic.

```
/protocols/<protocol>.json     an active protocol's config: its package, its actions
```

## Protocols

| protocol | actions | from |
|---|---|---|
| `runtime` | `run`: a linked package's entry by path, its tests above all | `base-package-runtime`: every mrepo |
| `protocol` | `activate`, `deactivate`: a loaded protocol opened to the outside, or closed | `base-package-protocol`: an mrepo that offers anything |
| `help` | `get`: the help layer read by URI; `extract`: the help layer written | `base-package-help`: an mrepo that has help |
| `service` | `initialise`, `start`, `stop`, `shutdown`: the service state moved, each firing its hooks | `base-package-service`: an mrepo that is service managed |
| `boot` | `deploy`, `teardown`, `redeploy` of a child mrepo, executed by the parent | `base-package-boot`: an mrepo that deploys others |
| `haicc` | `goto`, its default action: the command that follows executed at a node position, or sent on at a shortcut | `base-package-haicc`: an mrepo addressed at a position, or passing commands on |

One package, one protocol.

## Config

```json
{
  "package": "haiccing/base-package-service",
  "description": "...",
  "actions": {
    "start": { "uris": ["."], "states": ["initialised"], "description": "..." },
    "deploy": { "uris": ["<name>"], "target": true, "args": ["package"], "description": "..." }
  }
}
```

- `uris`: where the action is offered, written as the outside writes a
  URI, standing at `main`: `.` the mrepo itself, `<name>` any one
  segment, `swarms/**` everything below, `**` anywhere.
- `target`: the action needs a target. `.` is the mrepo itself, which one
  cannot deploy or tear down; a URI left out is `.`. Without one:
  `missing argument: target`.
- `args`: the action's arguments by name, in order; one ending in `?` is
  optional. One not given: `missing argument: <name>`.
- `states`: the service states that allow the action, for one that moves
  the state: the service's own.
- `default`, on the protocol: the action taken when a command names the
  protocol alone. `haicc` is `haicc/goto`.

## Gate

A request from the inbox is allowed when its protocol is loaded, its
action configured, what the action needs given, and its URI one the config
names; and, as it executes, when its protocol is active and, for an action
that names its states, the service is in one of them. What is not there is
said with what is. The mrepo's own requests, its hooks among them, are not
asked whether a protocol is active.

## Hooks

When a protocol is active is decided by hooks, files the package that
defines the mrepo drops into its runtime layer (`/runtime`):

- at `boot`: what the mrepo always offers. An mrepo without a service
  offers everything it does this way.
- at the service's `start` and `stop`: what sits behind its door.

So a closed mrepo can still be inspected and tested: `runtime` and `help`
are activated at boot. The `protocol` protocol itself is not activated:
opening and closing is the hooks' business, not a request from outside.

## Later

Local protocols, registered at the path of a `main` section and available
there and below only, are not built.
