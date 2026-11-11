# /execute/<target>

Execution branches: a request's writes, made from their target and merged back into it.

Each is made from its target (`main`, `runtime`, `request/execute`),
written while a request executes, and merged back into that target only. The action reads its targets through them and writes
only to them.

Derived, not a layer of its own: made when a request executes.
