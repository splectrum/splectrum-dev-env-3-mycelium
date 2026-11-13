# extract

Lays out every README of an mrepo's packages at the URI each documents, with the index and the problems.

A package's README at `<path>` in its bundle goes to
`/packages/<org>/<package><path>`. A package whose `package.json` names a
`help` folder documents the mrepo itself: that folder's READMEs go to the
root. The packages layer's help links to every linked package.

## Signature

`extract(packages)`: `packages` is `[{ pkg, files, help, paths }]`, the
READMEs by bundle path and the bundle's paths.

## Returns

`{ <path>: bytes }`: the READMEs, `/index.json` and `/problems.json`.
The action `extract`, in `external/`, writes them.

## Layout

- `/index.json`: `{ <uri>: { title, oneliner, links } }`.
- `/problems.json`: `[{ uri, check, detail }]`, none expected.

## Also exported

- `parse(text)`: a README's levels: `{ title, oneliner, summary,
  sections, links }`. The one-liner is the first sentence; the summary,
  everything up to the first `##`.
- `check(text)`: the rules on one README: `[[check, detail]]`.
