# place

Puts an mrepo's packages in place and commits their list into its packages layer.

Each listed package is fetched into the store, then hard linked into
`<dir>/packages/`, the bundle and each addon individually: the mrepo runs
only what is registered for it.

## Signature

`place({ dir, store, sources, list })`: `sources` as `parseSource`
returns them; `list` the packages, `<org>/<package>`.

## Returns

`{ packages: { <org>/<package>: { sha256, id, entries, addons } }, committed }`.
`committed` is false when the manifest is unchanged.

## Errors

Those of `fetch`.
