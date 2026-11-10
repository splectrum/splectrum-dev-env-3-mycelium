# modules/

The code the package carries, once, at its top. Assembled from the
modules `package.json` lists, all the way down; never edited by hand.

```
modules/
  <org>/<module>/      ours, copied whole
  node_modules/        the third-party code, and links to ours by name
  third-party.json     each third-party module: version, licence, where from
```

Code in the package reaches it by relative path:
`./modules/<org>/<module>/index.js`. Our modules find
each other by name, through `modules/node_modules/`.
