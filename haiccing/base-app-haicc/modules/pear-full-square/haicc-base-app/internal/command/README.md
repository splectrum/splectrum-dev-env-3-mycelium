# command

Reads a haicc command line and says what it asks for.

A URI starts with `/`, the local root, so a first part starting with `/`
is a command for the mrepos. A `<protocol>/<action>` without a URI is the
machine level. Anything else is the app's own.

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

- No command by that name, or no such action at the machine level.
- A URI with no command after it.
- `--raw` or `--output` without a URI after it.
- Arguments after a machine level command.

## Design

There is no mrepo context at the command line, so one rule of its own:

```
haicc / boot/deploy host x     sent as   boot/deploy host x
haicc /host service/start      sent as   haicc /host service/start
```

At the root the command is sent plain; anywhere else the `haicc` command
goes as it is and the root mrepo resolves the position. The parts go as
typed, unnamed; the mrepo interprets them.
