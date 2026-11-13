# base-linux-haicc

The haicc command on Linux: sh scripts that install it, get the sources, boot, and send commands to the mrepos.

haicc on the Linux side of a host. It works before anything else is there:
no Bare, no mrepo. One installer file puts the command on the PATH; from
then on a deployment is a sequence of `haicc` lines, which can be
scripted. Plain POSIX sh.

| | |
|---|---|
| [bin/](bin/) | the scripts |
| [test/](test/) | its test: the whole flow, from the installer to a started host |

## Install

```sh
sh haicc-install.sh
haicc sources link <folder>
haicc prereq
haicc boot/deploy
haicc / boot/deploy host base-component-haicc
haicc /host service/initialise
haicc /host service/start
```

`haicc-install.sh` carries the scripts and the pins, nothing else.
`--home=<folder>` is haicc's own folder, `~/.haicc` by default;
`--bin=<folder>` is where the command is registered.

## Commands

`haicc` only dispatches. A URI starts with `/`, the local root, so:

- **A first part starting with `/`** is a command for the mrepos:
  `haicc <URI> <protocol>/<action> <argument>...`. Go to this node
  position and execute the command that follows.
- **A `<protocol>/<action>` without a URI** is the machine level, above
  the root mrepo, in the same form: `haicc boot/deploy`,
  `haicc boot/teardown`.
- **Anything else** is a script command: `haicc <name> <argument>...`.

| script command | |
|---|---|
| `haicc sources` | the sources registered: the folders, then https |
| `haicc sources link <folder>` | a local folder linked as a source, not copied |
| `haicc sources unlink <folder>` | |
| `haicc sources download [<what>...]` | fetched over https, checked against its pin: `bare`, `third-party`, `<org>`, `<org>/<package>`; nothing named: all |
| `haicc sources https`, `no-https` | https as the backup for what the folders lack, the default, or not |
| `haicc prereq [--check]` | what a boot needs, checked; Bare unpacked from the sources |
| `haicc boot/deploy` | the boot mrepo put in place at the root, its runtime started; there already: kept, its runtime started again |
| `haicc boot/teardown` | every runtime under the work folder stopped; what `boot/deploy` put in place removed: the mrepos, the package store. Bare, the sources and the scripts stay |

## Mrepo commands

The script writes a record into the boot mrepo's inbox folder, waits for
the response in its outbox folder, and prints the response record whole,
unpacked across lines in a compact form: what fits on a line stays as it
is stored, what does not is opened, an entry a line. The exit code comes
from its completed form: 0 an output, 1 an error, which is also said on
stderr.

```
{
  "topic": "/outbox",
  "key": "f949ad01-34db-4dd9-a5bc-bf438a21028c",
  "timestamp": "2026-11-13T02:02:31.745Z",
  "headers": {},
  "value": {
    "topic": "/haicc/terminal",
    "key": "f949ad01-34db-4dd9-a5bc-bf438a21028c",
    "timestamp": "2026-11-13T02:02:29.000Z",
    "headers": {},
    "value": {
      "command": ["haicc","/host","service/start"],
      "protocol": "haicc",
      "action": "goto",
      "uri": "/host",
      "args": ["service/start"],
      "remote": {
        "at": "/host",
        "folder": "main/host",
        "key": "0c1d4c6e-6a52-4e0a-9b4a-0d7c2f0e2f11"
      },
      "output": {"service":"started","state":"started"}
    }
  }
}
```

There is no mrepo context at the command line, so one rule of its own:

```
haicc / boot/deploy host x     written as   boot/deploy host x
haicc /host service/start      written as   haicc /host service/start
```

At the root the command is written plain; anywhere else the `haicc`
command goes as it is and the boot mrepo resolves the position. The parts
go as typed, unnamed; the mrepo interprets them.

- `HAICC_TIMEOUT`: seconds to wait for the response, 120; none in time:
  exit 4, and the request stays.
- `haicc --raw <URI> ...`, or `HAICC_RAW=1`: the record as it is in the
  outbox folder, one line.
- `haicc --output <URI> ...`, or `HAICC_OUTPUT=1`: the completed form's
  output alone printed, not the record.
- `HAICC_WIDTH`: the width the unpacked record is fitted to, 80.

Tearing down, bottom up:

```
haicc /host boot/teardown node-1
haicc / boot/teardown host
haicc boot/teardown
```

## Folders

```
~/.haicc/
  bin/            the scripts
  pins            the pinned Bare, the organisation, the root mrepo
  sources.list    the sources registered
  sources/        what haicc sources download fetched
  bare/           Bare, unpacked by haicc prereq
  work/           the work folder: the boot mrepo, the package store
```

`HAICC_HOME` and `HAICC_WORK` name other folders.

## Network

Only `haicc sources download` reaches the network. An install from linked
sources is offline and repeats exactly.

## Not yet

- Our packages are not published anywhere, so `download` fetches Bare
  only, and says so for the rest. Link a sources folder for them.
- The https backup is recorded and passed to the boot; the mrepos do not
  fetch over https yet.
- One platform is pinned: `linux-x64`.

## Package

- `bin/`: the scripts. `pins`: what they are pinned to.
- `build.sh`: writes `haicc-install.sh` from `bin/` and `pins`. Run it
  after a change to either.
- `haicc-install.sh`: the installer, generated.

Written from [splectrum/splectrum-dev-env-3-mycelium](https://github.com/splectrum/splectrum-dev-env-3-mycelium).
