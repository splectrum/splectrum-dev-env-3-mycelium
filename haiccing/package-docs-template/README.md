# package-docs-template

The haiccing package structure, documented. Each folder here is a part
of a structure unit; its README says what goes there.

## A structure unit

A folder, at any level: a package, a further unit inside it, a test, an
example. Every part is optional; a part present gives the unit what it
is for.

| part | the unit then |
|---|---|
| `run.js` | can be executed on its own: `bare run.js [arguments]` |
| `main.js` | its dispatcher, the bundle's main (generated): `run(target, { dryRun })`, every entry by path (`/run`, `/protocol`, `/deploy`, the tests: [test/](test/)); as the program, the target named, else `/run`; imported, nothing runs |
| `deploy.js` | brings structure beyond its protocols: its part of the mrepo and its requirements, to the parent's `boot deploy` |
| `protocol.js` | provides protocols: their configs and actions; linked into an mrepo, its protocols are loaded by the runtime; they are offered to the outside once activated |
| `modules/`, `package.json` | carries its own dependencies |
| `mrepo/` | comes with an mrepo, by layers |
| `test/` | has tests and test sets |
| `<name>/` | holds a further unit, by its URI part name |
| `example/` | has examples |
| `README.md` | says what it is; extracted into an mrepo's help layer |

| | |
|---|---|
| [mrepo/](mrepo/) | an mrepo's definition, by layers |
| [test/](test/) | tests, a folder each, and the sets |
| [name/](name/) | a further unit |
| [example/](example/) | examples, a folder each |
| [modules/](modules/) | its dependencies, assembled: the help module its tests use |

## The rules

- One structure, many purposes: a definition, documentation in place,
  examples, tests.
- A package depends only on packages.
- A documentation package is marked `"docs": true` in its `package.json`:
  it brings no structure at deploy; its READMEs go to the help layer. Its
  dispatcher exposes its tests.
- Entry points, each optional: `run.js` (executed on its own),
  `deploy.js` (deployment only), `protocol.js` (protocol actions).
- A collection folder (`test/`, `example/`) holds units, a folder each;
  it is not a unit itself.
- Examples in `example/<name>/`, never a reference to another package.
- No install code in a unit: building an mrepo is the framework's.
- What a person reads is what the repository will hold: expanded folders,
  carried in the package's bundle and read from it by path.
- `modules/` is assembled, never edited by hand.
- **READMEs cascade**: a unit's README links to the README of each folder
  below it, and each of those to theirs, so from the top every folder is
  reached. The exceptions: no README inside a layer of `mrepo/` (it would
  be committed into it; `mrepo/`'s own README covers its layers), and
  `modules/<org>/<module>/` brings its own (linked from `modules/`'s,
  written when the modules are assembled).

## READMEs

Every README is read by people and extracted into an mrepo's help layer,
where `help get` serves it at three levels. Its shape:

```markdown
# <name>

<one-liner>

<summary, then the links table>

## <section>
```

1. **One-liner**: the first paragraph, one sentence of at most 120
   characters, saying what the item is. No parentheses, no references.
2. **Summary**: everything up to the first `##` heading, at most 100
   words: what it does and how it is used, then the table of links to the
   folders below. Everything else goes into sections.
3. **Self-contained**: no references to the development repository
   (`docs/`, `steps/`). A README stands on its own or links within its
   package.
4. **Every README has a one-liner**, lists of tests included.
5. **Section titles are short, stable nouns** ("Usage", "API", "Tests",
   "Design"), at most three words, or a file's name, so a section can be
   asked for by name.

`tools/help-extract.js` in the development repository checks them.

## Modules

A unit's dependencies, with the `package.json` listing what it starts
from. Assembled from those modules, all the way down; never edited by
hand.

```
modules/
  <org>/<module>/      ours, copied whole
  node_modules/        the third-party code, and links to ours by name
  third-party.json     each third-party module: version, licence, where from
```

The unit's code reaches it by relative path:
`./modules/<org>/<module>/index.js`. Our modules find each other by name,
through `modules/node_modules/`.

In a package, `modules/README.md` is generated when the modules are
assembled: it links to each of ours.

## Methods

Inside one of our modules, a documented method is a directory: its
`index.js` and its `README.md`, under one of two folders.

- `external/`: the methods mounted as protocol actions, `(exec, form)`.
- `internal/`: the methods called by code, never requested.

Only the methods that matter are documented. Smaller ones live in the
method they belong to, listed in its README under "Also exported"; a
helper with nothing to document is a plain file. A method's README: the
one-liner, the summary, then `Signature`, `Arguments` for an action, `Returns`,
`Errors`, as they apply. The module's `index.js` exports its methods.

## package.json

```json
{
  "name": "base-package-example",
  "description": "An example package.",
  "private": true,
  "license": "MIT",
  "type": "module",
  "main": "run.js",
  "modules": ["<org>/<module>"],
  "scripts": { "test": "bare test/run.js" }
}
```

`modules`: our modules the unit starts from; what they use is worked out
from them ("Modules", above).

## Running

A package is released as one bundle, its main the dispatcher (`main.js`),
and run with Bare:

```sh
bare <package>.bundle [arguments]
```

A target first runs that entry (`bare <package>.bundle /test/validate`).
From its folder, the same: `bare main.js [target] [arguments]`. Imported, a
bundle runs nothing: a runtime takes its protocols (`run('/protocol')`), a
deploy its structure (`mrepo/`, read from the bundle).

The boot is a bundle like the others. What has to be there before any
bundle can run, Bare and the sources, is put in place by the `haicc`
scripts (`haiccing/base-linux-haicc`), which are plain sh.

```sh
haicc boot/deploy
```

Written from [splectrum/splectrum-dev-env-3-mycelium](https://github.com/splectrum/splectrum-dev-env-3-mycelium).
