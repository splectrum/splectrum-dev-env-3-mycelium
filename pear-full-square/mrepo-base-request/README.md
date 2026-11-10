# mrepo-base-request

The mrepo request protocol, base variant (`docs/design/repositories.md`, "A
running repository"): a repository's inbox taken in, each message (a record)
validated against its API and its service state, placed in
`request/pending/default`; the next request moved into `request/execute`; a
completed one copied into `request/done` and answered. One pass at a time,
over data states, run by the repository's runtime (`mrepo-base-runtime`).
Also the records, the boxes (`/inbox`, `/outbox`) and the local dispatcher.

## Tests

- `npm test`: the unit tests
