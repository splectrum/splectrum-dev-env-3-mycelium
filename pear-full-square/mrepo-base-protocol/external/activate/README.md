# activate

Makes a loaded protocol active: requests from outside are accepted for it.

Nothing is active by default. A protocol is loaded by the runtime at boot
when its package is linked; it is open to the outside only once it is
active. Activating one that is active already writes its config again and
changes nothing else.

## Signature

`activate(exec, { args })`: requested as `protocol/activate / <protocol>`.

## Arguments

1. The protocol's name. Required.

## Returns

`{ activated: "<protocol>" }`.

## Errors

- No name: `missing argument: protocol`.
- The protocol is not loaded: `no protocol: <name>`, with those that are.

## Design

- **The active set is the protocols layer**: one file a protocol,
  `/protocols/<protocol>.json`, holding its config as the runtime loaded
  it. The gate reads which files are there.
- **Run from hooks**: at boot, to open what an mrepo always offers; on the
  service's `start`, to open what sits behind its door.
