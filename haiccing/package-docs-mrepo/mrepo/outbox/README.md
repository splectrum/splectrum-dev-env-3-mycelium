# /outbox

The records the mrepo sends: the completed forms, in an envelope to where
the request's core says. Non-atomic; its one writer, the runtime.

Each record is committed, then written into its folder, `<dir>/outbox/`,
made when the mrepo is built, so it can be watched from the start. A
parent follows its child's outbox folder directly; others subscribe, the
subscriber's runtime copying the new records into its own inbox.
