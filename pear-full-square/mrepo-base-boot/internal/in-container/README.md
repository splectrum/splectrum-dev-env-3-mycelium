# in-container

Tells whether this process runs in a container.

It looks for `/.dockerenv`, and for a container runtime in
`/proc/1/cgroup`.

## Signature

`inContainer()`

## Returns

`true` or `false`.
