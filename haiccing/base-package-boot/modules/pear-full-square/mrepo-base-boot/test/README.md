# test/

## `build.test.js`

- the boot mrepo: built from its folder, the same twice
- the boot mrepo running, without its packages: no service gate; its preloaded deploy refused (no boot protocol linked), answered; stopped
- the structure written for the tests removed

## `deploy.test.js`

The boot protocol's actions, with a context like the execute protocol's (reads from the repository, writes collected, then committed; exec.commit() a local commit).

- deploy from a target package's list, inside the parent; redeploy; teardown
- deploy the runtime: the child's runtime started from its own packages, its inbox answering; teardown stops it

## `prerequisites.test.js`

- platform, work, sources
- bare: missing, not fixed without a yes; put in place from a folder source, checked; there next time
- bare: an installed one on the PATH, at the pinned major, the same or newer; recorded, used next time
- docker: only where its condition holds
