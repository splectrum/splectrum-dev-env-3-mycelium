# mrepo-base-haicc

The mrepo haicc protocol: a command executed at a node position, or sent on where the node is a shortcut.

`haicc <URI> <command>` means: go to this node position and execute the
command that follows, in the context of the node where the data originates
from. A script that works on data at one position keeps working when the
structure is moved: only the position it is sent to changes. Offered by
`haiccing/base-package-haicc`.

| | |
|---|---|
| [external/](external/) | the haicc protocol's actions |
| [test/](test/) | its tests |

## Examples

```
haicc / boot/deploy host haiccing/base-component-haicc
haicc /host service/initialise
haicc /host haicc /swarms/swarm-1 boot/deploy node-1
```

## Config

`CONFIG`, in `internal/config.js`: `goto` at any position, and the
protocol's default action. The protocol is not behind the service's door:
the command that follows is checked where it is executed.

## Tests

- `npm test`: goto on a context written for it.
