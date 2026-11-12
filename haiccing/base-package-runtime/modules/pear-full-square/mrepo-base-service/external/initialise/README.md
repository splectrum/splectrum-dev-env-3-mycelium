# initialise

Moves the service from booted to initialised: the mrepo made ready.

Nothing more yet: the place for a type's own actions when it is made ready.

## Signature

`initialise(exec)`: requested as `service initialise /`.

## Returns

`{ service: "initialised" }`.

## Errors

Refused by the check unless the service is `booted`.
