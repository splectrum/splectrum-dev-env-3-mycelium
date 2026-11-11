# test/

## `cycle.test.js`

- the cycle on p2p and on git: initialise (preloaded), start, put, get, delete, refused, stop, shutdown
- where the layers live on the p2p host: the atomic ones in the store, the rest on disk

## `fixture.js` (shared, not a test)

A booted repository for the tests, as a boot leaves it: the repository `host`, its layers, its packages (a manifest; a HAICC bundle carrying its API, /api.json), the runtime's data booted, the pending queue preloaded with service initialise /.

## `runtime.test.js`

- version: the module and its version
- a bad call: exit 2
- the runtime: started detached, the store held, asked over its connection, stopped
