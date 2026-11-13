# mrepo-base-xpath

XPath in an mrepo: a local URI resolved to a node position, an ordinary node or a shortcut.

Internal functionality of the runtime, beside request and execute: nobody
requests it, it has no protocol. The `haicc` protocol's `goto` uses it to
tell where a command is executed, and the boot protocol uses it to place
and remove the shortcuts of the mrepos it deploys.

| | |
|---|---|
| [internal/](internal/) | its methods |
| [test/](test/) | its tests |

## Layer

The `xpath` layer holds the navigation directives. A shortcut at a
position is one entry, at the position's own path:

```
/xpath/host/shortcut.json     { "mrepo": "local/host", ... }
```

## Unique URIs

Every mrepo has a unique URI, `<swarm>/<node>`, in its runtime layer
(`/runtime/mrepo.json`). What the boot mrepo creates is `local/<name>`:
`local/host`. A shortcut names the mrepo it leads to by that URI.

## Tests

- `npm test`: positions and shortcuts resolved on a context written for it.
