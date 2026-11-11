# test/

p2p-store's own tests (brittle), each file on its own; they make what they need and remove it.

```sh
npm test        # bare ../../node_modules/brittle/cmd.js test/*.test.js
```

In a package that carries the module, the same tests run on the package's copy: its generic modules test, `/test/modules/pear-full-square/p2p-store`.

## `store.test.js`

- own drives: the same name gives the same drive, another name another
- the same primary key in another storage gives the same own drives
- an explicit keypair gives the same writable drive in any store
- a replica is opened by key, read only, empty until replicated
- resources and events: keys and sizes, never a secret
