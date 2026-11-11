# get

Reads the README documenting a URI from the mrepo's help layer, at the level asked.

Each link comes with its own one-liner, so the next step can be chosen
without reading further. A URI with nothing there names the nearest one
that has help.

## Signature

`get(exec, { uri, body })`: `uri` as the mrepo knows it, such as
`/packages/haiccing/base-package-boot`, or under `/help`.

## Body

- `level`: `oneliner`, `summary` (the default) or `detail`.
- `section`: one section, by its title.

## Returns

`{ uri, title, oneliner, links: [{ uri, oneliner }] }`, with `summary` and
the section titles at `summary`, every section at `detail`, or the one
`section` asked for.

## Errors

- No help in this mrepo.
- No help at the URI: the nearest that has it is named.
- No such section: the sections are named.
