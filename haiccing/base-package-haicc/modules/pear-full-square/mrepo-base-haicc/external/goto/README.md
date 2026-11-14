# goto

Goes to a node position and executes the command that follows there, or sends it on where the node is a shortcut.

`haicc` alone is `haicc/goto`: the protocol's default action. The command
that follows is the action's arguments, its parts as typed. It can be a
`haicc` itself, so commands concatenate, each URI local to the mrepo it
is in.

## Signature

`goto(exec, { uri, args })`: requested as `haicc <URI> <command>`.

## Arguments

The command that follows, its parts: `<protocol>/<action> <URI>
<argument>...`.

## Returns

What the command returns: executed here, its value; sent on, the response
of the mrepo it was sent to.

## Errors

- No command follows: `missing argument: command`.
- The URI runs through a shortcut.
- A position inside `main` other than the root: not built yet.
- Those of the command itself.

## Design

- **At a shortcut** the command is sent on unchanged: the hop takes its
  own `haicc <URI>` off and nothing is rewritten. This request waits for
  the response.
- **At an ordinary node** the command is executed here, in the context of
  the position: forward visibility only, nothing above it is reachable.
  The command that follows stands at the position: its URI is read
  behind the position, as its prefix. For now `main`'s root only, and
  the mrepo itself for its own commands.
- **URIs are relative**: `haicc . <command>` is the root, `haicc host
  <command>` the position `host`. The form holds the URI as its
  segments, `["main", "host"]`.
- **Local and remote at once**: `haicc . boot/teardown host` is a command
  at the root about the shortcut as an item; `haicc host service/start`
  goes through it.
