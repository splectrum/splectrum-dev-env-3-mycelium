// The host's boxes, as folders in its repository's folder
// (docs/design/repositories.md, "How repositories communicate"; folders for
// now, no layer kind): the host's repository is the host's root, so
//   /inbox    <work>/mrepos/host/inbox/   posting is POST /inbox {message}:
//                                         the message a document, the inbox
//                                         naming it
//   /outbox   <work>/mrepos/host/outbox/  what the host sends: { to, body },
//                                         `to` an inbox's URI; the dispatcher
//                                         POSTs it
// Each message a document (mycelium-container-document, JSON), written
// directly by its writer. In the inbox: { from, body }, `from` null for input
// from outside the root. Validated where it entered the root, never again.
import { join } from 'bare-path'
import { viewOf } from './view.js'
import { documents } from 'mycelium-container-document'
import * as json from 'mycelium-value-json'

export const INBOX = '/inbox'
export const OUTBOX = '/outbox'
const HOST = 'host'
export const inbox = work => documents(join(viewOf(work, HOST), 'inbox'), json)
export const outbox = work => documents(join(viewOf(work, HOST), 'outbox'), json)

// The local dispatcher, once over the outbox: a message to this root's inbox
// is POSTed there (under the same name, then taken out of the outbox, so a
// restart in between delivers it again, the same); any other stays in the
// outbox (said once): no other root to send it to yet.
export function dispatch ({ work, from = OUTBOX, held = new Set(), say = () => {} }) {
  const out = outbox(work)
  for (const name of out.list()) {
    const message = out.read(name)
    if (message.to !== INBOX) {
      if (!held.has(name)) { held.add(name); say({ runtime: 'held', message: name, to: message.to }) }
      continue
    }
    inbox(work).write(name, { from, body: message.body })
    out.remove(name)
    say({ runtime: 'dispatched', message: name, to: message.to })
  }
}

// The repository taking its inbox in: for now each message said (the log
// its record) and taken out (step 5: placed in its queue as a request).
export function takeIn ({ work, say = () => {} }) {
  const box = inbox(work)
  for (const name of box.list()) {
    const message = box.read(name)
    say({ runtime: 'received', message: name, from: message.from, body: message.body })
    box.remove(name)
  }
}
