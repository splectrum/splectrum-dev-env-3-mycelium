# lib/

The parts of mrepo-base-request, a file each, imported by its `index.js`.

| file | |
|---|---|
| `boxes.js` | A repository's boxes, as layers: `inbox` and `outbox`, non-atomic (git on disk), a record a document, `<name>.json`, at the layer's root; nothing removed (housekeeping later). |
| `command.js` | A command: a request as it is typed, its parts in order, `<protocol>/<action> <URI> <argument>...`, interpreted into the form the mrepo works with. |
| `follow.js` | The requests followed, as they move: each record arriving in an mrepo's request layers (pending, execute, done), and its children's in view `(<dir>/main/<name>/`, theirs too), printed as it is stored, one compact line a record, its envelope's topic the full path (/boot/request/done, /boot/main/host/request/pending/default). |
| `layer.js` | Records in a layer of the repository (a git branch): one JSON document a record, at the branch's root, `<name>.json.` |
| `record.js` | A record: the base's minimum, { topic, timestamp, headers, value }; the headers left empty for now (their use to be planned). |
| `view.js` | A repository's folder: `<work>/mrepos/<name>/`, its git on disk (.git), and a layer's files at the path of its URI (/inbox at `<work>/mrepos/<name>/inbox).` |
