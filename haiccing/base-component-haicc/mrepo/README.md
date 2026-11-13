# mrepo/

The component's part of the structure: the list of the packages the haicc mrepo is made of.

- **Its packages** (`packages/layer.json`): the runtime, the boot protocol,
  the service protocol, the haicc protocol, this component and the
  documentation packages, in deploy order. Each brings its own part of the
  structure, laid one over the other; the component is laid last of them,
  so the list the mrepo holds is this one.
- **Nothing else**: no protocol, no data. `main` stays empty.
