# Prompt for the local agent

Give this to Claude Code on the local machine (Linux x86-64; git, curl;
`gh` logged in with push access to github.com/haiccing):

> Build, test and publish the next release of the rebuilt HAICC platform
> (requests flowing: the host's repository runs, every `haicc` command is a
> request).
>
> 1. In your clone of https://github.com/splectrum/splectrum-dev-env-3-mycelium,
>    check out `main`, pull, and run `sh tools/install.sh` (no Node.js
>    needed). (No clone yet: clone it first.)
> 2. The publisher's key is `~/haicc-publisher/publisher.secret` (made for
>    the first release). Keep it on this machine only; never commit or print
>    it. If it is missing, stop and tell me: do not make a new one.
> 3. Build, test and publish:
>    `sh tools/publish.sh ~/haicc-release --key-dir="$HOME/haicc-publisher" --push`.
>    It writes the packages (signed), builds `haicc-setup.sh`, tests it in a
>    fresh folder with Node.js off the PATH (the boot, then the cycle:
>    `start /`, a `put` into main and its `get`, `get /`, `stop /`,
>    `shutdown /`; the runtime ending), and only if that passes publishes it
>    as the latest release of `haiccing/base-package-boot`.
> 4. Test the published release as a user would, in a new folder, Node.js
>    off the PATH, by `steps/2-rebuild/handover-local.md`, section 5.
> 5. Record it in `steps/2-rebuild/local-run.md` (a new section, below the
>    first release's): the commit, the release tag, the commands, each result
>    (paste the answers), how long the setup took, and anything found (for
>    the implementer, not fixed there). Commit it on `execute/main`, merge it
>    into `main` (a plain merge: `main` changes only by merges from
>    `execute/*`, `rules.md`), push both. Then tell me the result.
>
> Background, if needed: `steps/2-rebuild/handover-local.md`.
