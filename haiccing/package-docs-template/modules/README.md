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
