# fetch

Brings a package into the work folder's store from the sources, checked against its manifest.

Already in the store, it is not fetched again. From a source folder,
`<path>/<org>/manifest.json` names the bundle and its sha256; its addons
come from `<path>/addons/`.

## Signature

`fetch({ store, sources, pkg })`

## Returns

The package's manifest entry: `{ file, id, sha256, entries, addons, ... }`.

## Errors

- Not in the store nor the sources.
- A bundle or an addon not as its manifest says.
