# bin/

The first step's scripts, a file each; POSIX sh.

| file | |
|---|---|
| `haicc` | The command, as registered. Its own: `sources link`, `sources download bare`, `prereq`, and the first part of `--help`. Anything else: the app started with the Bare put in place, the command line passed on as typed; not startable yet, what is missing said. |
| `haicc-lib.sh` | What the scripts share, sourced: haicc's folder, the pins, the sources registered. |
| `haicc-sources` | A folder linked as a source; Bare's runtime downloaded over https, checked against its pin. |
| `haicc-prereq` | What the command needs to start, checked: the platform, the tools, a source holding the app, Bare; Bare unpacked from the sources. |

## Exit codes

- `0`: done.
- `2`: its arguments wrong.
- `3`: something is missing: a prerequisite, a download.

The app's own are passed through.
