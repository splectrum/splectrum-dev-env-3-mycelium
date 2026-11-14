# /runtime

The runtime's data: the mrepo's identity, its hooks, and the service state where it has a service.

The layer is atomic. Its identity is written when the mrepo is deployed.
Its hooks and its service state are its runtime config: dropped in by the
package that defines the mrepo, the last of its list.

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

## Hooks

The commands the mrepo runs on a status transition: files, one folder a
transition, each holding one command, its parts.

```
/runtime/hooks/boot/activate-help.json        ["protocol/activate", ".", "help"]
/runtime/hooks/initialise/help-extract.json   ["help/extract"]
/runtime/hooks/start/activate-boot.json       ["protocol/activate", ".", "boot"]
/runtime/hooks/stop/deactivate-boot.json      ["protocol/deactivate", ".", "boot"]
```

- `boot`: fired by the runtime as it starts, every time. Each hook is
  placed as a request of the mrepo's own, in name order; nothing is taken
  from the inbox until they are done.
- `initialise`, `start`, `stop`, `shutdown`: fired by the service. The
  action runs its transition's hooks in its own execution, then moves the
  state. A hook that fails fails the transition, and nothing of it stays.
- No config is written or merged: a file there is a hook. Only the
  package that defines the mrepo drops them in.
- Hooks run as the mrepo's own: not held at the door.

## Process

The runtime is a process, one an mrepo, started from the mrepo's own
`packages/` by its folder (`bare <dir>/packages/haiccing/
base-package-runtime.bundle <dir>`): it holds the store as its single
writer, serves a local connection (`<dir>/runtime.sock`: `status`, `stop`;
a short path in the temporary folder when that one is too long), loads
every protocol its linked packages offer, fires its `boot` hooks, and runs
the requests in turn. It names no protocol itself.

It runs until it is stopped: a parent's teardown stops its child's.
