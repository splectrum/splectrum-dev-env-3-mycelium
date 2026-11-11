# external/

The boot protocol's actions, each run by the parent mrepo inside its execution context.

| | |
|---|---|
| [deploy/](deploy/) | a child mrepo built from a target package and started |
| [teardown/](teardown/) | a child's runtime stopped and the child removed |
| [redeploy/](redeploy/) | teardown, then deploy |
