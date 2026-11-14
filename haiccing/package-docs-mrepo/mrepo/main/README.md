# /main

The mrepo's data: what it is for. Atomic: written by the runtime, one
commit at a time, only through a request's execution.

A section of `main` can have protocols of its own (`/protocols`). From
outside, `main` is all of an mrepo that a request can name.

## Nodes

Structure in `main` is made of nodes. A node is a folder holding its
document under a hidden name; a name starting with a dot is no URI's, so
nothing from outside can name it.

```
/main/swarms/.node.json               {}
/main/swarms/swarm-1/.node.json       { "size": 3 }
```

- **`.node.json`**: the node's document, `{}` when it was given no
  value. It is also what keeps the folder in git.
- **Made, read and removed by `crud`**: `crud/create swarms/swarm-1`
  makes the node and every node above it.
- **A node's children** are the folders in it that hold a document.

## Shortcuts

A shortcut is a node whose data originates elsewhere: another mrepo,
linked at that position. Its sources are beside its document:

```
/main/host/.node.json                 {}
/main/host/.shortcuts.json            [{ "mrepo": "local/host" }]
```

- **A list**: each entry a source, by its unique URI. One is in use: a
  child deployed there.
- **Only the link**: nothing that is local to a machine. `main`
  replicates; what the deploying mrepo knows about the child, the package
  it came from and its runtime's process, is in its runtime layer.
- **Managed by the boot protocol**: `boot/deploy` makes the node and its
  link, `boot/teardown` removes both. Deleting the node with `crud`
  removes the link, not the mrepo it leads to.

## Resolving

A URI is resolved inside the mrepo it is in (`mrepo-base-xpath`): a
position is a shortcut when its node has sources.

- **Local linking only.** The linked mrepo's folder is found by logic: the
  `main/` folder on disk is a shadow structure of `main`, and what is
  linked at a position sits there at the same path, with its inbox and
  outbox folders inside. The shortcut at `host` leads to
  `<dir>/main/host/`.
- **A URI does not run through a shortcut.** `host/packages` is not
  resolved. The way across is a `haicc` at the shortcut:
  `haicc host help/get . packages`.
- **Own shortcuts only.** An mrepo resolves its own; those of a linked
  mrepo are not visible from here.

## Later

What XPath does across linked mrepos: reading through a link, a
selection that crosses one, several sources and local data combined at
one node.
