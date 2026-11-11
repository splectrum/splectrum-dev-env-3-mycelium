# /request

The requests, as they move. Non-atomic. A request is one document,
`<key>.json`, in one of the layers at a time; each move a commit.

| layer | |
|---|---|
| `pending/default` | waiting, in the order they arrived; a preloaded request here runs first |
| `execute` | the one executing |
| `done` | each finished request, refused ones too, in the order done: the history |

An error goes into the request it happened to.

## Internal requests

A request comes from the inbox, or from the mrepo itself. Either way it
passes one handler into `pending/default`, which validates it by where it
comes from.

- **From the inbox**: addressed to this mrepo, offered by its API. A form
  that claims to be internal is refused: internal is where a request comes
  from, not what it says.
- **Internal**: placed by the mrepo's runtime or by an action, straight to
  the handler, never through the inbox. Marked internal by the handler, so
  it is exempt from the API and the service state as it executes.
- **Before the mrepo is operational**, the runtime takes no requests from
  the inbox: its own come first, such as `help extract /`. The inbox's
  records wait; none is refused for it.
