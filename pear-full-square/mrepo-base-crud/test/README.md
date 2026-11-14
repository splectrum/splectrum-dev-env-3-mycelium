# test/

The tests of mrepo-base-crud, a section per file, each test by its name.

## `crud.test.js`

- where a URI points: its layer, its names, the URI of a node in the same format
- create: the node and every node above it, each a folder with its document; idempotent
- read: the nodes a URI selects, an array; none there: empty, not an error
- delete: the nodes selected made sure to be gone; children only with recurse; idempotent
- a shortcut: a node that is a link, read with where it leads; deleted, the link goes; a URI does not run through it
- another layer, for the mrepo's own requests: the same, the layer first
- the config: create, read and delete, anywhere in main; no update
