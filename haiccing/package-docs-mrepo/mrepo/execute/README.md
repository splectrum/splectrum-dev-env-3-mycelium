# /execute/<target>

Execution branches: made from their target (`main`, `runtime`,
`request/execute`), written while a request executes, merged back into
their target only. The action reads its targets through them and writes
only to them.

Derived, not a layer of its own: made when a request executes.
