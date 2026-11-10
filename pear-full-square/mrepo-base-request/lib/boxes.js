// The host's boxes, as folders in its repository's folder
// (docs/design/repositories.md, "How repositories communicate"; folders for
// now, no layer kind): the host's repository is the host's root, so
//   /inbox    <work>/mrepos/host/inbox/   posting is POST /inbox: a record,
//                                         the inbox naming it
//   /outbox   <work>/mrepos/host/outbox/  what the host sends: a record, its
//                                         addressee in headers.mrepo.to (an
//                                         inbox's URI; null: the outside
//                                         input that asked, which takes it)
// Each record a document (mycelium-container-document, JSON), written
// directly by its writer; it keeps its name as it moves.
import { join } from 'bare-path'
import { viewOf } from './view.js'
import { documents } from 'mycelium-container-document'
import * as json from 'mycelium-value-json'
import { moved, withHeader } from './record.js'

export const INBOX = '/inbox'
export const OUTBOX = '/outbox'
const HOST = 'host'
export const inbox = work => documents(join(viewOf(work, HOST), 'inbox'), json)
export const outbox = work => documents(join(viewOf(work, HOST), 'outbox'), json)

// The local dispatcher, once over the outbox: a record to this root's inbox
// is POSTed there (under the same name, then taken out of the outbox, so a
// restart in between delivers it again, the same); one to the outside (to
// null) stays for its input to take; any other stays (said once): no other
// root to send it to yet.
export function dispatch ({ work, held = new Set(), say = () => {} }) {
  const out = outbox(work)
  for (const name of out.list()) {
    const rec = out.read(name)
    const to = rec.headers?.mrepo?.to
    if (to === null) continue
    if (to !== INBOX) {
      if (!held.has(name)) { held.add(name); say({ runtime: 'held', record: name, to }) }
      continue
    }
    inbox(work).write(name, withHeader(moved(rec, INBOX), 'mrepo', { from: OUTBOX, to: undefined }))
    out.remove(name)
    say({ runtime: 'dispatched', record: name, to })
  }
}
