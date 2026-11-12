# base-package-service

The service protocol: it manages the service state of an mrepo's external API.

An mrepo that links it is service managed. Its state starts at `booted`;
`service initialise /` and `service start /` open its external API,
`service stop /` and `service shutdown /` close it again. The door closes
a selection of protocols, not all: those whose config says `gated` wait
for the service to be started; the others stay open. An mrepo without the
service, such as the boot mrepo, has no gate.

| | |
|---|---|
| [mrepo/](mrepo/) | its part of the structure: the service state |
| [test/](test/) | its tests |
| [modules/](modules/) | its code, assembled: ours and the third-party code |

## States

| state | allowed |
|---|---|
| `booted` | `initialise` |
| `initialised` | `start`, `shutdown` |
| `started` | `stop`, and the gated protocols |

## Package

- `protocol.js`: the `service` protocol, its config and its actions, from
  `mrepo-base-service`.
- `main.js`: the dispatcher, the bundle's main, generated.

Written from [splectrum/splectrum-dev-env-3-mycelium](https://github.com/splectrum/splectrum-dev-env-3-mycelium).
