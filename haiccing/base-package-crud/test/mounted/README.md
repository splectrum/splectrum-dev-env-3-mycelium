# test/mounted/

The package's own test: its protocol as it is mounted, without an mrepo.

The package's `protocol.js` is what a runtime loads. It is loaded here
and checked: what it provides, its config, and each action run on a
minimal execution in memory.

## What it checks

- **What it provides**: one protocol, `crud`, with a function for every
  action configured and no other.
- **Its config, value by value**: the package that brings it; `create`,
  `read` and `delete` anywhere in `main`, no `update`; a target for
  `create` and `delete`, their optional arguments; no state.
- **Its actions**: a node created with its path, what is written and
  what is answered; read as one node and as a selection; deleted, with
  and without `recurse`; each repeated.
- **What each refuses**, writing nothing; a shortcut read as a node.
- **Nothing forgotten**: the last test fails when the config names an
  action that was not run here.

## Not here

The protocol in a running mrepo: nodes created, read and deleted through
the inbox, on the execution's branch of `main` and merged back; its
config in effect on a request from outside, `update` answered with the
actions there are. That needs a test mrepo; until this package has one,
it is covered by the `haicc` command's end to end test.
