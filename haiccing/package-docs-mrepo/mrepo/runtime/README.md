# /runtime

The runtime's data: the mrepo's identity, in `mrepo.json`, and the service state, in `service.json`.

The layer is atomic. Its data gates the protocols where the mrepo has a
service.

## Identity

`mrepo.json` holds the mrepo's unique URI, `{ "uri": "local/host" }`:
`<swarm>/<node>`, with `local` as the swarm of what the boot mrepo creates.
It is written when the mrepo is deployed. The runtime addresses the mrepo
by it: its inbox is `/<uri>/inbox`. Without one, the mrepo's name is used.

## Service states

The service states and what each allows:

| state | allowed |
|---|---|
| booted | `initialise` |
| initialised | `start`, `shutdown` |
| started | `stop`, and the protocols behind the service's door |

The state comes with `base-package-service`; its actions and the states
that allow each are that protocol's config.

## Process

The runtime is a process, one an mrepo, started from the mrepo's own
`packages/` by its folder (`bare <dir>/packages/haiccing/
base-package-runtime.bundle <dir>`): it holds the store as its single
writer, serves a local connection (`<dir>/runtime.sock`: `status`, `stop`;
a short path in the temporary folder when that one is too long), loads the
protocols its linked packages offer, and runs them in turn.

The service state gates the protocols only where the mrepo has `service`;
without it (the boot mrepo) there is no gate. Either way the runtime runs
until it is stopped: a parent's teardown stops its child's.
