# base-package-haicc

The haicc protocol: a command executed at a node position, or sent on where the node is a shortcut.

`haicc <URI> <command>` means: go to this node position and execute the
command that follows. At a shortcut, a node whose data originates in
another mrepo, the command is sent there unchanged. The command can be a
`haicc` itself, so commands concatenate. An mrepo that links this package
can be addressed at a position and can pass commands on to the mrepos
linked in it.

| | |
|---|---|
| [test/](test/) | its tests: its protocol as mounted, and the generic ones |
| [test-reports/](test-reports/) | the report of its last pre-release |
| [modules/](modules/) | its code, assembled: ours and the third-party code |

## Commands

```
haicc . boot/deploy host haiccing/base-component-haicc
haicc host service/initialise
haicc host haicc swarms/swarm-1 boot/deploy node-1
```

`haicc` alone is `haicc/goto`, the protocol's default action.

## Package

- `protocol.js`: the `haicc` protocol, its config and its action, from
  `mrepo-base-haicc`.
- `main.js`: the dispatcher, the bundle's main, generated.
- No structure of its own: the `xpath` layer, where the shortcuts are, is
  the runtime package's.

Written from [splectrum/splectrum-dev-env-3-mycelium](https://github.com/splectrum/splectrum-dev-env-3-mycelium).
