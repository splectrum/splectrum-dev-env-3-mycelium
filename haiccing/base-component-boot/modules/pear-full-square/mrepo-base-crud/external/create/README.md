# create

Makes sure a node exists, with every node above it, and says for each what happened.

The whole path is created, not only the last name: a missing parent is
made with an empty document. A node that is there already is left as it
is, also when another value is given: changing a document is an update,
which there is not.

## Signature

`create(exec, { uri, args })`: requested as `crud/create <URI> <value>`.

## Arguments

1. The node's document, optional: JSON text. None: `{}`.

## Returns

An array, a node for each name of the path, the topmost first:

```
[{ "uri": ["main", "swarms"], "value": {}, "children": ["swarm-1"], "outcome": "there" },
 { "uri": ["main", "swarms/swarm-1"], "value": {"size": 3}, "children": [], "outcome": "created" }]
```

`outcome` is `created` or `there`. The URI is in the internal format, its
segments: the request's prefix, then the node's own.

## Errors

- No target, the layer itself: `missing argument: target`.
- A selection: `*` is not a node to create.
- A name that is not a plain name: no extension, no capital.
- A value that is not JSON.
- A URI that runs through a shortcut.
