# test/

The tests of mrepo-base-service, a section per file, each test by its name.

## `service.test.js`

- the actions: the state moved, booted to started and back
- the hooks: each transition runs its own first, in name order, as the mrepo's own; one failing fails the transition
- the config: each action at the mrepo itself, in the states that allow it
