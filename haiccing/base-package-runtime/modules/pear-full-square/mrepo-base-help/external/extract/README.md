# extract

Writes the mrepo's help layer from the READMEs of its linked packages, replacing what was there.

An internal request: the runtime places `help extract /` as the mrepo
starts, before it takes requests from the inbox. It reads the packages
manifest and the bundles in the mrepo's `packages/`.

## Signature

`extractAction(exec, { uri })`: `uri` is `/`, the whole mrepo.

## Returns

`{ readmes, changed, problems }`: the READMEs extracted, whether anything
changed, the number of problems against the rules. A log entry says the
same, a warning when there are problems.

## Errors

A URI other than `/`.
