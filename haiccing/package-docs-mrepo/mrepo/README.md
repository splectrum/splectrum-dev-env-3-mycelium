# mrepo/

The mrepo, documented in place: each folder is a layer, where an mrepo
has it, and its README says what the layer holds. Documentation only, not
a definition. An mrepo is a repository that runs: its data in layers (git
branches), a runtime executing the requests posted to it.

Each layer, its README:

| | |
|---|---|
| [main/](main/) | the mrepo's data |
| [runtime/](runtime/) | the runtime's data |
| [packages/](packages/) | the code it runs |
| [protocols/](protocols/) | its external API |
| [help/](help/) | its documentation |
| [inbox/](inbox/) | records posted to it |
| [outbox/](outbox/) | records it sends |
| [request/](request/) | the request layers: pending, executing, done |
| [execute/](execute/) | the execution branches |

## The rules

- Every path starts with its layer, from the root: `/main/notes/a.json`.
- A URI in a request is relative, without a leading slash: "Requests",
  below.
- Layers are disjoint, never merged into each other.
- One writer per branch.
- The repository is the truth; a folder on disk is a view of a commit.
- Writes are commits only, never files edited in place.
- No log: a request is its own record, `request/done` the history.

## Modes and storage

Each layer has a mode, in its `layer.json`:

| mode | written | layers |
|---|---|---|
| atomic | one commit at a time, by the runtime | `main`, `runtime`, `protocols`, `help` |
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

An mrepo is a folder, `<dir>`. The first, the boot mrepo, put in place by
`base-component-boot`, is `<work>/mrepos/boot/`; every other lives inside its parent, at
`<parent>/main/<position>/` (the host: `boot/main/host/`). That `main/`
folder is a shadow structure of the `main` layer: what is linked at a
position sits there at the same path. The parent has a node for it in
`main`, a shortcut: the link, nothing of its data. A running mrepo sees only forward
(a URI has no `..`); outside is reached through a mapping (the work
folder's package store, named in its packages manifest).

Every mrepo has a unique URI, `<swarm>/<node>`, in its runtime layer. What
the boot mrepo creates is `local/<name>`: the boot mrepo is `local/boot`,
the host `local/host`. Its inbox is addressed by it: `/local/host/inbox`.

```
<dir>/
  .git/          its layers
  inbox/         input through the filesystem: a record written here is committed
  outbox/        output: each record committed is written here too (there from the start)
  packages/      its packages, hard linked, for Bare to run
  main/<name>/   the shadow of main: an mrepo linked at that position, inside it
  runtime.sock   its runtime's local connection (status, stop)
```

No other layer has a folder: it is read from the repository.

## A request

A record, as an onion: a form (the request) in an envelope (where it is
going). Its key, a GUID, names its document in every layer.

```json
{
  "topic": "/local/boot/inbox",
  "key": "7b0c1f4e-2d3a-4c5b-9e6f-0a1b2c3d4e5f",
  "timestamp": "2026-11-10T00:00:00.000Z",
  "headers": {},
  "value": {
    "topic": "/terminal",
    "key": "7b0c1f4e-2d3a-4c5b-9e6f-0a1b2c3d4e5f",
    "timestamp": "2026-11-10T00:00:00.000Z",
    "headers": {},
    "value": { "protocol": "service", "action": "start", "uri": "." }
  }
}
```

The envelope's `topic` is where it goes; the core's, where the completed
form goes back. Each move replaces the envelope; the core never changes.
Processing completes the form: its `output`, or the `error` that stopped
it.

The request itself is a form, `{ protocol, action, uri, args }`, the
arguments a list, unnamed. It can also be given as a command, as it is
typed: its parts in order, `<protocol>/<action> <URI> <argument>...`.

```json
"value": ["haicc", "host", "service/start"]
```

The mrepo interprets it on its way in. The protocol alone takes its
default action: `haicc` is `haicc/goto`.

A URI in a request is relative: it has no leading slash and is read from
where its writer stands. `.` is the position itself, and so is none
given; `./x` is `x`.

- **From outside** the writer stands at `main`: `.` is `main`, `host` is
  `main/host`. The outside reaches `main` and nothing else.
- **The mrepo itself**, a hook or a request of its own, stands at its
  root, above the layers, and names the layer first: `protocol/activate .
  help`.

Inside, in the form, a URI is an array of segments: the prefix where
its writer stands, then the URI as written. From outside that is the
prefix `main` and one segment: `["main", "host"]`, `["main", "."]`.
Outside, a URI is one segment, as it is written. What an action is
about, when that is not where it is executed, is an argument: `help/get .
packages`, `runtime/run . packages/<org>/<package>/test/validate`.

Its way: `inbox` → `request/pending/default` → `request/execute` →
`request/done`, and back through the `outbox`. Order is the commit chain.
Requests are checked at the inbox, and again as they execute.

## Deploying an mrepo

`boot deploy <name> <package>`, executed by the parent, names a target
package; the target's `mrepo/packages/layer.json` lists the packages the mrepo is made
of, in order.

1. **Laid in**: each listed package's `mrepo/` part, read from its bundle,
   in that order (a later file replaces an earlier one), into
   `<parent>/main/<name>/`. Runtime config comes from the last package of
   the list only: the one that defines the mrepo.
2. **Built**: each layer committed; the boxes' folders made.
3. **Its packages linked**, individually, from the work folder's store.
4. **Its runtime started**, from its own `packages/`, by its folder:
   `bare <dir>/packages/haiccing/base-package-runtime.bundle <dir>`.
5. **Its shortcut placed** in the parent's `main`, at its position: a
   node, and its link beside it.


