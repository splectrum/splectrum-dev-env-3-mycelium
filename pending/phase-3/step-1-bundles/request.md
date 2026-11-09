# Request: packages as bundles, published as releases

Part of step 1 (`pending/phase-3/step-1-review/request.md`), agreed with the
human 2026-11-09 ("we are going to implement this straight away; local can
build the releases"). Design: `docs/design/structure.md`, "Packages as
bundles, published as releases", on `main`.

1. **The probe's deciding points**, recorded with what was run: one bundle
   loading another (the pair: HAICC and the package manager as two
   releases); assets served from inside a bundle (Splectral's browser
   files); module types (a bundled `.js` taken as a module); a real
   closure bundled (`p2p-node`'s): it runs, its size, its addons;
   `closure.js` against `bare-module-traverse`.
2. **The package writer makes bundles**: entry points declared in
   `packages.json`, a bundle per entry point (tests included), the tests run
   as bundles, the hashes in a manifest.
3. **Releases**: `tools/publish.sh` makes a release per package (built and
   published by local, with the human's word); the repository the source
   side.
4. **The platform runs bundles**: fetched from the sources, checked by hash
   (the package manager's verify, the warm boot's "intact"), run.

Each part tested as the platform is: every package's full set from a fresh
release, Node.js off the PATH. Where the probe shows a point of the design
wrong, it is discussed with the human before building on it.
