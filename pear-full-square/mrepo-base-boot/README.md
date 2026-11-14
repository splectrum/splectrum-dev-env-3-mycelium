# mrepo-base-boot

The mrepo boot protocol: deploy, tear down and redeploy a child mrepo, executed by its parent.

A child lives inside its parent, at `main/<name>/`, the shadow of `main`;
the parent holds a node for it in its `main`, a shortcut: only the link. Deploy builds it
from a target package's list, links its packages and starts its runtime.
Teardown stops the runtime and removes the child; redeploy does both. The
module also holds the install routine. Carried by
`haiccing/base-package-boot`, which offers the actions, and by
`haiccing/base-component-boot`, which builds the boot mrepo with the same
routine.

| | |
|---|---|
| [external/](external/) | the boot protocol's actions, a directory each |
| [internal/](internal/) | the install routine and what the actions use, a directory each |
| [test/](test/) | its tests, what each checks |

## Design

- **A documented method a directory**: its `index.js` and its
  `README.md`. Smaller methods live in the one they belong to, listed
  there under "Also exported"; a helper with nothing to document is a
  plain file. The module's `index.js` exports them.
- **External methods** are protocol actions, `(exec, form)`, run inside
  the execution context; the parent's directory comes from
  `exec.runtime.dir`.
- **Internal methods** are called by code: by the actions, and by the boot
  itself before any runtime runs.
- **Not yet**: the requirements resolved into packages; what an action does
  outside the repository, such as a runtime started or a folder removed, is
  not undone by a reset.

## Tests

- `npm test`: the unit tests: building, running a built mrepo on the
  runtime, the actions.
