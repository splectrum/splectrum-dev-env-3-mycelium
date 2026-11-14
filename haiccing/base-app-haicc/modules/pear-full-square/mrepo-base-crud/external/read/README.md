# read

Reads the nodes a URI selects: each with its document and the names of its children.

A URI names one node; with `*` as its last name part it selects the
children of the node before it. Nothing there selects nothing: an empty
array, not an error.

## Signature

`read(exec, { uri })`: requested as `crud/read <URI>`.

## Returns

An array of nodes:

```
[{ "uri": ["main", "swarms"], "value": {}, "children": ["swarm-1"] }]
```

- `uri`: in the internal format, its segments.
- `children`: by name only; `crud/read swarms/*` reads them.
- `shortcuts`: only at a node that is a link: the mrepos its data comes
  from, `[{ "mrepo": "local/host" }]`.

The layer itself, `.` from outside, is a node: its document `{}` when it
has none.

## Errors

- A name that is not a plain name.
- A URI that runs through a shortcut: what is below one is read in the
  mrepo it leads to, with a `haicc` at it.
