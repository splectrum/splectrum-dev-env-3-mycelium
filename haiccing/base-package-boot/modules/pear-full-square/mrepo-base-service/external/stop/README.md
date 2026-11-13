# stop

Moves the service from started back to initialised: the external API closed.

## Signature

`stop(exec)`: requested as `service stop /`.

## Returns

`{ service: "stopped", state: "initialised" }`: what was done, and the state the
service is in now.

## Errors

Refused by the check unless the service is `started`.
