# mrepo/

The mrepo, documented in place: each folder is a layer, where an mrepo
has it, and its README says what the layer holds. Documentation only, not
a definition. An mrepo is a repository that runs: its data in layers (git
branches), a runtime executing the requests posted to it.

```
/main                      the mrepo's data
/runtime                   the runtime's data (the service state, where it has service)
/packages                  the code it runs
/protocols                 its external API, one config a protocol
/inbox                     records posted to it
/outbox                    records it sends: the completed forms
/request/pending/default   requests waiting
/request/execute           the request executing
/request/done              requests done: its history
/execute/<target>          execution branches
```

Each layer, its README:

| | |
|---|---|
| [main/](main/) | the mrepo's data |
| [runtime/](runtime/) | the runtime's data |
| [packages/](packages/) | the code it runs |
| [protocols/](protocols/) | its external API |
| [inbox/](inbox/) | records posted to it |
| [outbox/](outbox/) | records it sends |
| [request/](request/) | the request layers: pending, executing, done |
| [execute/](execute/) | the execution branches |

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

Where the layers are stored:

| storage | |
|---|---|
| `filesystem` | p2p-git, every layer on the filesystem, in the mrepo's own folder: `<dir>/.git` |
| `p2p` | atomic and replicated layers in a Corestore (replicated to peers), the others on the filesystem |
| `git` | native git, on the filesystem |

Request and execute layers are always on the filesystem, whatever the
storage.

## The mrepo's folder

An mrepo is a folder, `<dir>`. The first, the boot mrepo, is
`<work>/mrepos/boot/`; every other lives inside its parent, at
`<parent>/main/<name>/` (the host: `boot/main/host/`). A running mrepo
sees only forward (a URI has no `..`); outside is reached through a
mapping (the work folder's package store, named in its packages
manifest).

```
<dir>/
  .git/          its layers
  inbox/         input through the filesystem: a record written here is committed
  outbox/        output: each record committed is written here too (there from the start)
  packages/      its packages, hard linked, for Bare to run
  main/<name>/   a child, inside it
  runtime.sock   its runtime's local connection (status, stop)
```

No other layer has a folder: it is read from the repository.

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

## Deploying an mrepo

`boot deploy /<name>`, executed by the parent, names a target package; the
target's `mrepo/packages/layer.json` lists the packages the mrepo is made
of, in order.

1. **Laid in**: each listed package's `mrepo/` part, read from its bundle,
   in that order (a later file replaces an earlier one), into
   `<parent>/main/<name>/`.
2. **Built**: each layer committed; the boxes' folders made.
3. **Its packages linked**, individually, from the work folder's store.
4. **Its runtime started**, from its own `packages/`, by its folder:
   `bare <dir>/packages/haiccing/base-package-runtime.bundle <dir>`.


