# start/

The runtime as an mrepo's process, end to end, in a temporary folder removed after.

Entry: `run.js`; the test: `start.test.js`.

## Steps

- An mrepo written from the runtime package's part of the structure
  alone: its layers on the filesystem storage, its boot hooks, no package
  linked.
- The runtime started (`bare run.js --work=<folder>`; `RUNTIME`: a bundle
  to test instead, the release check): running, its status over its local
  connection.
- Its boot hooks placed as its own requests as it started, each done
  before anything is taken in. With no package linked, the protocols they
  name are not there, and each says so: nothing is active.
- A request posted through its inbox folder, for a protocol that is
  loaded and not active: refused. For one it does not have: refused, said
  with the active ones.
- Asked to stop: its process ends.

Leaves nothing running.
