# rules

Checks a module of ours, or a package's own code, against the code rules.

## Signature

- `checkModule(dir, { ours })`: a module's folder; `ours`, our modules'
  names.
- `checkPackage(dir)`: a package's own code, its `modules/` aside: the
  references only, as it reaches its modules by path.

## Returns

`[{ file, check, detail }]`: `check` is `structure`, `imports` or
`transient`; none expected.

## Also exported

`jsFiles(dir)`: the `.js` files of a folder, its `node_modules` aside.
