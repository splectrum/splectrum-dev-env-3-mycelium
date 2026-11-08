# Rules (draft)

## Single concern, first

The first design rule: every rule below follows from it or gives way to
it.

- **Every part has one concern**: a module, a repository, an operator, a
  process, a step. When a part grows a second concern, it is split by
  concern, not by convenience.
- **One concern, one place.** A concern is implemented once and used
  everywhere it is needed, never copied into the parts that need it.
- **Validation is a concern of the boundary.** Input is validated once,
  where it enters (network handlers, command-line arguments, external
  files and imports), by the one validator for its kind (`mycelium-uri`
  for names and URIs). Internal traffic is valid: internal APIs trust
  their callers and do not check again.
- **Knowledge stays with its concern.** A part knows only what its
  concern needs: mycelium knows no p2p, Splectral's applications know no
  p2p, the p2p series knows no git or management.

## Branches and pending work

- `main` holds settled state. It changes only by plain merges from
  `execute/*`, never by direct commits.
- `pending/default` is always there: an orphan branch, sharing no history
  with `main`, never merged and never deleted. Its tree holds the pending
  requests in `pending/`, with their discussion notes and other data; its
  history is the record of all requests.
- `execute/main` is the execution branch for `main`, from `main`, synced
  with `main` by merging `main` into it before each execution. Execution
  branches are named after their target, `execute/<target>`, which leaves
  room for parallel execution (proposal).
- A package with a product repository is kept updated from here: once
  validated, its folder's history is split (`git subtree split`) and
  plain-merged into the product repository's `main`, never force-pushed.
  The commit messages link the two commits. Product repositories are
  created by the human.
- `overlay/<name>` branches are overlays on `main`: orphan branches
  mirroring `main`'s paths.
- Further data layers, if needed, are `data/<name>` branches.
- Outcomes are data, in the visible state on `main`: results, notes,
  designs, decisions, kept runs. `pending/default` holds the requests and
  the metadata around producing the visible state, nothing more.
- The response to a request, with its execution record (the unit, its
  results), goes to `execute/*` and from there into `main`. Data from a
  unit in operation belongs to its instance; nothing private goes into
  `pending/default`.

## Layers

- A repository is a composition of disjoint layers. `main`, whose history
  `execute` creates, is one; every other layer branch is its own.
- Layers are never merged into each other, only referenced, and can be
  pulled into other repositories with their history.
- *Layer* is the general term (data layers will come). An *overlay* is a
  layer that shares `main`'s paths. Composing branches into one view is
  left open, to be decided later.
- Proposals, to be tested:
  - A capability branch holds the installed modules: the code as deployed,
    as plain folders. Inside, code calls code directly; there is no
    catalogue.
  - A categorisation by capability URI belongs to external APIs, where a
    requester names what it wants and the name must be mapped to an
    implementation. It is deferred to that level, together with the
    local-scope overlay below.
  - Capability branches are named by purpose, not by library: a
    capability branch is a deployed environment holding the whole
    capability layer. The repository name already carries the phase.
  - Local scope is config, in its own overlay: `overlay/config`, by
    `main`'s paths, referring to capabilities by URI (deferred, with the
    categorisation, to the external API level).
  - A layer is *local* (a branch here), *imported* (fetched here with its
    history), or *virtual* (resolved from another repository at compose
    time, never stored here). Private config is a virtual layer from the
    private instance repository.

## Development and deployment

- One development repository per phase; each package is a folder on
  `main` at the path of its product repository, `<org>/<repo>`
  (`pear-full-square/mycelium-uri/`, `splectral/base-view-map/`); a
  project and its component may share a name across organisations.
- The code is developed on `main` as data and deployed as a tree into a
  `capability/<purpose>` branch to operate.
- `capability/default` operates this repository's own functionality.
  `capability/test` is where development deploys and test runs, without
  touching `capability/default`. More test lanes, if needed, are further
  `capability/<purpose>` branches (e.g. `capability/test-isogit`).
- Promotion deploys the tree tested on `capability/test` into
  `capability/default`. The first deployment is a bootstrap by hand.
- Code is tested against every git backend; development may start on
  one (native git, the reference) and add the others.
- Session branches (`claude/…`) are where a cloud session executes until
  told to use `execute/<target>`.
- How branches beyond `main`, `pending/default` and `execute/main` are
  pushed is settled once development is done.

## Commit messages

- First line: the state change.
- Body: the request it answers and why, briefly.
- References to the full details on `pending/default`, with the commit:
  `<commit>:pending/<path>`. The merge into `main` references the
  `pending/default` commit holding the request details.

## Git consequences

- Merges into `main` are plain merges: no squash, no rebase, so execution
  history reaches `main` as it happened.
- No force-push on any branch; history only grows.
- A branch is deleted only after a plain merge: `git branch -d`, never
  `-D`.

## Reserved first segments

A layer branch is named by a reserved first segment; all other branch
names, and all folder names, are free. Current scope; revised as needed.

| Segment | Meaning |
|---|---|
| `main` | The data (the default branch) |
| `pending` | Pending work; also the top folder on `pending/default` |
| `execute` | Execution branches, named after their target |
| `overlay` | Overlays on `main` |
| `data` | Further data layers |
| `capability` | The installed modules, deployed (proposal) |
| `default` | The permanent branch within a namespace (in `execute`, the target names it) |

## URIs

Scope: branch names and repository folders, wherever XPath is used.

- Every URI starts with a branch name, from the root: `/main/x/y`,
  `/overlay/config/x/y`. The branch part is unambiguous, because a branch
  is always a leaf.
- Relative within a repository: `/`-separated segments; no scheme, query
  or fragment.
- Segments, for branches and folders alike: lowercase `a-z`, `0-9`, `-`.
  Any folder can then become a branch, and the other way round. `_` is
  reserved (Data names).
  Inside a value, a segment is a data name in its URI form (Data names).
- A file's segment includes its extension: a name as above, then
  optional `.`-separated extensions of the same characters
  (`request.md`). At this level a leaf is an object, and its storage
  format is part of its name.
- Inside our repositories every name is lowercase, files included.
  Uppercase names are external (`README.md`, by convention elsewhere).
- URIs are case-insensitive. A URI coming in is validated into its
  canonical, lowercase form and selected; external content keeps its own
  case, and the requester gets the object as stored. That lookup is the
  boundary's process; inside, paths match exactly.
- A name is never both a branch and a prefix.

## Records and topics

Scope: the data the platform produces and keeps as records:
configuration, audit, metrics, events, state (`notes/topics.md`).

- **Two levels, side by side in a repository.** Records in topics are
  the lower level. Objects (`.md`, `.js`, a JSON document, any git
  object) are the higher level: they exist in their own right, without a
  record level under them. An object may also be generated from records:
  a change log of records, in a topic, whose fold is the object (a git
  tracked file generated by its change log). The record level is never
  required.
- **The elementary data container is a Kafka record**, compatible with
  Kafka's record. Partial for now: only the properties needed so far,
  each added later with Kafka's name and meaning.
- **The data is the record's `value`**; its schema is the data's schema.
  Additional metadata goes in the record's `headers` (the header values'
  schema is open).
- **Data lives in topics, in Kafka's sense**, single-partition for now,
  with Kafka's functionality built basic and evolving (towards mycelium's
  p2p Kafka). State is never written directly: it is built from topics.
- **Kafka's names, wherever possible**, with Kafka's meaning: record,
  key, value, timestamp, headers, offset, topic, partition, segment,
  producer, consumer, committed offset, retention, log compaction. Our own
  additions get names of their own and say so (archiving, sealing).
- **Property names are data names** (below), in records, values and
  header keys. Kafka's own property names already are.
- **JSON first.** AVRO later, with values in the form avsc gives them now.
- **Never a secret** in any property of any record.

## Data names

Scope: the names of properties in records, values and headers, and of
anything that becomes an AVRO name (`notes/topics.md`).

- **lowerCamelCase**: letters `a-z`, `A-Z` and digits `0-9`, starting
  with a lowercase letter: `publicKey`, `readyMs`,
  `routingTable`.
- **No two capitals in a row**: `dhtUrl`, not `dhtURL`.
- **Practically case-insensitive**: no two names that differ only in
  case (`publicKey` and `publickey` never both).
- **One form in JSON, in memory and in AVRO**: a data name is a valid
  JSON key, JavaScript identifier, AVRO name and Kafka header key as it
  is. No mapping between them.
- **In a URI, its URI form**: each capital becomes `-` and the letter in
  lowercase (`publicKey` → `public-key`); back, `-` and a letter become
  the letter in capitals. Exact both ways under the rules above.
- **`_` is reserved**, in data names and URI segments alike: it adds
  nothing to readability, and it is the one character left for an
  encoding, should one be needed (foreign names at the boundary, for
  instance).
- **Other mappings later**, at the boundary, for external names that
  break these rules.

## Open

- Execution branch prefix: `execute/<target>` (as here) or
  `execution/<target>`.

- Whether history may be rewritten to remove leaked data.
