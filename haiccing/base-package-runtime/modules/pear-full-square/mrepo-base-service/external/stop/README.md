# stop

Moves the service from started back to initialised: the external API closed.

## Signature

`stop(exec)`: requested as `service stop /`.

## Returns

`{ service: "initialised" }`.

## Errors

Refused by the check unless the service is `started`.
