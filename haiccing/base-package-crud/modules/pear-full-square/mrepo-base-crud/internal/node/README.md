# node

A node as it is stored, and the nodes a request's URI selects.

Every node is a folder holding its document, `.node.json`: `{}` when no
value was given. The name starts with a dot, so no URI can name it, and
it keeps the folder in git. `main/swarms/swarm-1` is
`swarms/swarm-1/.node.json` in `main`.

## Signature

- `place(uri)`: where a request's URI, its segments, points.
- `nodeAt(exec, place, names)`: the node at those names below the layer.
- `select(exec, place)`: the nodes the URI selects.

## Returns

- `place`: `{ layer, names, star, uriOf(names), at(names) }`. `star`: the
  last name part was `*`. `uriOf` gives a node's URI in the request's own
  format, its prefix kept.
- `nodeAt`: `{ uri, value, children }`, with `shortcuts` where the node
  is a link; `null` when there is none. The layer itself is a node.
- `select`: `[{ names, node }]`, empty when nothing is there.

## Errors

- The URI is the mrepo itself, above its layers.
- A name that is not a plain name, or `*` anywhere but last.
- In `main`, a URI that runs through a shortcut.

## Design

- A node's children are the folders in it that hold a document. A hidden
  folder, or one without, is none.
- Paths are written relative, from the mrepo's root.

## Also exported

`NODE`: `.node.json`. `folderOf(place, names)`: a node's folder.
`inside(exec, place, names)`: the check against a URI through a shortcut.
