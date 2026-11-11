# redeploy

Tears a child mrepo down, commits that locally, then deploys it again.

The package deployed is the body's, else the one recorded for the child.

## Signature

`redeploy(exec, { uri, body })`.

## Body

- `package`: optional; the recorded package when absent.

## Returns

`teardown`'s result and `deploy`'s, merged.

## Errors

Those of `teardown` and `deploy`.
