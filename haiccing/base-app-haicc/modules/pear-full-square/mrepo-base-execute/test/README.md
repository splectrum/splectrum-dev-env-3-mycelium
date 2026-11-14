# test/

The tests of mrepo-base-execute, a section per file, each test by its name.

## `execute.test.js`

- execute: execution branches from their targets, the record completed, merged back into each target
- the execution context: read-only to the action, the runtime's context read through it
- local commit and rollback in an action; the global commit at its end, a failure rolling back globally
- exec.log: entries into the request's record, at or above the threshold
- executed: a form completed elsewhere handed over as execute hands one
- failed: a runtime's error in the request executing
- exec.run: a command executed here; exec.forward: sent on, the principal waiting, returned with the response
