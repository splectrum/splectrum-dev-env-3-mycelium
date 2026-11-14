# base-package-boot

The boot protocol: it deploys, tears down and redeploys the mrepos linked in an mrepo.

An mrepo that links it can deploy others inside itself. A deployed mrepo
is built from a target package's list, gets its own runtime, and is linked
at its position by a shortcut. The first mrepo of a host, the boot mrepo,
is put in place by `haiccing/base-component-boot`, which links this
package.

| | |
|---|---|
| [test/](test/) | its tests: its protocol as mounted, and the generic ones |
| [test-reports/](test-reports/) | the report of its last pre-release |
| [modules/](modules/) | its code, assembled: ours and the third-party code |

## Commands

```
haicc / boot/deploy host base-component-haicc
haicc /host boot/deploy node-1 base-package-runtime
haicc /host boot/redeploy node-1
haicc /host boot/teardown node-1
haicc / boot/teardown host
```

- `boot/deploy <name> <package>`: the mrepo built at that position from
  the package's list, its runtime started, its shortcut placed. The
  package alone means `haiccing/<package>`.
- `boot/teardown <name>`: its runtime stopped, the mrepo and its shortcut
  removed.
- `boot/redeploy <name> [<package>]`: both in turn.

A target is needed: an mrepo cannot deploy or tear down itself. A position
that exists locally, as data in `main`, cannot be a target.

## Package

- `protocol.js`: the `boot` protocol, its config and its actions, from
  `mrepo-base-boot`.
- `main.js`: the dispatcher, the bundle's main, generated.
- No structure of its own.

Written from [splectrum/splectrum-dev-env-3-mycelium](https://github.com/splectrum/splectrum-dev-env-3-mycelium).
