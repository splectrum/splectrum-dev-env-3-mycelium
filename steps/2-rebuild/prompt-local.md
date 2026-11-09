# Prompt for the local agent

Give this to Claude Code on the local machine (Linux x86-64; git, Node.js
and npm; `gh` with push access to github.com/haiccing), in a fresh folder:

> Clone https://github.com/splectrum/splectrum-dev-env-3-mycelium and check
> out the branch `execute/main`. Read `CLAUDE.md`, `rules.md`, then
> `steps/2-rebuild/readme.md` and `steps/2-rebuild/handover-local.md`.
> Do the handover's steps 1 to 3: install, make the publisher's key (once:
> keep `publisher.secret` on this machine only, never commit or print it,
> and tell me where it is so I can back it up), then build and check the
> release without publishing (`sh tools/publish.sh ~/haicc-release
> --key-dir="$HOME/haicc-publisher"`). Then look around the checked folder
> by hand as the handover shows (`status`, `read /`, `read /packages`,
> `read /packages/manifest.json`). Do not publish (`--push`) until I say so.
> Record what you ran and saw in `steps/2-rebuild/local-run.md` (the commit,
> the tag it would publish, the commands, each result with `haicc status`
> pasted, how long the setup and the boot took, what was not checked, and
> anything found, for the implementer: not fixed there). Commit it and push
> to `execute/main`. Then tell me the result and wait for my word on
> publishing.
