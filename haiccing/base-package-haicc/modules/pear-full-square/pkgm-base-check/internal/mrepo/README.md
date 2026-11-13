# mrepo

Checks the integrity of a package's mrepo side: its structure, its protocols, what it carries.

## Signature

- `checkStructure(pkg)`: its `mrepo/` part.
- `checkProtocol(pkg)`: its `protocol.js`, imported; asynchronous.
- `checkCarried(pkg)`: its `package.json` and `modules/third-party.json`
  against what is there.

`pkg` is the package's folder.

## Returns

`[{ check, detail }]`: `check` is `structure`, `protocol` or `carried`;
none expected.

## Also exported

- `leaves(root)`: the leaves of a structure, each folder holding a
  `layer.json`, by its path.
- `contributions(root)`: the files it adds to layers it does not define.
