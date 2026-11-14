# base-package-service

The service protocol: it manages the service state of an mrepo's external API.

An mrepo that links it is service managed. Its state starts at `booted`;
`service/initialise` and `service/start` open its external API,
`service/stop` and `service/shutdown` close it again. Each action first
runs the hooks of its transition, then moves the state. The door is two
hooks: one on `start` that activates what sits behind it, one on `stop`
that deactivates it again.

| | |
|---|---|
| [mrepo/](mrepo/) | its part of the structure: the service state |
| [test/](test/) | its tests: its protocol as mounted, and the generic ones |
| [test-reports/](test-reports/) | the report of its last pre-release |
| [modules/](modules/) | its code, assembled: ours and the third-party code |

## States

| state | allowed |
|---|---|
| `booted` | `initialise` |
| `initialised` | `start`, `shutdown` |
| `started` | `stop`, and what its `start` hooks activated |

Each action answers what was done and the state the service is in now:
`service/stop` answers `{ "service": "stopped", "state": "initialised" }`.

## Package

- `protocol.js`: the `service` protocol, its config and its actions, from
  `mrepo-base-service`.
- `main.js`: the dispatcher, the bundle's main, generated.

Written from [splectrum/splectrum-dev-env-3-mycelium](https://github.com/splectrum/splectrum-dev-env-3-mycelium).
