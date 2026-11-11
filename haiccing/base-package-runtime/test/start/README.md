# start/

The runtime as an mrepo's process, end to end, in a temporary folder
removed after. Entry: `run.js`; the test: `start.test.js`.

- An mrepo written as a deploy leaves it: its layers on the filesystem
  storage, initialised (`runtime/service.json`, an API), a `service start`
  preloaded.
- The runtime started (`bare run.js --work=<folder>`; `RUNTIME`: a bundle
  to test instead, the release check): running, its status over its local
  connection.
- Its preloaded request run first; a `rest get` posted through its inbox
  folder, answered in its outbox.
- Asked to stop: its process ends.

Leaves nothing running.
