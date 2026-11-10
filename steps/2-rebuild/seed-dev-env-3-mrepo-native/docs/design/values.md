# Values: the data type, encodings, containers, the wire

Status marks: **built** (in the code, tested), **agreed** (decided, not
built), **open** (to settle). Decided with the human in phase 3 (from
2026-11-08, step 1's review).

## Three concerns, a module each

**Agreed.** In `pear-full-square`, each copied into the packages that use it
(`rules.md`: shared in development, copied into packages):

| Module | Concern |
|---|---|
| `mycelium-value` | the data type: values in memory (plain objects, the form avsc gives them), data names (lowerCamelCase, their URI form both ways; moved from `mycelium-uri`, where nothing uses them); encoding handed to a handler |
| `mycelium-value-json` (**built**) | an encoding, a handler module from the start: one value to bytes and back (`-avro` later, the same way) |
| `mycelium-container-document` (**built**) | a storage container: one value per file, written atomically (a temporary file, then rename), in the encoding it is given; time-ordered names for added documents |
| `mycelium-container-lines` | a storage container: one value per line, appended, read in order, for a line-safe text encoding such as JSON |
| `mycelium-container-bundle` | a read-only storage container of files: a bundle's files listed, one read by its offset and length (the header and a slice, never the whole file in memory), extracted where needed; written only by the package writer (agreed 2026-11-09: a bundle's assets and data files read this way, `structure.md`) |

They replace JSON read and written in five places (`haicc-base-boot`,
`haicc-deployment`, `pkgm-base-manager`, the package writer; only the
package manager atomic) and JSON lines split in three. AVRO's own container
(the object container file) comes with AVRO.

*Why*: the data type, its encoding and its storage are three concerns; with
the encoding a handler, moving from JSON to AVRO is a new module, not a
change to the users.

## URIs name a logical structure

**Agreed** (the human, 2026-11-09). Our URIs apply to a logical structure,
not a physical one: a path goes on through an object whose type mycelium
knows. A bundle added to a repository as an object is browsed as if it were
extracted, once `mycelium-xpath` handles the bundle type (through
`mycelium-container-bundle`): `/main/releases/haicc.bundle/app/page.html`
names a file inside the bundle, read by its offset and length, nothing
extracted. Reading assets from a bundle (`structure.md`) is the first case
of it; other object types (a JSON document's values, a topic's records)
follow the same way. `rules.md` (URIs: "a leaf is an object") is changed
when it is built.

## A topic in git: a reference, or sealed records

**Agreed** (the human, 2026-11-09). A topic (a Hypercore: append-only, its
key, its length, its Merkle tree signed by its writer) is added to a
repository as a git object **by reference**, not copied: `{ "type":
"topic", "key", "length", "root" }` pins the topic at a length (it only
grows, so "the topic at length N" never changes, verified by its root).
A commit pins the topic as everything else (pin first, then resolve); a
unit that read a topic reruns exactly; the object is tiny whatever the
topic's size; `mycelium-xpath` browses it by URI as a type
(`/main/logs/node-1.topic/1841` a record, the whole topic at its pinned
length), the records fetched from Hypercore (replicated if remote) and
checked against the root. It is the composition for centralised logs: the
swarm's repository holds topic references to its nodes' log topics, a
read-only reference into another repository's data, a new commit moving the
pins. Where a copy is wanted (a backup by export, an archive), a topic's
records up to a length are **sealed** into a git blob (JSON lines, through
the lines container): another object type, added when needed. The topic's
appends and the reference's commits are each done by their store's single
writer (`structure.md`).

## Formats on Bare

**Built** (what Bare and our tree offer, checked 2026-11-08, Bare v1.36.0):
JSON (text; built in); `structuredClone` (in memory: dates, maps, sets,
typed arrays, cycles, never functions; its `serialize()` gives an in-memory
tree, not bytes); `compact-encoding` (Holepunch's binary encoders, composed
by code; in our tree through Hypercore, used by `p2p-channel`); `hyperschema`
(declared, append-only versioned schemas generating compact-encoding; in our
tree through Hypercore); `avsc`: not installed here, barified already by the
human (`bare-for-pear/avsc-rpc`), its RPC server split out
(`bare-for-pear/rpc-server`; later avsc versions dropped it).

Functionally, the code that generates a value is equivalent to the value: a
value's format is a choice inside `mycelium-value`, not a rule about code.
JSON first (`rules.md`), AVRO later, in the same module family.

## Envelope and content

**Agreed** (the direction; AVRO itself to come). compact-encoding is the p2p
layer's envelope: a Hypercore block, a Protomux message, carrying what the
layer needs (message type, ids, lengths, offsets). AVRO is the content: the
typed value, encoded against its schema, carried in the envelope as opaque
bytes (`c.buffer`). The p2p layer knows no schemas. Today the content is
JSON (`p2p-channel`'s `c.json`; the topics' records as JSON files); AVRO
replaces the content's encoding, the envelope stays.

A Kafka record on Hypercore: the block a compact-encoded envelope
(timestamp, key, headers), its `value` AVRO bytes in AVRO's single-object
form (the schema's fingerprint first), so any reader knows the schema that
wrote it.

| | AVRO | compact-encoding (+ hyperschema) |
|---|---|---|
| schema | declared, JSON, language-neutral | code (declared with hyperschema) |
| evolution | writer/reader schema resolution (defaults, aliases, promotion) | by hand (hyperschema: append-only versions) |
| ecosystem | cross-language; Kafka's usual format | Holepunch's, JS; native to Bare |
| our use | the content: typed values, records, RPC | the envelope: blocks, Protomux messages |

## RPC on the replication connection

**Agreed** (the direction; built with AVRO). Between two peers there is one
connection (Hyperswarm, UDX and Noise) and on it Protomux's channels:
Hypercore's replication, `p2p-rns`, `p2p-request` (**built**), and an AVRO
RPC channel would be one more: the handshake once, then each call a message
name and its encoded arguments, one AVRO message per Protomux message. Not an
inline call: a message on an open connection, so no connection to set up (no
DHT lookup, holepunch or Noise handshake), and one round trip where
communicating through replicated data takes several (append, `have`, `want`,
the block) and needs the reader following. The barified RPC server is the
real-time data communication tool, run over several protocols; Splectral's
server gets it with the move to AVRO.

- **Replication for state, RPC for the conversation**: repositories and
  topics replicated (durable, recomputable); Splectral's live view, actions
  and requests by RPC (immediate, recorded at the boundary); one connection
  per pair of peers for both; near real time for requests
  (`repositories.md`).
- **Open**, to measure, not anticipate: replication's large transfers queued
  ahead of a call on the one ordered connection.
