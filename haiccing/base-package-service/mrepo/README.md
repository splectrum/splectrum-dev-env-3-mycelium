# mrepo/

The service protocol's part of an mrepo's structure: the service state, booted, and its hooks.

- **`runtime/service.json`**: `{ "state": "booted" }`. An mrepo that has
  it is service managed.
- **Its hooks** (`runtime/hooks/`): at `boot`, `service`, `help` and
  `runtime` activated; at `initialise`, its help extracted.
- **Its packages** (`packages/layer.json`): the runtime, the help
  protocol, the protocol protocol, the documentation packages, and this
  package last.

## Runtime config

The state and the hooks are runtime config: laid in only when this
package is the one deployed, the last of its own list. Linked into
another package's list, such as a component's, they are not laid in, and
that package states its own.
