# test/

The tests of mrepo-base-runtime, a section per file, each test by its name.

## `cycle.test.js`

- the cycle on p2p and on git: initialise (preloaded), start, put, get, delete, refused, stop, shutdown
- where the layers live on the p2p host: the atomic ones in the store, the rest on disk

## `fixture.js`

Shared by the tests, not a test itself. A booted repository for the tests: the repository `host`, its layers, an empty packages manifest, its service state booted, the pending queue preloaded with service/initialise.

## `runtime.js`

Shared by the tests, not a test itself. The runtime from the command line, started with the rest and service protocols as packages would offer them.

## `runtime.test.js`

- version: the module and its version
- a bad call: exit 2
- the runtime: started detached, the store held, asked over its connection, stopped
