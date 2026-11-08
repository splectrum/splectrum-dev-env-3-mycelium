# Product repositories

Each module's product repository follows its folder here: once validated,
the folder's history is split (`git subtree split`) and plain-merged into
the product repository's main. Recorded per update.

| Folder | Product repository | Dev commit | Split head | Product commit |
|---|---|---|---|---|
| `mycelium-git` | `pear-full-square/mycelium-git` | `eee62cc` | `693c5a5` | `3e021c4` |
| `mycelium-git` | `pear-full-square/mycelium-git` | `f4b9d1d` | `1dd99c5` | `c97f3a0` |
| `mycelium-git` | `pear-full-square/mycelium-git` | `ccbe05f` | `2d8ef6f` | `37bf41d` |

- `mycelium-git` at `3e021c4`: this phase's folder started as a copy of
  phase 1's, so its split history was unrelated to the product's; the
  merge joins them (`--allow-unrelated-histories`), taking this folder's
  files, and keeps the product's LICENSE. Later splits merge plainly.
- `mycelium-git` at `c97f3a0` (step 1): back to its backend contract, p2p-git
  from `pear-full-square`, id `64072bc6-cb98-4383-9d48-480f5d119889`; a
  plain merge, the previous split head an ancestor of the new one.
- `mycelium-git` at `37bf41d` (step 3): engines given as modules, a tree's
  entries in git's order on every engine; id
  `7cadb8e9-88c5-4b56-8baf-5988072a0cc8`.
- `mycelium-uri`, `mycelium-xpath`: unchanged since phase 1
  (`dev-env-1-mycelium-git@33634de`) until step 7, when `mycelium-uri`
  changed and was merged (below).
- `mycelium-node`: the first build's module, removed in step 1; it never
  had a product repository.
- `p2p-git`: used at `d7d154d`, which carries this phase's fixes; now
  `pear-full-square/p2p-git` (below).

## The p2p series and the managers (2026-10-31)

All in `pear-full-square` (the design: `node-pattern.md`, `plan.md`):

| Module | Repository | State |
|---|---|---|
| `p2p-store` | `pear-full-square/p2p-store` | `ec382f5` (step 2, from dev `adbbc29`) |
| `p2p-dht` | `pear-full-square/p2p-dht` | `6b1f41b` (step 2, from dev `adbbc29`) |
| `p2p-connect` | `pear-full-square/p2p-connect` | `a26b020` (step 2, from dev `adbbc29`); `d4961c4` (step 5, from dev `2a7816d`: connecting to a peer by key) |
| `p2p-replicate` | `pear-full-square/p2p-replicate` | `0b46561` (step 2, from dev `adbbc29`) |
| `p2p-channel` | `pear-full-square/p2p-channel` | `c4fb7c7` (step 2, from dev `adbbc29`) |
| `p2p-git` | `pear-full-square/p2p-git` | moved from `bare-for-pear/p2p-git`, `main` at `d7d154d`; mycelium-git's dependency names it since step 1 |
| `p2p-node-manager` | `pear-full-square/p2p-node-manager` | `63d9628` (step 4, from dev `9f67efa`); `584c2a0` (step 5, from dev `2a7816d`: provisioning through the auxiliary swarm); `bf52040` (step 6, from dev `a73df80`: joining from an invitation) |
| `p2p-swarm-manager` | `pear-full-square/p2p-swarm-manager` | `4e4b807` (step 4, from dev `9f67efa`); `375a95c` (step 5, from dev `2a7816d`: join); `7e6a79b` (step 6, from dev `a73df80`: invite, controlled in status) |
| `p2p-rns` | `pear-full-square/p2p-rns` | `30d9186` (from dev `596e314`: the resource name service in code, steps 4 to 6; its first merge, unrelated histories joined, the repository's LICENSE kept) |
| `p2p-mrepo` | `pear-full-square/p2p-mrepo` | `a5b8ba1` (from dev `596e314`: mycelium repositories on the p2p layer, steps 3 to 6; its first merge, unrelated histories joined, the repository's LICENSE kept) |
| `p2p-node` | `pear-full-square/p2p-node` | `a554890` (from dev `0d5537d`: the node application of steps 4 to 6, its first merge, unrelated histories joined, the repository's LICENSE kept) |

The five p2p modules were merged into their product repositories in step 2
(`steps/2-p2p-series/product/`): each repository's initial commit (its
LICENSE) joined to the folder's split history, so later splits merge
plainly. Their tests run in this repository, where the series is one
dependency tree (npm workspaces): a module's development dependencies on
another of the series (`p2p-dht` for `p2p-connect`'s test, `p2p-store` for
`p2p-replicate`'s) name it by package name, which only the workspace
resolves. Publishing the series as a package (the capability store) will
settle how they resolve elsewhere.

## Splectral (2026-11-01, created, empty until their first merge)

Designed in `splectral.md`, not started. Each repository holds its LICENSE
only until the module is validated and merged.

| Module | Repository |
|---|---|
| `splectral-contract`, `-model`, `-transport`, `-server`, `-shell` | `pear-full-square/<module>` |
| `splectral-replay`, `-scenario`, `-timeline` | `pear-full-square/<module>` |
| `splectral-p2p-watchers`, `-actions`, `-observer` | `pear-full-square/<module>` |
| `base-view-map`, `base-demo-other-host` | `splectral/<module>` |

## Step 7 (2026-11-01): data in topics and Splectral

From dev `ab76875`; every row in `steps/7-splectral/10-validation/products.md`.
Changed: `mycelium-uri` (its first merge from this phase), `p2p-rns`,
`p2p-mrepo`, `p2p-node`, `p2p-node-manager`, `p2p-swarm-manager`. New, first
merges: `mycelium-topic`, the Splectral platform (`splectral-contract`,
`-model`, `-transport`, `-server`, `-shell`, `-replay`, `-scenario`,
`-timeline`, `-p2p-watchers`, `-p2p-actions`, `-p2p-observer`) in
`pear-full-square`, the applications `base-view-map` and
`base-demo-other-host` in `splectral`.

## Step 8 (2026-11-02): liveness

Every row in `steps/8-liveness/6-validation/products.md`. Changed, plain
merges: `p2p-rns`, `p2p-node`, `p2p-node-manager`, `p2p-swarm-manager`,
`splectral-contract`, `-model`, `-scenario`, `-p2p-watchers`,
`-p2p-actions` in `pear-full-square`; `base-view-map` in `splectral`. New:
`base-demo-liveness` (`splectral`), its first merge.

## Step 9 (2026-11-02): click and run

Every row in `steps/9-click-and-run/8-validation/products.md`. The
folders moved to `<org>/<repo>`; splits are of `pear-full-square/<module>`
since. New, first merges: `haicc-reconcile`, `haicc-deployment`. Changed,
one join after the move: `p2p-node`, `p2p-node-manager`,
`p2p-swarm-manager`, `splectral-server`, `-shell`, `-transport`,
`-scenario`, `-p2p-actions`. The `haiccing` projects
`base-demo-liveness` and `base-demo-other-host`: their first merges, done
by the local agent from dev `04bcb84` (after step 10), in the same table.

## Step 10 (2026-11-02): the deployment on the swarm

Every row in `steps/10-deployment-on-swarm/7-validation/products.md`:
`p2p-node`, `p2p-node-manager`, `p2p-swarm-manager`, `haicc-reconcile`
(plain merges), `splectral-p2p-observer` (its join after the move). The
`haiccing` projects: their first merge includes step 10's changes (step 9's
table).

## Fixes from the demos' local run (2026-11-04)

`haicc-deployment` (its readable summary): split `9ca4ff0`, product
`415cf3a`, a plain merge, verified. `steps/10-deployment-on-swarm/8-local-run-fixes/`.
