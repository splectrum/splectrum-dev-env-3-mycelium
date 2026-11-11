# modules/

A unit's dependencies, with the `package.json` listing what it starts
from. Assembled from those modules, all the way down; never edited by
hand.

```
modules/
  <org>/<module>/      ours, copied whole
  node_modules/        the third-party code, and links to ours by name
  third-party.json     each third-party module: version, licence, where from
```

The unit's code reaches it by relative path:
`./modules/<org>/<module>/index.js`. Our modules find each other by name,
through `modules/node_modules/`.

## Methods

Inside one of our modules, a documented method is a directory: its
`index.js` and its `README.md`, under one of two folders.

- `external/`: the methods mounted as protocol actions, `(exec, form)`.
- `internal/`: the methods called by code, never requested.

Only the methods that matter are documented. Smaller ones live in the
method they belong to, listed in its README under "Also exported"; a
helper with nothing to document is a plain file. A method's README: the
one-liner, the summary, then `Signature`, `Body` for an action, `Returns`,
`Errors`, as they apply. The module's `index.js` exports its methods.
