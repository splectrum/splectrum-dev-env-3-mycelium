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
passes one handler into `pending/default`; the inbox itself checks nothing.

- **From the inbox**: the handler validates it: addressed to this mrepo,
  offered by its API.
- **Internal**: placed by the mrepo's runtime or by an action, straight to
  the handler, never through the inbox. It carries no mark: a request is
  internal when the inbox, which keeps its history, has no record of it. A
  preloaded request is internal too.
- **As it executes**, an internal request needs no API and does not wait
  for the service to be started. The service's own actions stay under its
  state machine, whoever asks.
- **Before the mrepo is operational**, the runtime takes nothing from the
  inbox: its own requests come first, such as `help extract /`. The
  inbox's records wait.
