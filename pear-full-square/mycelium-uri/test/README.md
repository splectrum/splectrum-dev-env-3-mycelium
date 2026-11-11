# test/

mycelium-uri's own tests (brittle), each file on its own; they make what they need and remove it.

```sh
npm test        # bare ../../node_modules/brittle/cmd.js test/*.test.js
```

In a package that carries the module, the same tests run on the package's copy: its generic modules test, `/test/modules/pear-full-square/mycelium-uri`.

## `names.test.js`

- names: lowercase words joined by single hyphens
- data names: lowerCamelCase, no two capitals in a row, no _
- a data name and its URI form, exact both ways

## `uri.test.js`

- isSegment
- validate: canonical URIs pass unchanged
- validate: accepted deviations are fixed
- validate: broken rules throw
- validate: star steps
- sameName
- isUri: canonical only
- parse
- format
- join
- parent
- split
