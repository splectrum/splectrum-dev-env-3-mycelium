# test/

p2p-replicate's own tests (brittle), each file on its own; they make what they need and remove it.

```sh
npm test        # bare ../../node_modules/brittle/cmd.js test/*.test.js
```

In a package that carries the module, the same tests run on the package's copy: its generic modules test, `/test/modules/pear-full-square/p2p-replicate`.

## `replicate.test.js`

- over a direct stream: read lazily, counted per peer, then held whole
