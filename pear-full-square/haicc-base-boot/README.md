# haicc-base-boot

HAICC's boot: the cold boot from a release into a level's mycelium
repository, and HAICC's commands, reached through the terminal. Rebuilt in
phase 3 on the design in `docs/design/` (`structure.md`) of the development
repository; built step by step.

- `index.js`: the commands, as a library; `haicc.js`: the command line on
  it, the package's entry. `version` for now.
- `npm test`: its tests, on Bare.
