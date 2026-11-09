// A level's boxes, as folders in its view (docs/design/repositories.md, "How
// repositories communicate"; folders for now, no layer kind): the level's
// repository is the host's root, its view <work>/haicc/, so
//   /inbox    <work>/haicc/inbox/    posting is PUT /inbox {message}: the
//                                    message a document under a new name
//   /outbox   <work>/haicc/outbox/   what the level sends: { to, body }, `to`
//                                    an inbox's URI; the dispatcher PUTs it
// Each message a document (mycelium-container-document, JSON), written
// directly by its writer. In the inbox: { from, body }, `from` null for input
// from outside the root. Validated where it entered the root, never again.
import { join } from 'bare-path'
import { documents } from 'mycelium-container-document'
import * as json from 'mycelium-value-json'

export const INBOX = '/inbox'
export const OUTBOX = '/outbox'
export const inbox = work => documents(join(work, 'haicc', 'inbox'), json)
export const outbox = work => documents(join(work, 'haicc', 'outbox'), json)

// The local dispatcher, once over the outbox: a message to this root's inbox
// is PUT there (under the same name, then taken out of the outbox, so a
// restart in between delivers it again, the same); any other stays in the
// outbox (said once): no other root to send it to yet.
export function dispatch ({ work, from = OUTBOX, held = new Set(), say = () => {} }) {
  const out = outbox(work)
  for (const name of out.list()) {
    const message = out.read(name)
    if (message.to !== INBOX) {
      if (!held.has(name)) { held.add(name); say({ main: 'held', message: name, to: message.to }) }
      continue
    }
    inbox(work).write(name, { from, body: message.body })
    out.remove(name)
    say({ main: 'dispatched', message: name, to: message.to })
  }
}

// The repository taking its inbox in: for now each message said (the log
// its record) and taken out (step 5: placed in its queue as a request).
export function takeIn ({ work, say = () => {} }) {
  const box = inbox(work)
  for (const name of box.list()) {
    const message = box.read(name)
    say({ main: 'received', message: name, from: message.from, body: message.body })
    box.remove(name)
  }
}
