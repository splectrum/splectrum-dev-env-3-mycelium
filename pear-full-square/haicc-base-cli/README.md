# haicc-base-cli

HAICC's terminal input. HAICC is a repository's API (the type `haicc`,
`haiccing/base-package-haicc`, its API declared in the package's
`api.json`); the terminal is one of its inputs: a command is a request,
`haicc [protocol] <action> <uri> [body]`, posted as a record to the host's
inbox, validated, queued, executed and recorded by the repository, its
answer printed. Installed by the boot (`haicc-base-boot`) into the host's
packages and run from `base-package-haicc`'s bundle. Built step by step
(phase 3, step 2).

```sh
haicc start /
haicc put /main/notes/hello.json '{"text":"hi"}'
haicc get /main/notes/hello.json
haicc stop /
haicc shutdown /
```

- `index.js`: `parse`, `send`, as a library; `haicc.js`: the command line
  on it, the package's entry.
- `npm test`: its tests, on Bare.
