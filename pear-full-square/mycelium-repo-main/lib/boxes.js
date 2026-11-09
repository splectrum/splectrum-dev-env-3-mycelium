// A level's boxes, as files (docs/design/repositories.md, "How repositories
// communicate"): the level's file outbox, written directly by whoever sends
// (each message a document: mycelium-container-document, JSON); each
// repository's file inbox; and the level's local dispatcher between them.
//   <work>/boxes/outbox/              the level's file outbox
//   <work>/boxes/inbox/<repository>/  a repository's file inbox
//   <work>/boxes/received/<repository>/  what a repository took in (for now:
//                                     step 5 turns a message into a request)
// A message: { to, from, body }, `to` a URI in the level's space (the host's:
// /<repository>/<its own URI>), `from` null for input from outside the
// level's root. Validated where it entered the root, never again here.
import { join } from 'bare-path'
import { documents } from 'mycelium-container-document'
import * as json from 'mycelium-value-json'
import { split } from 'mycelium-uri'

export const outbox = work => documents(join(work, 'boxes', 'outbox'), json)
export const inbox = (work, repository) => documents(join(work, 'boxes', 'inbox', repository), json)
export const received = (work, repository) => documents(join(work, 'boxes', 'received', repository), json)

// The local dispatcher, once over the outbox: a message whose addressee
// matches a repository of this level (its prefix) is delivered into that
// repository's inbox, its URI translated into the repository's own (the
// prefix taken off: the mapping at the repository's boundary, inside the
// root, validation none); under the same name, then taken out of the
// outbox, so a restart in between delivers it again, the same. Any other
// stays in the outbox (said once): no other level to send it to yet.
export function dispatch ({ from, to, held = new Set(), say = () => {} }) {
  const prefixes = Object.keys(to)
  for (const name of from.list()) {
    const message = from.read(name)
    let route = null
    try { route = split(message.to, prefixes) } catch {}
    if (!route) {
      if (!held.has(name)) { held.add(name); say({ main: 'held', message: name, to: message.to }) }
      continue
    }
    to[route.branch].write(name, { ...message, to: route.path })
    from.remove(name)
    say({ main: 'dispatched', message: name, to: message.to, repository: route.branch })
  }
}

// A repository taking in its inbox: for now each message recorded as
// received (step 5: placed in its queue as a request).
export function takeIn ({ from, to, say = () => {} }) {
  for (const name of from.list()) {
    const message = from.read(name)
    to.write(name, message)
    from.remove(name)
    say({ main: 'received', message: name, to: message.to, from: message.from })
  }
}
