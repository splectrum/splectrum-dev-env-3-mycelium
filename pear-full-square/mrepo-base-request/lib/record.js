// A record (docs/design/repositories.md, "Every message is a Kafka record"):
// the base's minimum, { topic, timestamp, headers, value }; the headers left
// empty for now (their use to be planned). The onion: a record's value may be
// a record, wrapped. The core is the pre-filled form in a pre-addressed
// envelope: its topic where the completed form is to arrive (the sender
// itself; none: nobody waits for it), its value the request. Each hand-over
// replaces the wrapper (its topic the new place); the core is never rewrapped
// or changed on the way; processing completes the form: its value the
// request with its output (or the error that stopped it).
//
// The key: a GUID set by the sender on the core when the request is made,
// carried by every envelope around it, and the name of its document in every
// layer: a request traced everywhere by it.
import crypto from 'bare-crypto'

export const guid = () => {
  const b = crypto.randomBytes(16)
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = b.toString('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}
export const record = (topic, value, key = null) => ({ topic, key, timestamp: new Date().toISOString(), headers: {}, value })
// An envelope around a record: its key the record's.
export const wrap = (topic, inner) => record(topic, inner, inner?.key ?? null)
export const complete = (core, result) => ({ ...core, value: { ...core.value, ...(result.ok ? { output: result.value } : { error: result.error }) } })
export const isComplete = core => Boolean(core?.value) && ('output' in core.value || 'error' in core.value)
