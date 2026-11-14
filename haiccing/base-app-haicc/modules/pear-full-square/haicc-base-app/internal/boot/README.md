# boot

The machine level, above the root mrepo: the root deployed and torn down.

`deploy` and `teardown`, with `MACHINE` naming them by protocol and
action: `haicc boot/deploy`, `haicc boot/teardown`.

## Signature

- `deploy({ home, work, bare, org, boot, stdio })`
- `teardown({ work, root })`

`home` is haicc's own folder, `work` the work folder, `root` the root
mrepo's folder, `bare` the Bare to run with, `org` and `boot` the boot
component's organisation and name.

## Returns

- `deploy`: the boot's exit code. What the boot prints goes straight
  through: its request, completed, then its runtime's status.
- `teardown`: `{ tornDown: '/', runtimes, work }`, with the number of
  runtimes stopped.

## Errors

- `deploy`: no source holds the boot component's bundle: a `Failure`,
  exit code 3.
- `teardown`: no boot mrepo there: exit code 3. A runtime did not stop:
  exit code 1.

## Design

- **deploy** runs the boot component's bundle, from the first folder
  that holds it, with the Bare given, the work folder and every source
  registered. The boot builds the root mrepo the first time and starts
  its runtime; there already, it is kept.
- **teardown** stops every runtime from the root down, those deployed
  below an mrepo before the mrepo itself, each asked over its socket and
  waited for until its process has ended. Then it removes what the deploy
  put in place, by name: the mrepos, the package store, the work folder's
  setting. Nothing else in the work folder is touched.
