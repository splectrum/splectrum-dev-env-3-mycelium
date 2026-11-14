# test/mounted/

The package's own test: its protocol as it is mounted, its state and its hooks, without an mrepo.

The package's `protocol.js` is what a runtime loads. It is loaded here
and checked with what the package's structure brings; each action is run
on a minimal execution in memory, over the package's own state file and
hooks.

## What it checks

- **What it provides**: one protocol, `service`, with a function for
  every action configured and no other.
- **Its config, value by value**: the four actions at the mrepo itself,
  each in the states that allow it; no argument, no target, no default.
- **Its config in effect**: a request checked on each state: allowed
  only where the action names the state, refused with the state it is in;
  not offered anywhere but the mrepo itself; refused when not activated.
- **Its structure**: the state an mrepo that links it starts in,
  `booted`; its list of packages, itself last.
- **Its hooks, file by file**: at boot `help`, `runtime` and `service`
  activated; on `initialise` the help extracted; none on the other
  transitions. A hook file that is not named in the test fails it.
- **Its actions**: `initialise` runs the package's own hook first, as the
  mrepo's own, then moves the state; `start`, `stop` and `shutdown` move
  it; hooks a defining package drops in run on their own transition, in
  name order; a hook that fails leaves the state where it was.
- **Nothing forgotten**: the last test fails when the config names an
  action that was not run here.

## Not here

The service in a running mrepo: its actions requested through the inbox,
the door it opens and closes for the other protocols, a failing hook's
writes rolled back by the execution. That needs a test mrepo; until this
package has one, it is covered by the boot component's test and the
`haicc` command's.
