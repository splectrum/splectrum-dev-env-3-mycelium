# start/

The runtime as an mrepo's process, end to end, in a temporary folder removed after.

Entry: `run.js`; the test: `start.test.js`.

## Steps

- An mrepo written as a deploy of the runtime package alone leaves it: its
  layers on the filesystem storage, no service, so no gate.
- The runtime started (`bare run.js --work=<folder>`; `RUNTIME`: a bundle
  to test instead, the release check): running, its status over its local
  connection.
- Its own protocols, `runtime` and `help`, recorded in its `protocols`
  layer as it started: an internal request.
- A request posted through its inbox folder, answered in its outbox; a
  protocol it does not offer, refused as it executes.
- Asked to stop: its process ends.

Leaves nothing running.
