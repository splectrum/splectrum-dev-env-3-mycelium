# The local run: the first release of the rebuilt platform

2026-11-09, on the local machine (Linux x86-64, WSL2; Node.js 24.21.0, npm
11.19.0; `gh` as `jules-tenbos`), following `prompt-local.md`, with the
human's word to publish.

- **Commit:** `61dd0a4` (`main`).
- **Release:** `setup-a6d039296165` of `haiccing/base-package-boot`, latest,
  published 2026-11-09T10:02:12Z:
  https://github.com/haiccing/base-package-boot/releases/tag/setup-a6d039296165
  Assets: `haicc-setup.sh` (28,807,819 bytes, sha256 `02032870…abd9b7c`),
  `manifest.json` (4,861 bytes).
- **The publisher's key:** made here, `~/haicc-publisher/` (the secret on
  this machine only). Public key
  `21d1d69a7c9930073e30b962a97b4fedc99c2f485b2189163fc28aa47ef7f5bd`.

## What was run, and the results

| Step | Command | Result |
|---|---|---|
| Clone, install | `git clone` (branch `main`), `PUPPETEER_SKIP_DOWNLOAD=1 npm install` | done, 78 s; 0 vulnerabilities |
| The key | `tools/bare tools/setup/keygen.js ~/haicc-publisher` | made; the secret 0600 |
| Build and check, not published | `sh tools/publish.sh ~/haicc-release --key-dir="$HOME/haicc-publisher"` | passed, 45 s; `read /`, `read /packages`, `read /packages/manifest.json` answered as expected |
| Publish, first try | the same with `--push` | build and check passed; the publishing failed on a network timeout (`TLS handshake timeout`); nothing published |
| Publish, second try | the same with `--push` | passed, published, 71 s |
| From GitHub | `curl -fL -o haicc-setup.sh https://github.com/haiccing/base-package-boot/releases/latest/download/haicc-setup.sh` | identical to the local build (sha256) |
| The setup, from GitHub | `sh haicc-setup.sh ~/haicc-work`, `env -i`, `PATH=/usr/local/sbin:/usr/sbin:/sbin:/bin:/usr/bin` | passed, 3.8 s (setup and boot together) |
| The setup, without Node.js | the same download, a PATH of links to the system's tools leaving out `node`, `nodejs`, `npm`, `npx`, `corepack` | passed, 4.8 s; `haicc status` as below |

`haicc status` from the published release (`~/haicc-work`):

```json
{
  "level": {
    "repository": "level",
    "id": "1b06446b-2f47-451c-8386-59f8c1745a23",
    "key": "32746da4e175c97af480aa68d0c6fd6819b61d54e70c8d1104ef5ff30e5161dd",
    "work": "/home/herma/haicc-work"
  },
  "layers": [
    "/execute/main",
    "/main",
    "/packages",
    "/request/done",
    "/request/executing",
    "/request/pending/default"
  ],
  "manifest": {
    "sequence": 1794218496,
    "signed": true,
    "runtime": {
      "bare": "v1.36.0"
    }
  },
  "packages": [
    {
      "package": "haiccing/base-package-boot",
      "id": "1a45fc119571dc48",
      "bytes": 3457773,
      "deployed": false
    },
    {
      "package": "haiccing/base-package-haicc",
      "id": "32f43a5b8bec86f0",
      "bytes": 3406806,
      "deployed": true
    }
  ]
}
```

## Not checked

The setup on another machine, or on another platform than Linux x86-64
under WSL2; the tests from the bundle (not built yet, `readme.md`); that a
tampered manifest or bundle is refused, end to end.

## Found, for the implementer (not fixed here)

1. **"Node.js off the PATH" does not hold where Node.js is in `/usr/bin`**,
   as here: `tools/publish.sh`'s check and the handover's use a PATH with
   `/usr/bin`, so `node` was still reachable. The setup does pass without
   it (the last row above, by hand), but the script's check does not prove
   that on such a machine.
2. **The tag is the boot bundle's hash only.** Reading `tools/publish.sh`: a
   release changing only `base-package-haicc` (or the setup's other content)
   gets the tag of the one before, and the script then says "there already"
   and publishes nothing. Here the same tag came from different builds:
   the cloud session's and this one, and the setups of two builds of this
   commit differ (28,807,286 and 28,807,819 bytes; the manifest's sequence
   differs too).
3. **A failed check for an existing release reads as "not there".** The
   script's `gh release view` failing for any reason goes on to `gh release
   create`. Harmless here (the create failed as well), but only the create's
   own refusal stands between a network error and a second release.
4. `prompt-local.md` says to push this record to `main`; `rules.md` says
   `main` changes only by merges from `execute/*`. It went to `execute/main`
   and was merged.
