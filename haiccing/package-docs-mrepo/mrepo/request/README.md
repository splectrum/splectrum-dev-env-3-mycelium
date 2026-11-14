# /request

The requests, as they move. Non-atomic. A request is one document,
`<key>.json`, in one of the layers at a time; each move a commit.

| layer | |
|---|---|
| `pending/default` | waiting, in the order they arrived; a preloaded request here runs first |
| `execute` | a completed request, merged in from its own branch, on its way to `done` |
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
  inbox: its own requests come first, such as `help/extract`. The
  inbox's records wait.

## Commands sent on

A command at a shortcut is not executed where it arrived. `haicc <URI>
<command>` goes to the position; where that is a shortcut, the command
that follows is sent to the mrepo linked there, and that mrepo's response
becomes the request's result.

- **Sent on unchanged**: the hop takes its own `haicc <URI>` off, and the
  rest is delivered as it is to the other mrepo's inbox. Nothing is
  rewritten. On the same node that is direct: a file dropped into its
  inbox folder. Another node needs dispatch, which is not built.
- **Waiting**: the request's processing ends there. Its principal, on
  its own branch, now says which child it waits for. The mrepo goes on
  with its other requests.
- **The response** is collected from the other mrepo's outbox folder and
  comes in through `pending/default` like any request of the mrepo's own.
  At the front of the queue it is not begun as a request: it is added to
  the principal's branch, and the principal is returned with it. Both move
  on to `done`; the response is not sent anywhere else.
- **Checked by the mrepo that executes it**: the command that follows is
  interpreted and checked where it lands.

```json
{ "command": ["haicc", "host", "help/get", ".", "packages"],
  "protocol": "haicc", "action": "goto", "uri": "main/host",
  "args": ["help/get", "/packages"],
  "remote": { "at": "host", "folder": "main/host", "key": "…" },
  "output": { } }
```

