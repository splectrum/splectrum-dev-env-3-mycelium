# Values: the data type, encodings, containers, the wire

Status marks: **built** (in the code, tested), **agreed** (decided, not
built), **open** (to settle). Decided with the human, 2026-11-08 (phase 3,
step 1's review).

## Three concerns, a module each

**Agreed.** In `pear-full-square`, each copied into the packages that use it
(`rules.md`: shared in development, copied into packages):

| Module | Concern |
|---|---|
| `mycelium-value` | the data type: values in memory (plain objects, the form avsc gives them), data names (lowerCamelCase, their URI form both ways; moved from `mycelium-uri`, where nothing uses them); encoding handed to a handler |
| `mycelium-value-json` | an encoding, a handler module from the start: one value to bytes and back (`-avro` later, the same way) |
| `mycelium-container-document` | a storage container: one value per file, written atomically (a temporary file, then rename), in the encoding it is given |
| `mycelium-container-lines` | a storage container: one value per line, appended, read in order, for a line-safe text encoding such as JSON |

They replace JSON read and written in five places (`haicc-base-boot`,
`haicc-deployment`, `pkgm-base-manager`, the package writer; only the
package manager atomic) and JSON lines split in three. AVRO's own container
(the object container file) comes with AVRO.

*Why*: the data type, its encoding and its storage are three concerns; with
the encoding a handler, moving from JSON to AVRO is a new module, not a
change to the users.

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
