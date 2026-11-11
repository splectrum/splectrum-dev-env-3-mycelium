# /runtime

The runtime's data. Atomic.

- `service.json`: the service state.

The service states and what each allows:

| state | allowed |
|---|---|
| booted | `initialise`, `teardown` |
| initialised | `start`, `shutdown` |
| started | the external API, `stop`, `pause` |
| paused | `resume`, `stop` |

The runtime is a process, alive while the service is: it holds the
store as its single writer, serves a local connection
(`<work>/runtime.sock`: `status`, `stop`), and runs the protocols in turn.
Once shut down with nothing waiting, it ends.
