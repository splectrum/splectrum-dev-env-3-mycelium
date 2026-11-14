# test/mounted/

The package's own test: its protocol as it is mounted, without an mrepo.

The package's `protocol.js` is what a runtime loads. It is loaded here
and checked: what it provides, its config, the layer it brings, and each
action run on a minimal execution.

## What it checks

- **What it provides**: one protocol, `help`, with a function for every
  action configured and no other.
- **Its config, value by value**: the package that brings it; `get` at
  any URI, `extract` at the mrepo itself; no required argument, no
  default action, no state, no target.
- **Its structure**: the help layer it brings, atomic.
- **`extract`**: from small bundles written for the test, each README at
  the URI it documents, the index, the problems; run again, nothing
  written; a README gone from a package, removed; a README against the
  rules, counted; a URI other than `/`, refused; no packages, nothing.
- **`get`**: a URI's help at its three levels, one section by its title,
  the root, a URI given under `/help`; nothing extracted yet, a section
  or a URI that is not there, each said; it writes nothing.
- **Nothing forgotten**: the last test fails when the config names an
  action that was not run here.

## Not here

The help in a running mrepo: extracted by a hook as the mrepo starts or
is initialised, and read with commands through the inbox. That needs a
test mrepo; until this package has one, it is covered by the boot
component's test.
