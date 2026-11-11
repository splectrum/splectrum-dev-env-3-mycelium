# test/

mrepo-base-execute's own tests (brittle), each file on its own; they make what they need and remove it.

```sh
npm test        # bare ../../node_modules/brittle/cmd.js test/*.test.js
```

In a package that carries the module, the same tests run on the package's copy: its generic modules test, `/test/modules/pear-full-square/mrepo-base-execute`.

## `execute.test.js`

- execute: execution branches from their targets, the record completed, merged back into each target
- the execution context: read-only to the action, the runtime's context read through it
- local commit and rollback in an action; the global commit at its end, a failure rolling back globally
- exec.log: entries into the request's record, at or above the threshold
- executed: a form completed elsewhere handed over as execute hands one
- failed: a runtime's error in the request executing
