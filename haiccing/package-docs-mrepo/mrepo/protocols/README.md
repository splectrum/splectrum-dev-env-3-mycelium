# /protocols

The mrepo's external API: the config of each protocol it offers, recorded by its runtime.

A protocol comes with the package that implements it. Linking the package
is all it takes: as the runtime starts it loads each linked package's
protocols, and records their configs here, one file a protocol. The layer
is atomic.

```
/protocols/<protocol>.json     the protocol's config: its package, its actions
```

## Protocols

| protocol | actions | from |
|---|---|---|
| `runtime` | `run`: a linked package's entry by path, its tests above all; `register`: the protocols loaded, recorded here | `base-package-runtime`: every mrepo |
| `help` | `get`: the help layer read by URI; `extract`: the help layer written | `base-package-runtime`, with `mrepo-base-help`: every mrepo |
| `service` | `initialise`, `start`, `stop`, `shutdown`: the service state moved | `base-package-service`: an mrepo that is service managed |
| `boot` | `deploy`, `teardown`, `redeploy` of a child mrepo, executed by the parent; gated | `base-package-boot`: an mrepo that deploys others |
| `haicc` | `goto`, its default action: the command that follows executed at a node position, or sent on at a shortcut | `base-package-haicc`: an mrepo addressed at a position, or passing commands on |

One package, one protocol, except the runtime's, which brings its own two.

## Config

```json
{
  "package": "haiccing/base-package-service",
  "description": "...",
  "actions": {
    "start": { "uris": ["/"], "states": ["initialised"], "description": "..." }
  }
}
```

- `uris`: where the action is offered: `/`, `/<name>` any one segment,
  `/main/**` everything below, `/**` anywhere.
- `states`: the service states that allow the action, for one that moves
  the state: the service's own.
- `default`, on the protocol: the action taken when a command names the
  protocol alone. `haicc` is `haicc/goto`.
- `gated`, on the protocol: it is behind the service's door, offered only
  once the service is started. Not gated: offered whatever the state.

## Gate

Where the mrepo is service managed, a request from the inbox is allowed
when its protocol is loaded, its action configured and its URI one the
config names. The service's door then closes a selection of protocols, not
all: a gated one waits for the service to be started; the others, such as
`runtime` and `help`, stay open, so a closed mrepo can still be inspected
and tested. The gate reads what the runtime loaded; this layer is its
record. Without a service there is no gate.

## Later

Local protocols, registered at the path of a `main` section and available
there and below only, are not built.
