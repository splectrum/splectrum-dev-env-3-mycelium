# haicc-base-app

The haicc command's app: the command line that boots the local root and sends commands to the mrepos.

Run with Bare, so it works wherever Bare does. It reads a command line,
and either answers it itself (the usage, the sources), runs the machine
level (`boot/deploy`, `boot/teardown`), or writes the command as a record
into the root mrepo's inbox folder and prints the response. Offered by
`haiccing/base-app-haicc`, whose `run.js` calls `main`.

| | |
|---|---|
| [internal/](internal/) | the command line and what it is made of |
| [test/](test/) | its tests |

## Config

`CONFIG`, in `internal/config.js`: the organisation its packages come
from, `haiccing`; the component the root mrepo is built from,
`base-component-boot`; the root mrepo, named `boot`, its unique URI
`local/boot`; where a completed form is addressed back to,
`/haicc/terminal`.

## Folders

```
<home>/                 HAICC_HOME, else ~/.haicc
  sources.list          the sources registered, a line each
  work/                 HAICC_WORK, else this: the work folder
    mrepos/boot/        the root mrepo: its inbox and outbox folders
    packages/           the package store
    mrepo.json          the work folder's setting
```

Bare itself and whatever starts the app are put in place before it, by
the platform's first step.

## Exit codes

- `0`: done.
- `1`: the command's own error, from the mrepo.
- `2`: not a command, or its arguments wrong.
- `3`: something is missing: the boot mrepo, a package, a download.
- `4`: no response in time.
- `5`: a response with no completed form.

`Failure`, in `internal/failure.js`, carries one with what is said.

## Tests

- `npm test`: the command line read, a record printed, a command sent to
  a folder standing in for the root, the sources, the command line whole.
  No runtime is started.
