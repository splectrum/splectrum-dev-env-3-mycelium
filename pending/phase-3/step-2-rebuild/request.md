# Request: step 2, the rebuild on the new design

Part of `pending/phase-3/request.md` ("The phase", 1 and 3). Agreed with the
human, 2026-11-09, after step 1's review (`pending/phase-3/step-1-review/`);
it replaces the earlier request for packages as bundles, which this one
covers.

The code rebuilt on the design decided in step 1 (`docs/design/` on `main`:
`repositories.md`, `structure.md`, `values.md`, `modules.md`): packages as
bundles, published as releases (built by local); mycelium repositories at
every level, the host's install included; logs as topics, centralised by
the swarm (the composition by read-only reference into data hives); the
demos on the rebuilt platform, improved a bit (centralised logs and a log
viewer; no major new requirement). The existing code a source to take from
where it fits; the review's findings (`steps/1-review/findings.md`)
applied where the rebuild touches the code.

Collaborative: the work is decided with the human as it moves along, each
decision recorded once in `docs/design/`. Execution recorded in
`steps/2-rebuild/`; every package's full set from a fresh release (Node.js
off the PATH) before a merge into `main`; changed and new modules split into
their product repositories. Few pushes.

Done, with step 3 (the documentation): the phase's request fulfilled, as
mapped in `steps/plan.md` on `main`: a proof in principle of an operational
mycelium repository on the HAICC platform.
