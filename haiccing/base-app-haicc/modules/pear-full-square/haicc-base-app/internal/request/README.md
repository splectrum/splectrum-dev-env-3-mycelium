# request

Sends a command to an mrepo through its inbox folder and waits for the response in its outbox folder.

The command goes as a record: the core holds the parts and where the
completed form is to go back; the envelope around it is addressed to the
mrepo's inbox. Both carry the same key, a GUID made here, which is also
the document's name in both folders.

## Signature

`request(root, parts, { uri, reply, timeout, every })`

- `root`: the mrepo's folder.
- `parts`: the command, its parts as typed.
- `uri`: the mrepo's unique URI; the envelope's topic is `/<uri>/inbox`.
- `reply`: the core's topic, where the completed form goes back.
- `timeout`: seconds to wait, 120.
- `every`: milliseconds between two looks, 200.

## Returns

`{ key, text }`: the request's key, and the response record as it is
stored in the outbox folder.

## Errors

- No response in time: a `Failure` with exit code 4, saying the key. The
  request stays where it is.

## Design

The record is formed and written with `mrepo-base-request`, as an mrepo
does it itself: written under a temporary name, then renamed, so the
runtime never sees half of one.
