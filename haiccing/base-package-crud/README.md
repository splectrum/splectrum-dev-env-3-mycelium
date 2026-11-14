# base-package-crud

The crud protocol: the generic actions on an mrepo's data, its nodes created, read and deleted by URI.

An mrepo that links it can be given structure in `main`: nodes, each a
folder with its document. `crud/create` makes a node and every node above
it; `crud/read` answers with the nodes a URI selects; `crud/delete`
removes them. There is no update.

| | |
|---|---|
| [test/](test/) | its tests: its protocol as mounted, and the generic ones |
| [test-reports/](test-reports/) | the report of its last pre-release |
| [modules/](modules/) | its code, assembled: ours and the third-party code |

## Commands

```
haicc . crud/create swarms/swarm-1 {"size":3}
haicc . crud/read swarms
haicc . crud/read swarms/*
haicc . crud/delete swarms recurse
haicc host crud/create swarms/swarm-1
```

- `crud/create <URI> [<value>]`: the node and its parents made; one
  there already left as it is. The value is its document, JSON; none:
  `{}`.
- `crud/read <URI>`: an array of the nodes selected, each with its
  document and its children's names. `*` as the last name part selects
  the children. Nothing there: an empty array.
- `crud/delete <URI> [recurse]`: the nodes selected removed; one with
  children only with `recurse`. Nothing there: an empty array.

Every action can be repeated: the second time changes nothing.

## Nodes

A node is a folder in `main` holding its document under a hidden name:
`swarms/swarm-1/.node.json`. A shortcut is a node too: its sources are
beside its document, in `.shortcuts.json`. Deleting it removes the link,
not the mrepo it leads to.

## Package

- `protocol.js`: the `crud` protocol, its config and its actions, from
  `mrepo-base-crud`.
- `main.js`: the dispatcher, the bundle's main, generated.
- No structure of its own: the nodes are made in `main`, the runtime
  package's layer.

Written from [splectrum/splectrum-dev-env-3-mycelium](https://github.com/splectrum/splectrum-dev-env-3-mycelium).
