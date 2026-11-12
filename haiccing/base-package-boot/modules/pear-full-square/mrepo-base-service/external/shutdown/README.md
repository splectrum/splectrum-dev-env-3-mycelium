# shutdown

Moves the service from initialised back to booted.

## Signature

`shutdown(exec)`: requested as `service shutdown /`.

## Returns

`{ service: "booted" }`.

## Errors

Refused by the check unless the service is `initialised`.
