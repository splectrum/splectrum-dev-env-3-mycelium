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

## Wrapped remote command

A request whose URI leads into another mrepo is not executed where it
arrived. It is passed on whole, and that mrepo's response becomes its
result.

- **Where a URI leads**: `/main/<name>/<rest>` enters the child linked at
  `/main/<name>`; inside it the URI is `/<rest>`. A child may pass it on
  again: a request can travel through several mrepos.
- **Passed on**: a child request, the same protocol, action and body, is
  delivered to the other mrepo's inbox. On the same node that is direct: a
  file dropped into its inbox folder. Another node needs dispatch, which is
  not built.
- **Waiting**: the request's execution ends waiting. It stays in
  `request/execute` with its remote state but no longer holds the slot:
  the mrepo goes on with its other requests.
- **The response** is collected from the child's outbox folder and comes
  in through `pending/default` like any request of the mrepo's own. At the
  front of the queue it is not executed: it is added into the waiting
  request's state, and that request is completed with it.
- **Checked by the mrepo that executes it**: the one passing it on asks
  only that the URI is canonical.

```json
{ "protocol": "help", "action": "get", "uri": "/main/host/packages",
  "remote": { "at": "/main/host", "uri": "/packages", "key": "…", "response": { "output": { } } },
  "output": { } }
```

