# internal/

The methods of the app, called by its command line, never requested.

| | |
|---|---|
| [main/](main/) | the command line whole: what it prints, its exit code |
| [command/](command/) | a command line read: what it asks for |
| [request/](request/) | a command sent to an mrepo, its response waited for |
| [unpack/](unpack/) | a record unpacked across lines, nothing of it changed |
| [outcome/](outcome/) | a response's completed form: its output or its error |
| [sources/](sources/) | the sources registered, and the `haicc sources` command |
| [boot/](boot/) | the machine level: the root deployed, torn down |

`config.js` is the app's config, `failure.js` a failure with its exit
code, `usage.js` the usage's text.
