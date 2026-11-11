# /help

The mrepo's documentation, extracted from the packages it links. The
runtime writes it as it starts, before the mrepo is operational, so it
always matches the packages actually linked.

```
/help/README.md                          the mrepo itself (package-docs-mrepo's mrepo/README.md)
/help/<layer>/README.md                  a layer (package-docs-mrepo's mrepo/<layer>/README.md)
/help/packages/<org>/<package>/...       each linked package's READMEs, its folders kept,
                                         its carried modules included
/help/index.json                         { "<uri>": { title, oneliner, links } }
```

## Usage

- **Read with `runtime help <uri>`**, body `{ level, section }`: the
  README documenting that URI, with each link's one-liner. Levels:
  `oneliner`, `summary` (the default), `detail`.
- **The index is generated**: each README's one-liner and its links,
  resolved to help URIs. `/packages` also links to every linked package.
- **A documentation package** (no entry point) brings READMEs only. One
  whose `package.json` names a `help` folder documents the mrepo itself:
  that folder's READMEs go to the root.
