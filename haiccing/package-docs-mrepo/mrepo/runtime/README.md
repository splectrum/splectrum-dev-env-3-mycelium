# /runtime

The runtime's data: the service state, in `service.json`.

The layer is atomic. Its data gates the protocols where the mrepo has a
service.

## Service states

The service states and what each allows:

| state | allowed |
|---|---|
| booted | `initialise`, `teardown` |
| initialised | `start`, `shutdown` |
| started | the external API, `stop`, `pause` |
| paused | `resume`, `stop` |

## Process

The runtime is a process, one an mrepo, started from the mrepo's own
`packages/` by its folder (`bare <dir>/packages/haiccing/
base-package-runtime.bundle <dir>`): it holds the store as its single
writer, serves a local connection (`<dir>/runtime.sock`: `status`, `stop`;
a short path in the temporary folder when that one is too long), loads the
protocols its linked packages offer, and runs them in turn.

The service state gates the protocols only where the mrepo has `service`;
without it (the boot mrepo) there is no gate and the runtime runs until
stopped. With it, once shut down with nothing waiting, it ends.
