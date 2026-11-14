# test/configured/

The component's own test: what defines the haicc mrepo, its list and its hooks, without an mrepo.

The component brings no code of its own: it is a list of packages and
the hooks that say what the mrepo offers. They are checked value by
value, then against the packages listed, read from the sources.

## What it checks

- **Its list**: the packages in deploy order, the component last.
- **Its hooks, file by file**: each with its transition and its command;
  the state the mrepo starts in. A hook file not named in the test fails
  it.
- **The packages it lists**: each has its bundle in the sources; the six
  protocols they provide, one a package.
- **Every hook names what exists**: a protocol and an action a listed
  package provides; the protocol it opens or closes is provided too.
- **What its hooks do**: run with the listed packages' own actions, on a
  minimal execution in memory. After the boot `haicc`, `help`, `runtime`
  and `service` are open; `initialise` extracts the help; `start` opens
  `boot`, `stop` closes it again, `shutdown` returns to booted. Every
  hook file must have run in that walk.
- **Nothing left closed by forgetting**: every protocol the listed
  packages provide is opened by a hook, except the protocol protocol, on
  purpose; and what `start` opens, `stop` closes.

## Sources

`SOURCES`: the sources folder, with the listed packages' bundles. Without
it the test fails: it cannot say anything about the packages.

## Not here

The component deployed as a running mrepo: its hooks fired by the runtime
and the service, the gate refusing a request for `boot` while the door is
closed, a node deployed inside it. That needs a test mrepo; until this
package has one, it is covered by the boot component's test and the
`haicc` command's.
