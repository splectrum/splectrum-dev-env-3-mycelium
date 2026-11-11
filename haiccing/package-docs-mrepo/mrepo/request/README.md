# /request

The requests, as they move. Non-atomic. A request is one document,
`<key>.json`, in one of the layers at a time; each move a commit.

| layer | |
|---|---|
| `pending/default` | waiting, in the order they arrived; a preloaded request here runs first |
| `execute` | the one executing |
| `done` | each finished request, refused ones too, in the order done: the history |

An error goes into the request it happened to.
