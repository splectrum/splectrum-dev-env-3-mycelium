# haicc-base-cli

HAICC's commands: the terminal's way into the platform, reached by URI.
Installed by the boot (`haicc-base-boot`) into the host's packages and run
from `base-package-haicc`'s bundle. Built step by step (phase 3, step 2).

- `index.js`: the commands, as a library; `haicc.js`: the command line on
  it, the package's entry. `version` for now.
- `npm test`: its tests, on Bare.
