# haiccing (folder)

The `haiccing` organisation's repositories, as they are developed here,
each at `haiccing/<repo>`, in the package structure
(`package-docs-template/`):

- Packages, each one protocol: `base-package-runtime/`, the runtime;
  `base-package-protocol/`, the activation of protocols;
  `base-package-help/`, help; `base-package-boot/`, the boot protocol;
  `base-package-service/`, the service; `base-package-haicc/`, haicc.
- Components, several packages deployed together: `base-component-boot/`,
  the initial boot mrepo and the program that puts it in place;
  `base-component-haicc/`, the haicc mrepo.
- `base-app-haicc/`: the `haicc` command, an app run with Bare.
- `base-linux-haicc/`: the first step on Linux, sh scripts: Bare put in
  place and the `haicc` that starts the app.
- `package-docs-template/`, `package-docs-mrepo/`: the documentation
  packages.

Their `modules/` are assembled by `tools/package-assemble.js`, their
bundles written into `sources/` by `tools/package-bundle.js`; all of it
by `tools/release.js`. Each is written to its repository from here.
