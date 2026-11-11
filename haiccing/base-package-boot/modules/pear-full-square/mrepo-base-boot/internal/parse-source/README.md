# parse-source

Parses a source given as `folder:<path>` or `github:<org>`.

## Signature

`parseSource(s)`

## Returns

`{ kind: "folder", path }` or `{ kind: "github", org }`.

## Errors

Not a source.
