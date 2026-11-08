# Writing tests

For a developer. A package carries its tests, at each level, and they run
bottom up: each module's own, then (agreed) its swarms', then the package's
named tests. All on Bare. The rules: `../rules.md`, "Tests".

## A module's own tests

In the module's `test/`, on `brittle`, run by its `package.json`:

```json
"scripts": { "test": "bare ../../node_modules/brittle/cmd.js test/*.test.js" }
```

(The path holds in this repository and inside a package's `modules/`.)

```js
import test from 'brittle'
import { mkdtempSync, rmSync } from 'bare-fs'
import { join } from 'bare-path'
import { tmpdir } from 'bare-os'

test('what it checks, in words', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'x-'))
  try {
    t.is(1 + 1, 2)
    t.alike({ a: [1] }, { a: [1] })
    t.ok(/ab+c/.test('xabbcx'), 'matches')
    await t.exception(async () => { throw new Error('no') }, /no/)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})
```

- Bare's own modules (`bare-fs`, `bare-subprocess`, ...); no `node:`.
- Write in a temporary folder, never into the module or the package.
- A child process: `spawnSync` from `bare-subprocess` returns buffers
  (`String(r.stdout)`); give it no `input`; for a time limit, run it under
  `timeout`.
- A file written at run time and then imported: `.mjs`, or its folder's
  `package.json` (`"type": "module"`) written first.
- An expected `TypeError` (or another native error): `t.exception.all`;
  `t.exception` rethrows those as bugs.
- A folder listed and its order relied on: sort it (Bare lists unsorted).
- Don't name a local variable `t`: it hides brittle's.
- Setup before a group: `hook(name, fn)`; closing what a file opened: a
  last test in the file (tests run in order).

Run them: `../../tools/bare ../../node_modules/brittle/cmd.js test/*.test.js`
from the module's folder (or with `bare` on the PATH).

## A package's named test

A folder `test/<test>/`, hand-written in this repository at
`haiccing/<repo>/test/<test>/`:

```
test/<test>/
  test.json     { "categories": ["validation", "full"], "needs": ["docker"], "destroys": "..." }
  README.md     what it checks
  test          an executable (sh) that runs in place: exit 0 when it passes
  (or) boot     its cold boot, when it needs a work folder: booted, then torn down
```

- **Every package has `modules-load` and `sets`** (the package writer
  writes them), and the sets `validation` and `full` (its own, else the
  writer's defaults).
- **Add it to the sets** that name it (`test/validation.json`,
  `test/full.json`), and put the same names in its `categories`: the `sets`
  test checks they agree.
- **In place** (`test`): nothing started, nothing changed outside it; the
  package manager runs it. A `.mjs` it runs imports by its path in the
  package (`../../modules/node_modules/brittle/index.js`): a test folder
  has no `node_modules` above it.
- **Booted** (`boot`): `./haicc boot <repo>/test/<test>`; its folder is
  copied into `swarms/test/<test>/` and its `boot` runs there with
  `HAICC_WORK`, `HAICC_PACKAGE`, `HAICC_RUN`. It can call the work folder's
  `./haicc`, set up whatever it needs (the platform test sets up a whole
  install inside its run), check, and print what it does (each step and
  the command it runs). Its exit code is its result. Its teardown, its own
  `teardown` script or the platform's, removes the run.
- **Output**: plain lines; for counts, either `brittle`'s summary or `#
  tests N` and `# pass N`.

## Running a package's tests

```bash
./haicc boot base-package-haicc/test                    # its full set
./haicc boot base-package-haicc/test --set=validation   # nothing started
./haicc boot base-package-haicc/test/platform --keep    # one, its run left to look at
```

The package writer runs every in-place test before it writes a package.
