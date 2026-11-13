# test/mounted/

The package's own test: its protocol as it is mounted, without an mrepo.

The package's `protocol.js` is what a runtime loads. It is loaded here
and checked: what it provides, its config, and each action run on a
minimal execution in memory.

## What it checks

- **What it provides**: one protocol, `protocol`, with a function for
  every action configured and no other.
- **Its config, value by value**: the package that brings it; both
  actions at the mrepo itself, each taking one argument, the protocol's
  name; no default action, no state, no target.
- **Its actions**: what `activate` writes into the protocols layer and
  what `deactivate` removes, what each returns, each refusal, and that a
  refusal writes nothing.
- **Nothing forgotten**: the last test fails when the config names an
  action that was not run here.

## Not here

The protocol in a running mrepo: its actions requested through the inbox,
fired by hooks at boot and on the service's transitions, and the gate
that refuses a request for a protocol that is not active. That needs a
test mrepo; until this package has one, it is covered by the boot
component's test.
