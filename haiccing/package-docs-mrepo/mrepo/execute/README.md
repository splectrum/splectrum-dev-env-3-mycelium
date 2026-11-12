# /execute/<key>/<target>

Execution branches: a request's own, by its key, holding its writes until they are merged back.

A request executes on branches of its own. Each is made from its target's
head when the request first writes there, and merged back into that target
only, then removed. A failed request's branches are discarded, nothing
merged.

```
/execute/<key>/main              its writes to main
/execute/<key>/runtime           its writes to the runtime layer
/execute/<key>/request/execute   its own record, as it is completed
```

Derived, not a layer of its own.

## Waiting

A request that has passed its command on to another mrepo is waiting: its
record stays in `request/execute` with its remote state, and its branch of
`request/execute` is kept. The branch is where the response is added in,
and the address the other mrepo answers to: `/<mrepo>/execute/<key>`.
