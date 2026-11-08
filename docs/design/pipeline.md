# The development pipeline

Status marks: **built** (in the code, tested), **agreed** (decided, not
built), **open** (under discussion).

Where this is going (the roadmap, `notes/plan.md`): this repository as the
code-development repository for the modules of every organisation,
implementing the pipeline's processes end to end, from three angles: cloud
(a session on a GitHub checkout, in a sandbox), local (an always-on Linux
machine, a swarm node, with agents taking part in the local test while
cloud development goes on), and the swarm. Built over time.

## The modules are the source of truth

**Agreed** (the human, 2026-11-07). This repository implements the visible
code transitions of the modules; the changes are committed into the
modules themselves (their own repositories: `pear-full-square/<module>`,
`splectral/<component>`, ...).

- **Tested on the modules themselves**, not on a copy here.
- **Packages are written from the modules** (at their commits), not from
  local copies: a package records which commit of each module it holds.
- This repository keeps its local copies in sync with the modules' commits.

*Why*: code merges from several development environments stay consistent:
they meet in the modules, where merging happens; a package is traceable to
exact module commits.

Consequence: the manual product split (`git subtree split` into each
product repository, `notes/products.md`) goes: the change is made in the
module in the first place.

**Open**: how the local copies are held: git submodules (each module's
folder a checkout of its repository, pinned to a commit; git does the
syncing; a commit here states exactly which module commits it was built
and tested with), or plain folders kept in sync by a tool (today's way:
simpler to edit, but a copy and its module can drift).

## Tailored development environments

**Agreed in direction** (the human, 2026-11-07); the details open. Each
piece of work gets its own development environment, discarded when done:

1. **requirements**: a clear set of what is to be done, and the modules it
   touches;
2. **create**: a new repository from a template;
3. **copy in** the code needed: the modules the requirements name, at given
   commits;
4. **work**: the cloud session implements, committing each change into the
   module's own repository; tests on the modules themselves; packages
   written from the modules at their commits; local taking part in the
   local test through GitHub;
5. **done**: the requirements met, the results where they last; the
   repository discarded.

*Why*: an environment only borrows code, changes it, and gives it back; it
is shaped by its requirements and holds nothing that has to be kept.

**The template** (proposed): what every environment needs and nothing of
one piece of work: the tools (the package writer, release and publish, the
candidate and the local test), `CLAUDE.md` and the working rules, the
workspace setup (Bare, brittle, the dependencies), the requirements' format
and where the work's records go. Improved as each environment learns.

**Copying in** (proposed): in a disposable repository, git submodules are
the natural way: the requirements list each module at a commit, the setup
checks them out as submodules, and the repository records which module
commits it worked on. (This would settle the open question above.)

**What outlives an environment** (proposed):

| what | where |
|---|---|
| code changes | the modules' own repositories, their commits |
| packages, releases | haiccing's repositories and releases |
| the platform's documentation (design, rules, guides) | with the platform, carried by its package (the roadmap's documentation app) |
| the roadmap, requirements, what each environment achieved | a lasting planning repository |
| the tools, the working rules | the template |

**Open** (the human: for now):

1. Who creates and discards an environment (the implementer through
   GitHub's tools, the human, the local agent), and whether discarded means
   deleted or archived.
2. Where the roadmap and the requirements live: `splectrum/roadmap-1`, or a
   new planning repository.
3. Where the platform's documentation lives until the documentation app
   exists (proposed: in the platform's modules, carried by
   `base-package-haicc`).
4. This repository as the source of the template, and retired once its
   contents have their lasting places: whether that is the next piece of
   work, with its own requirements.

## Cloud and local communicate through GitHub

**Agreed** (the human). A cloud session can reach only GitHub; the local
node answers through it too.

## A candidate is rebuilt, not carried

**Agreed** (the implementer's call, given to it by the human). Local
rebuilds a candidate from the same commits and compares the hashes with
cloud's (the packages', the setup's), rather than receiving built files.

*Why*: it proves the build reproducible, and no binaries travel through git.

## Who does what

**Agreed**: the split between agents and the human is the human's, with the
local agent. Coding has maximal autonomy: most guides are for agents; the
platform's user guide is for people and agents alike.

## Tools

**Agreed**: the pipeline's processes become tools of this repository
(today some are scripts in a step's folder: `publish.sh`), and where
possible run on a HAICC platform; decided step by step.

## Branches

**Open**: too early to decide (the human). Today: `main` (settled),
`execute/main` (execution), `pending/default` (requests), a session's
`claude/...`.
