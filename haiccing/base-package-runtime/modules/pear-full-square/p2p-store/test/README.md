# test/

## `store.test.js`

- own drives: the same name gives the same drive, another name another
- the same primary key in another storage gives the same own drives
- an explicit keypair gives the same writable drive in any store
- a replica is opened by key, read only, empty until replicated
- resources and events: keys and sizes, never a secret
