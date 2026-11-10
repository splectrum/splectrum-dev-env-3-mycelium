# mrepo-base-request

The mrepo request protocol, base variant (`docs/design/repositories.md`, "A
running repository"): a repository's inbox taken in, each message (a record)
validated against its API and its service state, placed in
`request/pending/default`; the next request moved into `request/execute`; a
completed one copied into `request/done` and answered. One pass at a time,
over data states, run by the repository's runtime (`mrepo-base-runtime`).
Also the records, the boxes and the local dispatcher, and the repository's
setting.

- **The boxes are layers**, `inbox` and `outbox` (non-atomic): posting is a
  commit, `post(ctx, record, name)` (an input adding its commit: native git)
  or `post(ctx)` (the inbox folder's new files, the layer's working tree:
  the p2p host's runtime); taken in when the `inbox` head moves; answers
  committed into `outbox`; nothing removed.
- **The setting** (`setting(work)`): `<work>/mrepo.json`,
  `{ "storage": "git" | "p2p", "name" }`; without it the p2p host.

## Tests

- `npm test`: the unit tests
