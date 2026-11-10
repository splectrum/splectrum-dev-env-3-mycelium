// A record (docs/design/repositories.md, "Every message is a Kafka record"):
// the base's minimum, { topic, timestamp, headers, value }; the headers left
// empty for now (their use to be planned). The onion: a record's value may be
// a record, wrapped. The core is the pre-filled form in a pre-addressed
// envelope: its topic where the completed form is to arrive (the sender
// itself; none: nobody waits for it), its value the request. Each hand-over
// replaces the wrapper (its topic the new place); the core is never rewrapped
// or changed on the way; processing completes the form: its value the
// request with its output (or the error that stopped it).
export const record = (topic, value) => ({ topic, timestamp: new Date().toISOString(), headers: {}, value })
export const complete = (core, result) => ({ ...core, value: { ...core.value, ...(result.ok ? { output: result.value } : { error: result.error }) } })
export const isComplete = core => Boolean(core?.value) && ('output' in core.value || 'error' in core.value)
