# mrepo-base-service

The mrepo service protocol: the service state of an mrepo's external API, and the actions that move it.

The state is in the runtime layer, `/runtime/service.json`. An mrepo that
has it is service managed. Each action is allowed only in the states its
config names; it runs the hooks of its transition, the commands in
`/runtime/hooks/<transition>/`, in its own execution, then moves the state.
A hook that fails fails the transition. Offered by
`haiccing/base-package-service`.

| | |
|---|---|
| [external/](external/) | the service protocol's actions |
| [test/](test/) | its tests |

## States

`booted` → `initialise` → `initialised` → `start` → `started`; back with
`stop` and `shutdown`.

## Hooks

`transition(exec, name, state, done)`, in `internal/state.js`: the hooks
of `initialise`, `start`, `stop` and `shutdown`, each run with
`exec.run(command, { own: true })`, as the mrepo's own, and logged in the
request. What the door opens and closes is two of them: a `start` hook
that activates a protocol, a `stop` hook that deactivates it.

## Answers

Each action answers what was done and the state now: `{ service, state }`.
`stop` answers `stopped` with the state `initialised`; `shutdown` answers
`shut down` with the state `booted`.

## Config

`CONFIG`, in `internal/state.js`: each action at the mrepo itself, `.`, with the states that
allow it. The runtime's check reads it: the state machine is configuration,
not code.

## Tests

- `npm test`: the actions on a context written for it, the config.
