# mrepo-base-service

The mrepo service protocol: the service state of an mrepo's external API, and the actions that move it.

The state is in the runtime layer, `/runtime/service.json`. An mrepo that
has it is service managed: a protocol behind the service's door, `gated`
in its config, is offered to the outside only once the service is started,
and each service action only in the states its config names. Offered by `haiccing/base-package-service`.

| | |
|---|---|
| [external/](external/) | the service protocol's actions |
| [test/](test/) | its tests |

## States

`booted` → `initialise` → `initialised` → `start` → `started`; back with
`stop` and `shutdown`.

## Config

`CONFIG`, in `internal/state.js`: each action at `/`, with the states that
allow it. The runtime's check reads it: the state machine is configuration,
not code.

## Tests

- `npm test`: the actions on a context written for it, the config.
