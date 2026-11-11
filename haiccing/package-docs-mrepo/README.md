# package-docs-mrepo

The mrepo structure, documented. An mrepo is a repository that runs: its
data in layers (git branches), a runtime executing the requests posted to
it. Each folder here is a layer; its README says what it holds.

```
/main                      the mrepo's data
/runtime                   the runtime's data: the service state
/packages                  the code it runs
/protocols                 its external API, one config a protocol
/inbox                     records posted to it
/outbox                    records it sends: the completed forms
/request/pending/default   requests waiting
/request/execute           the request executing
/request/done              requests done: its history
/execute/<target>          execution branches
```

## The rules

- Every path starts with its layer, from the root: `/main/notes/a.json`.
- Layers are disjoint, never merged into each other.
- One writer per branch.
- The repository is the truth; a folder on disk is a view of a commit.
- Writes are commits only, never files edited in place.
- No log: a request is its own record, `request/done` the history.

## Modes and storage

Each layer has a mode, in its `layer.json`:

| mode | written | layers |
|---|---|---|
| atomic | one commit at a time, by the runtime | `main`, `runtime`, `protocols` |
| replicated | as atomic, also copied out as files | `packages` |
| non-atomic | its own writers, in parallel | `inbox`, `outbox`, `request/*`, `execute/*` |

Where the layers are stored, set beside the mrepo (`<work>/mrepo.json`,
`{ "storage", "name" }`):

| storage | |
|---|---|
| `filesystem` | p2p-git, every layer on the filesystem: `<work>/mrepos/<name>/.git` |
| `p2p` | atomic and replicated layers in a Corestore (replicated to peers), the others on the filesystem |
| `git` | native git, on the filesystem |

## A request

A record, as an onion: a form (the request) in an envelope (where it is
going). Its key, a GUID, names its document in every layer.

```json
{
  "topic": "/boot/inbox",
  "key": "7b0c1f4e-2d3a-4c5b-9e6f-0a1b2c3d4e5f",
  "timestamp": "2026-11-10T00:00:00.000Z",
  "headers": {},
  "value": {
    "topic": "/terminal",
    "key": "7b0c1f4e-2d3a-4c5b-9e6f-0a1b2c3d4e5f",
    "timestamp": "2026-11-10T00:00:00.000Z",
    "headers": {},
    "value": { "protocol": "service", "action": "start", "uri": "/" }
  }
}
```

The envelope's `topic` is where it goes; the core's, where the completed
form goes back. Each move replaces the envelope; the core never changes.
Processing completes the form: its `output`, or the `error` that stopped
it.

Its way: `inbox` → `request/pending/default` → `request/execute` →
`request/done`, and back through the `outbox`. Order is the commit chain.
Requests are checked at the inbox, and again as they execute.

## Installing an mrepo

1. **Overlay**: the common package's `mrepo/`, the application's on top,
   into `<work>/mrepos/<name>/`.
2. **Build**: its packages put in place; each layer folder committed.
3. **Clean up**: left on disk: `.git/`, `inbox/`, `packages/`.

How a package lays out an mrepo: [package-docs-template](https://github.com/haiccing/package-docs-template).

Written from [splectrum/splectrum-dev-env-3-mycelium](https://github.com/splectrum/splectrum-dev-env-3-mycelium).
