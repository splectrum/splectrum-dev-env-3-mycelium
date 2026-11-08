# mycelium-topic

Topics of Kafka records, in Kafka's sense, single partition, on any
storage. Mycelium's Kafka layer, starting basic (design:
`notes/topics.md` in `splectrum/dev-env-2-p2p-cluster`).

```js
import { openTopic, committedOffsets, folderStorage } from 'mycelium-topic'
const t = await openTopic({ storage: folderStorage(dir), roll: { records: 1000, ms: null } })
await t.produce({ value: { kind: 'node-ready' }, headers: [{ key: 'origin', value: 'p2p-node-manager' }] })  // → offset
await t.consume(0)                       // [{ offset, value, headers? }], in offset order
const stop = t.follow(0, records => {})  // told of new records
await t.fold((state, r) => state, {})    // state, at the latest offset, or { to }
await t.verify()                         // the chain of sealed segments
```

- **The record**: a partial Kafka record, `{ value, headers? }`, JSON.
  The offset is assigned by the partition, never written.
- **Segments**, as in Kafka, named by base offset. The active segment is
  a directory, one object per record. It rolls by policy (records per
  segment, or age), never at a restart.
- **Archiving and sealing** (our additions): a rolled segment becomes one
  object (a JSON array), and its hash goes in a `previousSegment` header
  of the next segment's first record, so archived segments form a chain.
- **Retention**: keep the last n archived segments.
- **Committed offsets**: a consumer's, in a topic of its own.
- **Storage contract**: `list`, `read`, `write` (whole), `remove`,
  `isDirectory`; `folderStorage(root)` implements it on the host.
- **One producer per partition.** No dependencies.

`npm test`: 8 tests.
