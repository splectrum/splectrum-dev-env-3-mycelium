# teardown

Stops a child mrepo's runtime and removes the child and its shortcut.

The runtime is asked to stop over its socket; still running, it gets
SIGTERM, then SIGKILL, each waited for until the process has ended. How
it stopped is logged.

## Signature

`teardown(exec, { uri })`: requested as `boot/teardown <name>`. `uri`
is `["main", "<name>"]`.

## Returns

`{ tornDown }`: the position as written at `main`, `<name>`.

## Errors

- No target, `main` itself or the root: `missing argument: target`.
- The child is not deployed; or the position exists locally, which the
  boot protocol cannot target.
- Its runtime does not stop.

## Design

The folder's removal is outside the repository: a reset does not undo it.
