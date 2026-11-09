# Prompt for the local agent

Give this to Claude Code on the local machine (Linux x86-64; git, Node.js,
npm; `gh` logged in with push access to github.com/haiccing):

> Build, test and publish the first release of the rebuilt HAICC platform.
>
> 1. Clone https://github.com/splectrum/splectrum-dev-env-3-mycelium (branch
>    `main`) and run `PUPPETEER_SKIP_DOWNLOAD=1 npm install` in it.
> 2. If `~/haicc-publisher/publisher.secret` does not exist, make the
>    publisher's key: `tools/bare tools/setup/keygen.js ~/haicc-publisher`.
>    Keep `publisher.secret` on this machine only; never commit or print it;
>    tell me where it is so I can back it up.
> 3. Build, test and publish:
>    `sh tools/publish.sh ~/haicc-release --key-dir="$HOME/haicc-publisher" --push`.
>    It writes the packages (signed), builds `haicc-setup.sh`, tests it in a
>    fresh folder with Node.js off the PATH (ending with `haicc status`:
>    six layers, a signed manifest, two packages), and only if that passes
>    publishes it as the latest release of `haiccing/base-package-boot`.
> 4. Test the published release as a user would, in a new folder, Node.js
>    off the PATH:
>    `curl -fL -o haicc-setup.sh https://github.com/haiccing/base-package-boot/releases/latest/download/haicc-setup.sh`,
>    `sh haicc-setup.sh ~/haicc-work`, then
>    `~/haicc-work/setup/bare ~/haicc-work/haicc/packages/haiccing/base-package-haicc.bundle status`.
> 5. Record it in `steps/2-rebuild/local-run.md`: the commit, the release
>    tag, the commands, each result (paste `haicc status`), how long the
>    setup took, and anything found (for the implementer, not fixed there).
>    Commit and push to `main`. Then tell me the result.
>
> Background, if needed: `steps/2-rebuild/handover-local.md`.
