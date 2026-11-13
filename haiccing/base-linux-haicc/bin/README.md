# bin/

The haicc scripts, a file each; POSIX sh.

| file | |
|---|---|
| `haicc` | The command: it dispatches. A first part starting with `/` goes to `haicc-request`; anything else is the script `haicc-<name>`. |
| `haicc-lib.sh` | What the scripts share, sourced: haicc's folders, the pins, the sources registered. |
| `haicc-sources` | Where packages and third-party components come from: folders linked, downloads over https, the https backup on or off. |
| `haicc-prereq` | What a boot needs, checked: the platform, the tools, the work folder, the sources, Bare; Bare unpacked from the sources. |
| `haicc-boot` | The boot package's bundle run with the Bare put in place: the boot mrepo at the root, its runtime started. |
| `haicc-request` | An mrepo command: the record written into the boot mrepo's inbox folder, its response waited for and printed. |
| `haicc-response.awk` | A response record read: the completed form's output printed, or its error; a scanner, three objects deep. |

## Exit codes

- `0`: done.
- `1`: the command's own error, from the mrepo.
- `2`: not a command, or its arguments wrong.
- `3`: something is missing: a prerequisite, the boot mrepo, a download.
- `4`: no response in time.
- `5`: a response with no completed form.
