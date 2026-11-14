# command

Reads a haicc command line and says what it asks for.

A URI is relative, without a leading slash: `.` is the local root,
`host` the position `host` in it. So the first part is a URI, and a
command follows it, unless it is one of haicc's own first words: a
machine level command, `sources`, or the usage's.

## Signature

`command(argv)`: the command line's parts, after `haicc`.

## Returns

One of:

- `{ kind: 'request', uri, parts, print }`: a command for the mrepos.
  `parts` is what is sent; `print` is `raw` or `output` when `--raw` or
  `--output` came before the URI, else null.
- `{ kind: 'machine', protocol, action }`: `boot/deploy`, `boot/teardown`.
- `{ kind: 'sources', args }`.
- `{ kind: 'usage' }`: nothing, `help`, `--help` or `-h`.

## Errors

A `Failure` with exit code 2:

- One word that is no command of haicc's own.
- A URI with no command after it.
- `--raw` or `--output` with nothing after it.
- A machine level protocol alone, an action it does not have, or
  arguments after one.

## Design

There is no mrepo context at the command line, so one rule of its own:

```
haicc . boot/deploy host x     sent as   boot/deploy host x
haicc host service/start       sent as   haicc host service/start
```

At the root the command is sent plain; anywhere else the `haicc` command
goes as it is and the root mrepo resolves the position. The parts go as
typed, unnamed; the mrepo interprets them, so a URI that is not one, a
leading slash among them, is refused there.

A position named like one of haicc's own first words is written with
`./` in front: `haicc ./sources help/get`, `haicc ./boot service/start`.
