# haiccing (folder)

The `haiccing` organisation's repositories, as they are developed here,
each at `haiccing/<repo>`, in the package structure
(`docs/design/packages.md`, `haiccing/package-docs-template/`):

- `base-package-boot/`: the boot; `base-package-runtime/`: the runtime (their
  `modules/` assembled by `tools/package-assemble.js`, their bundles written
  into `sources/` by `tools/package-bundle.js`);
- `package-docs-template/`, `package-docs-mrepo/`: documentation packages.

Each is written to its repository from here. Still in phase 2's structure,
to be redone: `base-package-haicc/`, `base-swarm-three-nodes/`, the demos
(`base-demo-*`, `demos.md`).
