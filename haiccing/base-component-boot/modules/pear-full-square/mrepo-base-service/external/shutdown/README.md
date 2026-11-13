# shutdown

Moves the service from initialised back to booted.

## Signature

`shutdown(exec)`: requested as `service shutdown /`.

## Returns

`{ service: "shut down", state: "booted" }`: what was done, and the state the
service is in now.

## Errors

Refused by the check unless the service is `initialised`.
