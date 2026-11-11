# child

Names the child mrepo a boot action is about, from its URI.

## Signature

`child(exec, uri)`: `uri` is `/<name>`, a lowercase name.

## Returns

`{ name, dir, node, recorded }`: its folder, `<parent>/main/<name>`; its
record's URI, `/main/<name>.json`; `recorded()` reads that record, or null.

## Errors

- Not a child's URI.
- No directory in the execution context.
