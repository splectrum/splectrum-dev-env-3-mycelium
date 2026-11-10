// A repository's boxes, as layers (docs/design/repositories.md, "The boxes"):
// `inbox` and `outbox`, non-atomic (git on disk), a record a document,
// <name>.json, at the layer's root; nothing removed (housekeeping later).
//   post(ctx, record, name)  a record committed into the inbox: the input
//                            adding its own commit (native git: no working
//                            tree)
//   post(ctx)                the inbox folder's new files committed: the
//                            folder is the inbox layer's working tree
//                            (<work>/mrepos/<name>/inbox/: on the p2p host,
//                            many inputs add files, the runtime commits)
//   inboxFolder(work)        that folder, a documents container (JSON)
//   dispatch(ctx)            the local dispatcher, once over the outbox: a
//                            record addressed to /inbox posted there (once:
//                            under the same name); one to the outside (to
//                            null) left for its input to read; any other held
//                            (said once): no other root to send it to yet
import { join } from 'bare-path'
import { documents, newName } from 'mycelium-container-document'
import * as json from 'mycelium-value-json'
import { viewOf, setting } from './view.js'
import { moved, withHeader } from './record.js'
import { layer, AUTHOR } from './layer.js'

export const INBOX = '/inbox'
export const OUTBOX = '/outbox'
export const inboxFolder = work => documents(join(viewOf(work, setting(work).name), 'inbox'), json)

// A layer made when first needed (an orphan branch, under the layer rules).
export async function ensure ({ backend, writer }, branch) {
  if (!(await backend.listBranches()).some(([b]) => b === branch)) await writer.createLayer(branch, `Create ${branch}`, { author: AUTHOR })
}

export async function post (ctx, rec = null, name = newName()) {
  await ensure(ctx, 'inbox')
  const box = layer(ctx, 'inbox')
  const have = new Set(await box.list())
  const fresh = rec ? (have.has(name) ? [] : [[name, rec]]) : (() => {
    const folder = inboxFolder(ctx.work)
    return folder.list().filter(n => !have.has(n)).map(n => [n, folder.read(n)])
  })()
  // A commit lost to another writer of the inbox (compare-and-swap) is made
  // again on the new head.
  for (let tries = 0; fresh.length; tries++) {
    try {
      const c = await ctx.writer.change('inbox')
      for (const [n, r] of fresh) await c.put(`/${n}.json`, json.encode(moved(r, INBOX)))
      await c.commit(`Inbox: ${fresh.map(([n]) => n).join(', ')}`, { author: AUTHOR })
      break
    } catch (err) {
      if (tries >= 5 || !/expected/.test(err.message)) throw err
    }
  }
  return fresh.map(([n]) => n)
}

export async function dispatch (ctx, held = new Set()) {
  const { say = () => {} } = ctx
  if (!(await ctx.backend.listBranches()).some(([b]) => b === 'outbox')) return
  const out = layer(ctx, 'outbox')
  const delivered = new Set((await ctx.backend.listBranches()).some(([b]) => b === 'inbox') ? await layer(ctx, 'inbox').list() : [])
  for (const name of await out.list()) {
    if (delivered.has(name)) continue
    const rec = await out.read(name)
    const to = rec.headers?.mrepo?.to
    if (to === null || to === undefined) continue
    if (to !== INBOX) {
      if (!held.has(name)) { held.add(name); say({ runtime: 'held', record: name, to }) }
      continue
    }
    await post(ctx, withHeader(rec, 'mrepo', { from: OUTBOX, to: undefined }), name)
    say({ runtime: 'dispatched', record: name, to })
  }
}
