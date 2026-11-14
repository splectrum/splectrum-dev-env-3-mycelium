# base-app-haicc

The haicc command as an app: run with Bare, it boots the local root and sends commands to the mrepos.

One program for the whole command line, on every platform Bare runs on.
A platform's first step puts Bare in place and a `haicc` that starts this
app from its bundle; on Linux that is `haiccing/base-linux-haicc`.

```sh
bare base-app-haicc.bundle /run <argument>...
```

| | |
|---|---|
| [test/](test/) | its tests: the command line run as a program, and the generic ones |
| [test-reports/](test-reports/) | the report of its last pre-release |
| [modules/](modules/) | its code, assembled: ours and the third-party code |

## Commands

```
haicc boot/deploy
haicc . boot/deploy host base-component-haicc
haicc host service/initialise
haicc host service/start
haicc host boot/deploy node-1 base-package-runtime
haicc host haicc node-1 help/get
haicc host boot/teardown node-1
haicc . boot/teardown host
haicc boot/teardown
```

- **A URI first** is a command for the mrepos:
  `haicc <URI> <protocol>/<action> <argument>...`. A URI is relative,
  without a leading slash: `.` is the local root, `host` the position
  `host` in it; `./sources` is a position named like one of haicc's own
  words. Go to this node
  position and execute the command that follows. It is written as a
  record into the boot mrepo's inbox folder; the response record is
  printed whole, unpacked across lines. `--raw` before the URI prints it
  as stored, `--output` the completed form's output alone.
- **A `<protocol>/<action>` without a URI** is the machine level, above
  the root mrepo: `haicc boot/deploy` puts the boot mrepo in place and
  starts its runtime; `haicc boot/teardown` stops every runtime and
  removes what the deploy put in place.
- **`haicc sources`** lists the sources registered; `unlink`, `https`,
  `no-https` and `download` change them.
- **`haicc --help`** prints the forms.

## Record

What a command becomes, in the boot mrepo's inbox folder:

```
{
  "topic": "/local/boot/inbox",
  "key": "f949ad01-34db-4dd9-a5bc-bf438a21028c",
  "timestamp": "2026-11-14T02:02:29.120Z",
  "headers": {},
  "value": {
    "topic": "/haicc/terminal",
    "key": "f949ad01-34db-4dd9-a5bc-bf438a21028c",
    "timestamp": "2026-11-14T02:02:29.120Z",
    "headers": {},
    "value": ["haicc","host","service/start"]
  }
}
```

At the root the command goes plain, `haicc . boot/deploy host x` as
`boot/deploy host x`; anywhere else the `haicc` command goes as it is.
The parts go as typed, unnamed; the mrepo interprets them.

## Exit codes

- `0`: done.
- `1`: the command's own error, from the mrepo, also said on stderr.
- `2`: not a command, or its arguments wrong.
- `3`: something is missing: the boot mrepo, a package, a download.
- `4`: no response in time.
- `5`: a response with no completed form.

## Environment

`HAICC_HOME` and `HAICC_WORK` name haicc's own folder and the work
folder; `HAICC_TIMEOUT`, `HAICC_RAW`, `HAICC_OUTPUT` and `HAICC_WIDTH`
set the wait and the printing. The module's `main` documents each.

## Package

- `run.js`: the program. It hands the command line, the environment and
  the Bare running it to `main` of `haicc-base-app`, and exits with what
  it returns.
- `main.js`: the dispatcher, the bundle's main, generated. The program is
  its `/run` entry, named first so that a URI is never taken for a test.
- No mrepo side: an app is not linked into an mrepo.

Written from [splectrum/splectrum-dev-env-3-mycelium](https://github.com/splectrum/splectrum-dev-env-3-mycelium).
