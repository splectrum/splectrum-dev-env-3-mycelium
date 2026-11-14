# sources

Reads and writes the list of registered sources, and answers the haicc sources command.

A source is where packages and third-party components come from. The
list is the file `sources.list` in haicc's own folder, a line a source:
`folder:<path>`, a local folder, or `github:<org>`, https as the backup.

## Signature

- `sources(home)`: the list in that folder.
- `sourcesCommand(home, args, { org, err })`: `haicc sources <args>`;
  `org` is the organisation, `err` takes a line for stderr.

## Returns

`sources` returns:

- `list()`: the sources, the folders first in the order they were linked,
  then the others.
- `folders()`: the folders' paths.
- `find(name)`: a file's path in the first folder that holds it, or null.
- `register(entry)`, `unregister(entry)`: a line added once, or removed.

`sourcesCommand` returns the lines to print.

## Actions

| | |
|---|---|
| `haicc sources` | the sources registered |
| `haicc sources unlink <folder>` | a folder taken off the list |
| `haicc sources https`, `no-https` | https as the backup for what the folders lack, or not |
| `haicc sources download [<what>...]` | `<org>`, `<org>/<package>`; nothing named: the organisation |

## Errors

- An action that is not there, or its arguments wrong: a `Failure`, exit
  code 2.
- A download that could not be made: each said, then a `Failure` with
  exit code 3. Our packages are not published anywhere yet, so every
  download ends so.

## Design

Linking a folder and fetching Bare are not here: they are needed before
Bare is on the machine, so they belong to the platform's first step. Both
write the same list.
