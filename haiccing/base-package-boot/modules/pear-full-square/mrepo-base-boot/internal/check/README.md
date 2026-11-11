# check

Checks an mrepo's prerequisites in order, before anything is written, fixing one only with a yes.

## Signature

`check(list, ctx)`

- `list`: `[{ check, when, fix, ... }]`, from the package's
  `prerequisites.json`.
- `ctx`: `{ work, name, sources, bare: { version, integrity }, path, yes,
  ask }`.

## Returns

`{ ok, results: [{ check, ok, value | missing, fixed, skipped }] }`. It
stops at the first that fails and is not fixed.

## Checks

- `platform`: this machine's, among `platforms`.
- `work`: writable, not the filesystem's root, no other mrepo there.
- `sources`: each reachable.
- `bare`: the one recorded in `<work>/bare.json`; else the pinned one put
  in place before; else one installed on `path` at the pinned major, the
  same version or newer. Fix: the pinned Bare from the sources, checked by
  its sha512.
- `docker`: installed, running, rootful, native, the user in its group.

A condition, `when: "not-in-container"`, skips a check in a container.

## Also exported

`BARE_ORG`, the organisation Bare's tarball is under in a sources folder,
and `TARBALL(version)`, its file name.
