# mrepo/

An mrepo's definition, laid out by layers as its repository will hold
them, with the same URIs: `mrepo/main/…` is `/main/…`.

```
mrepo/
  main/                     layer.json  the mrepo's content
  runtime/                  layer.json  the runtime's data: service state, type, API
  packages/                 layer.json  the packages to source (listed in its layer.json)
  inbox/                    layer.json  requests arriving
  outbox/                   layer.json  completed forms sent back
  request/pending/default/  layer.json  requests waiting (a preloaded one, if any)
  request/execute/          layer.json  the request executing
  request/done/             layer.json  requests done
```

A leaf is a folder holding a `layer.json`; the folders above it only
group. A leaf's files are committed with it, `layer.json` too, so no
folder is empty.

## layer.json

```json
{
  "mode": "atomic",
  "description": "The runtime's data."
}
```

| mode | | layers |
|---|---|---|
| atomic | one commit at a time, by the runtime | `main`, `runtime` |
| replicated | as atomic, also copied out as files | `packages` |
| non-atomic | its own writers, in parallel | `inbox`, `outbox`, `request/*` |

## Common and type

`base-package-mrepo` gives what every mrepo has: the fixed layers. A
type's package gives `main`, its API, and what it customises. A file at
the same path replaces the common one, whole.

## Installing

1. **Overlay**: the common `mrepo/`, the type's on top, into
   `<work>/mrepos/<name>/`.
2. **Build**: the packages sourced into `packages/`; each leaf committed
   into its layer.
3. **Clean up**: what is committed and has no use on disk removed. Left:
   `.git/`, `inbox/`, `packages/`.

No README inside a layer: it would be committed into it. A layer explains
itself in its `layer.json`.
