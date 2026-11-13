# base-component-haicc

The haicc component: the mrepo a host or a node is managed with, a set of packages and an empty main.

A component is several packages deployed together, with nothing in `main`.
This one makes the haicc mrepo: it can deploy other mrepos, it is service
managed, and it can be addressed at a position and pass commands on.
Applications and demos are deployed on top of it; they bring the
structures in `main`, such as the folders where swarms and their nodes are
created.

| | |
|---|---|
| [mrepo/](mrepo/) | its part of the structure: the list of its packages |
| [test/](test/) | its tests |
| [modules/](modules/) | its code, assembled: ours and the third-party code |

## Packages

| package | brings |
|---|---|
| `base-package-runtime` | the runtime, its layers, `runtime` and `help` |
| `base-package-boot` | the `boot` protocol: deploy, teardown, redeploy |
| `base-package-service` | the `service` protocol and the service state |
| `base-package-haicc` | the `haicc` protocol: goto |
| `package-docs-mrepo`, `package-docs-template` | the documentation |

## Deploying

By the boot mrepo, with a command at the root. The mrepo starts `booted`:
its boot protocol is behind the service's door until it is started.

```
haicc / boot/deploy host base-component-haicc
haicc /host service/initialise
haicc /host service/start
```

## Package

- No protocol and no code of its own: `main.js` is the dispatcher, the
  bundle's main, generated; it offers the tests.

Written from [splectrum/splectrum-dev-env-3-mycelium](https://github.com/splectrum/splectrum-dev-env-3-mycelium).
