# test/

mycelium-value-json's own tests (brittle), each file on its own; they make what they need and remove it.

```sh
npm test        # bare ../../node_modules/brittle/cmd.js test/*.test.js
```

In a package that carries the module, the same tests run on the package's copy: its generic modules test, `/test/modules/pear-full-square/mycelium-value-json`.

## `json.test.js`

- a value to bytes and back
