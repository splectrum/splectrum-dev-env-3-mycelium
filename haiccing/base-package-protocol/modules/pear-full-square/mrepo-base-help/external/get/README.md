# get

Reads the README documenting a subject from the mrepo's help layer, at the level asked.

Each link comes with its own one-liner, so the next step can be chosen
without reading further. A URI with nothing there names the nearest one
that has help.

## Signature

`get(exec, { args })`: requested as `help/get . <subject> <level>`. What
it is about is an argument, not the request's URI, which is where the
request is executed.

## Arguments

1. The subject, optional: a URI from the mrepo's root, as the mrepo
   knows it, such as `packages/haiccing/base-package-boot`, or under
   `help`. None, or `.`: the mrepo itself.
2. After it, one of two, the summary when none is given:
   - a level: `oneliner`, `summary` (the default) or `detail`;
   - a section's title, its words: that one section.

A level given first, with no subject, is the mrepo itself at that level.

## Returns

`{ uri, title, oneliner, links: [{ uri, oneliner }] }`, with `summary` and
the section titles at `summary`, every section at `detail`, or the one
`section` asked for.

## Errors

- No help in this mrepo.
- No help at the subject: the nearest that has it is named.
- A subject with a leading slash: not a relative URI.
- No such section: the sections are named.
