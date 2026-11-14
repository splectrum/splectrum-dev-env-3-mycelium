# main

Runs one haicc command line: prints what it answers, says an error on stderr, returns the exit code.

The package's `run.js` calls it with the arguments, the environment and
the Bare running it, and exits with what it returns.

## Signature

`main(argv, { env, bare, io })`

- `argv`: the command line's parts, after `haicc`.
- `env`: the environment's variables, below.
- `bare`: the Bare to run the boot with; the one running this by default.
- `io`: `{ out, err, stdio }`, a line printed, a line said on stderr, and
  the stdio the boot is run with; the console and `inherit` by default.

## Environment

- `HAICC_HOME`: haicc's own folder, `~/.haicc` by default.
- `HAICC_WORK`: the work folder, `<home>/work` by default.
- `HAICC_TIMEOUT`: seconds to wait for a response, 120.
- `HAICC_RAW=1`: the response record printed as stored, one line.
- `HAICC_OUTPUT=1`: the completed form's output alone printed.
- `HAICC_WIDTH`: the width the unpacked record is fitted to, 80.

## Returns

The exit code, a number.

## Design

- **A command for the mrepos**, `haicc <URI> <protocol>/<action>
  <argument>...`: written into the root mrepo's inbox folder; the
  response record printed whole, unpacked across lines; exit 0 when its
  completed form holds an output, 1 an error, which is also said on
  stderr.
- **The machine level**, `haicc boot/deploy` and `haicc boot/teardown`:
  above the root mrepo, in the same form.
- **Its own**: `haicc sources`, the usage.
- Every failure is said as `haicc: <message>`.
