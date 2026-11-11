# mrepo-base-help

Mrepo help: the READMEs of an mrepo's packages extracted, checked against the rules and retrieved by URI.

The runtime runs the extraction before the mrepo is operational: every
README of its linked packages, at the URI it documents, with a generated
index and the problems found. The `help` protocol reads it. Every package
carrying the module validates its own help with the tests in `validate/`.

| | |
|---|---|
| [external/](external/) | the help protocol's actions |
| [internal/](internal/) | the extraction and the rules |
| [validate/](validate/) | the tests every package carrying it runs on itself |
| [test/](test/) | its own tests |

## Design

- **The README rules** are mechanical: the one-liner, the summary's
  length, self-containment, section titles; on the whole tree, links,
  cascade, reach. No AI needed.
- **Mounted by `base-package-runtime`**, whose `protocol.js` offers `help`.
- **Next, on the roadmap**: the external API structured, protocols and
  actions; URI dismantling; the help flag, a command rewritten as a help
  command with the original request as its input.

## Tests

- `npm test`: parsing, extraction, retrieval, the rules.
