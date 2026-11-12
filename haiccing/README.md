# haiccing (folder)

The `haiccing` organisation's repositories, as they are developed here,
each at `haiccing/<repo>`, in the package structure
(`package-docs-template/`):

- `base-package-boot/`: the boot; `base-package-runtime/`: the runtime.
- `package-docs-template/`, `package-docs-mrepo/`: the documentation
  packages.

Their `modules/` are assembled by `tools/package-assemble.js`, their
bundles written into `sources/` by `tools/package-bundle.js`. Each is
written to its repository from here.
