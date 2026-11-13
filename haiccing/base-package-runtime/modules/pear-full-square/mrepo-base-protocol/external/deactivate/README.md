# deactivate

Makes an active protocol inactive again: requests from outside are no longer accepted for it.

The protocol stays loaded: the mrepo's own requests still reach it, and it
can be activated again.

## Signature

`deactivate(exec, { args })`: requested as `protocol/deactivate / <protocol>`.

## Arguments

1. The protocol's name. Required.

## Returns

`{ deactivated: "<protocol>" }`.

## Errors

- No name: `missing argument: protocol`.
- The protocol is not active: `not active: <name>`.

## Design

Its file is removed from the protocols layer. Run from a hook on the
service's `stop`, to close what `start` opened.
