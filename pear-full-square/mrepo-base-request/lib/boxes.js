// A repository's boxes, as layers (docs/design/repositories.md, "The boxes"):
// `inbox` and `outbox`, non-atomic (git on disk), a record a document,
// <name>.json, at the layer's root; nothing removed (housekeeping later).
// What arrives in the inbox is an envelope: its topic this repository's
// inbox (/<name>/inbox), its value the core record (the pre-filled form).
//   post(ctx, record, name)  a record committed into the inbox as it is (its
//                            name its key, by default): the
//                            input adding its own commit (native git: no
//                            working tree)
//   post(ctx)                the inbox folder's new files committed: the
//                            folder is the inbox layer's working tree
//                            (<work>/mrepos/<name>/inbox/: on the p2p host,
//                            many inputs add files, the runtime commits)
//   inboxFolder(work, name)  that folder (name: the setting's by default), a documents container (JSON)
import { join } from 'bare-path'
import { documents } from 'mycelium-container-document'
import { guid } from './record.js'
import * as json from 'mycelium-value-json'
import { viewOf, setting } from './view.js'
import { layer, AUTHOR, CONFIG } from './layer.js'

export const INBOX = '/inbox'
export const OUTBOX = '/outbox'
export const inboxFolder = (work, name = setting(work).name) => documents(join(viewOf(work, name), 'inbox'), json)

// A layer made when first needed (an orphan branch, under the layer rules).
export async function ensure ({ backend, writer }, branch) {
  if (!(await backend.listBranches()).some(([b]) => b === branch)) await writer.createLayer(branch, `Create ${branch}`, { author: AUTHOR })
}

export async function post (ctx, rec = null, name = rec?.key ?? guid()) {
  await ensure(ctx, 'inbox')
  const box = layer(ctx, 'inbox')
  const have = new Set(await box.list())
  const fresh = rec ? (have.has(name) ? [] : [[name, rec]]) : (() => {
    const folder = inboxFolder(ctx.work, ctx.name)
    return folder.list().filter(n => n !== CONFIG && !have.has(n)).map(n => [n, folder.read(n)])
  })()
  // A commit lost to another writer of the inbox (compare-and-swap) is made
  // again on the new head.
  for (let tries = 0; fresh.length; tries++) {
    try {
      const c = await ctx.writer.change('inbox')
      for (const [n, r] of fresh) await c.put(`/${n}.json`, json.encode(r))
      await c.commit(`Inbox: ${fresh.map(([n]) => n).join(', ')}`, { author: AUTHOR })
      break
    } catch (err) {
      if (tries >= 5 || !/expected/.test(err.message)) throw err
    }
  }
  return fresh.map(([n]) => n)
}

