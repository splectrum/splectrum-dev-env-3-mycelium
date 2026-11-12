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

A request branch that is not being processed has a waiting principal: the
request the branch is named after, which has passed its command on to
another mrepo. Its record is on `execute/<key>/request/execute` only, with
what it waits for; `request/execute` holds only what is being processed.
The branch is the address the other mrepo answers to,
`/<mrepo>/execute/<key>`, and where the response is added, a record of its
own beside the principal.
