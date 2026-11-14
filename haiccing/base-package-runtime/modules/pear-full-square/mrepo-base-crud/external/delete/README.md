# delete

Makes sure the nodes a URI selects are gone, and answers with what was removed.

A node that still has children is removed only with `recurse`, and then
with everything below it. A node that is not there selects nothing: the
request succeeds with an empty array.

## Signature

`remove(exec, { uri, args })`: requested as `crud/delete <URI>
[recurse]`. Exported as `remove`, mounted as the action `delete`.

## Arguments

1. `recurse`, optional: the node's children go with it.

## Returns

An array, each node as it was, with `"outcome": "deleted"`.

## Errors

- No target, the layer itself: `missing argument: target`.
- A node with children, without `recurse`: refused, saying how. Nothing
  of the selection is removed then.
- An argument other than `recurse`.
- A URI that runs through a shortcut.

## Design

Deleting a shortcut deletes the link, its node and its list of sources,
not the mrepo it leads to: that one is torn down with `boot/teardown`.
Everything is one change to this mrepo, undone with it.
