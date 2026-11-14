# start

Moves the service from initialised to started: the external API open.

## Signature

`start(exec)`: requested as `service/start`.

## Returns

`{ service: "started", state: "started" }`: what was done, and the state the
service is in now.

## Errors

Refused by the check unless the service is `initialised`.
