# extract

Extracts every README of an mrepo's packages into its help layer, at the URI each documents.

A package's README at `<path>` in its bundle goes to
`/packages/<org>/<package><path>`. A package whose `package.json` names a
`help` folder documents the mrepo itself: that folder's READMEs go to the
root. The packages layer's help links to every linked package.

## Signature

- `extract(packages)`: `packages` is `[{ pkg, files, help, paths }]`, the
  READMEs by bundle path and the bundle's paths.
- `extractInto({ repo, writer, dir })`: the same from the mrepo's packages
  manifest and bundles, committed into its `help` layer when it changed.

## Returns

- `extract`: `{ <path>: bytes }`: the READMEs, `/index.json` and
  `/problems.json`.
- `extractInto`: `{ readmes, changed, problems }`.

## Layout

- `/index.json`: `{ <uri>: { title, oneliner, links } }`.
- `/problems.json`: `[{ uri, check, detail }]`, none expected.

## Also exported

- `parse(text)`: a README's levels: `{ title, oneliner, summary,
  sections, links }`. The one-liner is the first sentence; the summary,
  everything up to the first `##`.
- `check(text)`: the rules on one README: `[[check, detail]]`.
