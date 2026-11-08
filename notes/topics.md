# Data in topics: design

Status: **proposed, 2026-11-01**, from the discussion on Splectral's
data. Not started. The module is `mycelium-topic`; its repository is to
be created in `pear-full-square`. The rules this note follows are in
`rules.md` (Records and topics).

## The rule

- **The elementary data container is a Kafka record.** Compatible with
  Kafka's record, partial for now: only the properties needed so far.
- **Data lives in topics, in Kafka's sense.** A topic is a named,
  append-only stream of records; for now every topic has a **single
  partition** with one producer. The functionality is Kafka's (append,
  offsets, segments, retention, consumers reading from an offset), built
  basic and evolving towards mycelium's own p2p Kafka (`vision.md`): our
  implementation, on our storage, peers taking on what a broker does; no
  brokers, no Kafka wire protocol.
- **Kafka's names, wherever possible.** Where there is a Kafka term, it
  is used with its Kafka meaning: record, key, value, timestamp, headers,
  offset, topic, partition, segment, producer, consumer, committed offset,
  retention, log compaction. Additions of our own get names of their own
  and say so.
- **All configuration, audit and metrics data is produced into topics**,
  from the ground up. Current state is never written directly: it is
  built from topics.

## Two levels: records and objects

- **Records are the lower level**: topics of Kafka records, as below.
- **Objects are the higher level**: the `.md`, `.js` and other files a
  repository holds, a JSON document, any git object. They sit alongside
  topics in the same repository and exist in their own right, with no
  record level under them. The record being the base data structure does
  not make everything a record.
- **An object may be generated from records**: a change log of records,
  in a topic, whose fold is the object. For a git tracked file, the change
  log's records carry its changes and the file is their fold, the same
  mechanism that builds state. Then both levels are present: the topic is
  the source, the object a view (committed, or built when read).
- **Reading follows the level.** Targeting a topic gives its records;
  targeting an object gives the object as it is, its format by extension.
  Where an object is a JSON document holding records (an archived segment,
  a list of records), it is read as an array of records.

## The record

**Now: a partial Kafka record, the data in `value`, all JSON.**

```json
{ "value": { "module": "p2p-node-manager", "kind": "node-ready", "time": 1761980000000, "uri": "/hosts/node-1" } }
```

| Property | Kafka's meaning | Now |
|---|---|---|
| `value` | the record's data | **used**: JSON; the data's schema is the schema of `value` |
| `key` | what the record is about; partitioning and compaction | not yet: records are taken in offset order |
| `timestamp` | when the record was created | not yet (a time in the value where the data needs one) |
| `headers` | an ordered list of key–value pairs: metadata about the record | **available** for additional metadata (origin, correlation of an action and its result, format, schema reference); **the header values' schema is to be discussed** |
| `offset` | the record's position in its partition, assigned by the partition | assigned, never written by the producer |

- **Property names are data names** (`rules.md`, Data names):
  lowerCamelCase (letters and digits), starting with a lowercase letter,
  no two capitals in a row, no two names differing only in case; `_`
  reserved. The same name in
  JSON, in memory and in AVRO (`publicKey`); in a URI addressing into a
  value, its URI form (`…/value/public-key`). Kafka's own property names
  already are data names.
- **Never a secret**, in any property.

## Where data lives, and how it is read

- **Data lives in objects, addressed by URI**:
  - files in folders on a host;
  - paths in a repository's layer;
  - entries on a drive, a core later.
- **Every read returns an array**, as xpath does: a URI resolves to
  zero or more items, never to a bare value. Everything downstream
  (parsing, model, display) handles arrays only. Items are records where
  the target is at the record level, objects otherwise.
- **An object holding records** holds one or more: a JSON object is one
  record; a JSON array, its elements.
- **A partition is a directory**: targeting it reads its records in
  offset order, across its segments (below). A topic, with a single
  partition, is read the same way.
- **Formats by extension**: `.json` now; `.avro` later (AVRO objects and
  object container files). A parser per format, its output always an
  array of records in the same JavaScript form.
- **Values in the form avsc gives AVRO data**: plain objects, strings,
  numbers (times in milliseconds), booleans, null, arrays. Keys and hashes
  are hex strings now and become `bytes` (or a logical type) when
  declared. Nothing downstream changes when a topic moves from `.json` to
  `.avro`.
- **No schemas for now.** Values are read and displayed by their shape;
  specific handling matches on what a source says it holds. With AVRO,
  handlers respond to the value's schema, by its name or fingerprint.

## The partition

- **Offsets**: one monotonic number per partition, from 0, continuing
  across segments and restarts. Records are read in offset order.
- **Segments**, as in Kafka: a partition is stored as segments, each
  named by its base offset (its first record's offset), so reading from an
  offset finds its segment by name.
  - The **active segment** is the one being produced into: a directory,
    one object per record (or a small batch), each immutable once
    written (`topic/partition-0/00000000000000004200/`).
  - Segments **roll** on a regular policy, every N records or every
    period of time, not at a restart. A restart is a record like any
    other, and the partition runs on across it: on start, the producer
    finds the active segment and its last offset.
  - **Archiving** (our addition): a closed segment's directory is
    replaced by a single object holding its records in order, under the
    same name. Now a JSON array (`00000000000000004200.json`); with AVRO,
    an object container file (one schema in its header, the records in
    compressed blocks). Reading does not change: a consumer never needs to
    know which segments are archived, and offsets stay as they were.
  - **Sealing** (our addition): an archived segment's object gets a hash,
    carried in a header of the next segment's first record, so archived
    segments form a chain and can be verified as a whole. On a core or in
    git this sits on top of the storage's own integrity.
- **Retention**, as in Kafka: archived segments kept, or removed, by
  policy.
- **Live and history by one rule**: live data in small immutable records;
  history in compact objects. A replica fetches archived segments whole
  and the active one record by record.
- **One producer per partition.** Who archives: the producer when a
  segment rolls, first; later an operator of its own (`vision.md`,
  operators).

**Operations:**
- produce: append a record, getting its offset;
- consume: read from an offset;
- follow: be told when a record is appended;
- roll a segment, archive and seal it;
- apply retention;
- fold into state, at the latest offset or any past one;
- verify the chain of sealed segments.

**Consumers keep their committed offset**, as in Kafka: the offset they
have processed up to, itself produced into a topic of their own, so a
consumer resumes where it was and a new one starts from 0.

## Three kinds of data, one mechanism

| Kind | Policy |
|---|---|
| **configuration** | the fold of its records in offset order is the current configuration; every change is a record, so history, audit and rollback (an earlier value produced again) come for free; log compaction once records carry a `key` |
| **audit** | kept (retention: forever), sealed segment by segment |
| **metrics** | segments roll on time; archiving may summarise (detail recent, summaries old) |

## State is a view

- `state.json`, `swarm.json` and `node.json` become views: folded from
  their topics in offset order, rebuilt on start, cached at most, never
  the source of truth.
- Splectral's model is the same fold, in its server and in the browser.
- A view can be built at any past offset: replay, and "what did the swarm
  look like then", are the same operation.

## The module: `mycelium-topic`

Single concern: topics of Kafka records, as above, on any storage.
- **Storage-agnostic**: host folders, repository layers, drives and
  cores, over a small contract (list, read and write objects by path; be
  told of changes). It knows nothing of p2p or of what its records carry.
- **Mycelium's Kafka layer** (`vision.md`), starting basic: single
  partitions, JSON, the record's properties as needed; AVRO containers for
  archived segments, keys, compaction and more partitions as they are
  needed.
- **Used by all**: the node managers and the swarm manager, the observer
  (through its manager), Splectral, later repositories' own records.
- **First version**: produce, consume from an offset, follow, fold,
  rolling, archiving with sealing, committed offsets, the JSON parser and
  the host-folder storage.

## What it changes

- The managers' `manager.jsonl` and `node.jsonl` become topics, produced
  through `mycelium-topic`; their `state.json` and the swarm manager's
  `swarm.json` become views.
- The observer's events reach its manager's topic for the node.
- Splectral's sources consume topics from an offset and follow them; its
  model folds them.
- **Property names**: the p2p series' events are camelCase already
  (`publicKey`, `readyMs`), so they stay; step 7 checks them against the
  data names rule (no two capitals in a row).
- **Validation in one place, at the boundary** (`rules.md`, URIs): four
  modules carry their own copies of the old segment check (`p2p-rns`,
  `p2p-mrepo`, `p2p-node`'s requests, the vault in `p2p-node-manager`),
  against the rule. In step 7 they go: `mycelium-uri` is the one
  validator, its rule updated (data names in URI form), applied only
  where input enters (network handlers for the name service and request
  intake, command-line arguments, external files and imports); internal
  APIs trust their callers.
- Records already committed (steps 0 to 6) stay as they are: they are
  the record of those steps.

## Open

1. **The header values' schema**: what metadata goes in headers, under
   which keys, and how values are encoded (Kafka's header values are
   bytes; JSON for now).
2. **Segment policy**: sizes and periods per kind of data.
3. **Offsets on a core**: an offset equal to a block index (`vision.md`),
   with segments as ranges of blocks, or segments as objects on a drive.
4. **Batching in the active segment**: one record per object first;
   small batches when volume asks for it.
5. **Which record properties come next, and when**: `key` (with
   compaction), `timestamp`.
