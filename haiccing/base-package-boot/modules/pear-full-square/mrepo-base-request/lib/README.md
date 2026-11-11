# lib/

mrepo-base-request's parts, imported by its `index.js` (its API, in the README above).

| file | |
|---|---|
| `boxes.js` | A repository's boxes, as layers (docs/design/repositories.md, "The boxes"): `inbox` and `outbox`, non-atomic (git on disk), a record a document, `<name>.json`, at the layer's root; nothing removed (housekeeping later). |
| `follow.js` | The requests followed, as they move (docs/design/repositories.md, "No log: a request is its own record"): each record arriving in an mrepo's request layers (pending, execute, done), and its children's in view `(<dir>/main/<name>/`, theirs too), printed as it is stored, one compact line a record, its envelope's topic the full path (/boot/request/done, /boot/main/host/request/pending/default). |
| `layer.js` | Records in a layer of the repository (a git branch): one JSON document a record, at the branch's root, `<name>.json.` |
| `record.js` | A record (docs/design/repositories.md, "Every message is a Kafka record"): the base's minimum, { topic, timestamp, headers, value }; the headers left empty for now (their use to be planned). |
| `view.js` | A repository's folder (docs/design/structure.md): `<work>/mrepos/<name>/`, its git on disk (.git), and a layer's files at the path of its URI (/inbox at `<work>/mrepos/<name>/inbox).` |
