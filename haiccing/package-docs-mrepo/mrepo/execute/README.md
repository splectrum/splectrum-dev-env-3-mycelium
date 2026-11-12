# /execute/<key>/<target>

Execution branches: a request's own, by its key, holding its work until it is merged back.

A request is processed on branches of its own, never in a shared place.
Each is made from its target's head, merged back into that target only,
then removed. A failed request's branches are discarded, nothing merged.
No history is kept here: `request/done` has it.

```
/execute/<key>/main              its writes to main
/execute/<key>/runtime           its writes to the runtime layer
/execute/<key>/request/execute   its own record: the principal
```

Derived, not a layer of its own.

## Principal

The request a branch is named after is its principal: the branch id is
the request's key. A request goes from `request/pending` straight onto
`execute/<key>/request/execute`, and that branch only ever adds: the
principal, what it waits for, a child's response, its completion. Then it
is merged into `request/execute`.

## Waiting

A request branch that is not being processed has a waiting principal: it
has passed its command on to another mrepo and says which child it waits
for. The branch is the address the other mrepo answers to,
`/<mrepo>/execute/<key>`, and where the response is added, a record of its
own beside the principal.
