# test/mounted/

The package's own test: its protocol as it is mounted, without an mrepo.

The package's `protocol.js` is what a runtime loads. It is loaded here
and checked; its action is run on a minimal execution in memory, which
keeps what is executed here and what is sent on.

## What it checks

- **What it provides**: one protocol, `haicc`, with a function for every
  action configured and no other.
- **Its config, value by value**: `goto`, the default action, at any
  position, its one argument the command that follows; no state, no
  target: it is not behind the service's door.
- **`goto` at the root**: the command that follows executed here, once,
  as it was given, its value returned.
- **`goto` at a shortcut**: the command sent on, unchanged, to the mrepo
  linked there, its folder in the shadow of `main`; nothing executed
  here. A command that is itself a `haicc` goes on as it is: they chain.
- **What it refuses**: no command, a position inside `main` other than
  the root, a URI through a shortcut with the way across named, a URI
  that is not canonical. A refusal executes and sends nothing.
- **Nothing forgotten**: the last test fails when the config names an
  action that was not run here.

## Not here

A command as it is typed, `haicc` alone taken as `haicc/goto`: that is
the runtime's interpreting of a request. And a command really carried
through shortcuts between running mrepos, its response returned. Both
need a test mrepo; until this package has one, they are covered by the
boot component's test and the `haicc` command's.
