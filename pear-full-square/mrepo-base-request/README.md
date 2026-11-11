# mrepo-base-request

The mrepo request protocol: it takes requests in from the inbox and moves
them through pending, execute and done.

A request is a record. It is checked at the inbox against the mrepo's API
and service state, queued in `request/pending/default`, moved one at a time
into `request/execute`, then into `request/done`, and sent back through the
outbox. The module also holds the records, the boxes, logging, following,
and the mrepo's storage setting. The runtime runs it, one pass at a time.

| | |
|---|---|
| [lib/](lib/) | its parts, a file each |
| [test/](test/) | its tests, what each checks |

## Design

The mrepo request protocol, base variant: a repository's inbox taken in,
each message (a record)
validated against its API and its service state, placed in
`request/pending/default`; the next request moved into `request/execute`; a
completed one copied into `request/done` and answered. One pass at a time,
over data states, run by the repository's runtime (`mrepo-base-runtime`).
Also the records, the boxes and the local dispatcher, and the repository's
setting.

- **Records are an onion**: the core (the pre-filled form: its topic where
  it is to arrive back, its value the request) in an envelope (its topic
  the destination); each hand-over replaces the envelope; execution
  completes the form (`output` or `error`); the completed form is sent back
  into the outbox, in an envelope. Headers empty for now.
- **The boxes are layers**, `inbox` and `outbox` (non-atomic): posting is a
  commit, `post(ctx, record, name)` (an input adding its commit: native git)
  or `post(ctx)` (the inbox folder's new files, the layer's working tree:
  the p2p host's and a `filesystem` mrepo's runtime); taken in when the
  `inbox` head moves; answers committed into `outbox`, then written into
  the outbox folder (`outboxOf(dir)`, made at build, watchable from the
  start); nothing removed. An mrepo by its directory: `inboxOf(dir)`.
- **Logs and following**: `logger(threshold)` (`log(level, event, data)`,
  levels `error`, `warn`, `info`, `debug`; the entries into the completed
  form, `complete(core, result, entries)`); `follow({ dir, name })` prints
  each record as it arrives in an mrepo's request layers and its children's
  in view, one compact line a record, its topic the full path; `settled()`:
  every request done (none pending or executing in any of them).
- **One way into pending** (`admit(ctx, core, { origin })`): the inbox's
  records and internal requests (`internal(ctx, form)`, the mrepo's own)
  pass the same handler, validated by where they come from; refused, the
  form completed with the error in `request/done`. No mark: a request is
  internal when the inbox has no record of it (`isInternal(ctx, name)`).
  `ctx.intake === false`: the inbox not taken in yet.
- **Checked** (`check`): an internal request for its URI, and a service action for the state; otherwise against the type, the API and the service state;
  an mrepo without `service` (no `/runtime/service.json`): no gate, the URI
  canonical only.
- **A layer's records** (`layer(ctx, branch)`): one JSON document a
  record, `<name>.json`, listed in the order they arrived (the commit
  chain). A layer's config, `layer.json` (committed with it when built from
  a structure), is not one of its records, nor is it posted from the inbox
  folder.
- **The setting** (`setting(work)`): `<work>/mrepo.json`,
  `{ "storage": "git" | "filesystem" | "p2p", "name" }` (native git;
  p2p-git with every layer on the filesystem, no Corestore; the p2p host
  over its Corestore and disk side); without it the p2p host.

## Tests

- `npm test`: the unit tests
