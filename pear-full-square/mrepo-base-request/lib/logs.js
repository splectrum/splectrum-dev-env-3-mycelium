// The log, for now (docs/design/repositories.md, "The log"): a `log` layer
// (non-atomic, on disk), its working tree the log folder,
// <work>/mrepos/<name>/log/. Writers append records, one a line: a request's
// to <key>.jsonl (its key; written while it executes, then never again), the
// rest to <prefix>-<start>.jsonl (one file a runtime start, a boot). The runtime
// commits the folder's new lines into the layer after each pass in which
// something happened: the log pinned by its commit. (On p2p, topics later.)
//   logFolder(work)              the folder
//   logTo(work, start, prefix)   a writer: record -> appended to its file (a
//                                request's <key>.jsonl; else <prefix>-<start>:
//                                runtime, boot); usable before the repository
//                                is open or exists (its name is known), the
//                                next commit picking it up
//   commitLog(ctx)               the folder's new lines committed; the files
//                                committed, or [] when nothing was new
import { join } from 'bare-path'
import { mkdirSync, appendFileSync, readdirSync, readFileSync, existsSync } from 'bare-fs'
import { viewOf, setting } from './view.js'
import { layer, AUTHOR } from './layer.js'
import { ensure } from './boxes.js'

export const logFolder = work => join(viewOf(work, setting(work).name), 'log')

export function logTo (work, start, prefix = 'runtime') {
  const folder = logFolder(work)
  const runtimeFile = `${prefix}-${start.replace(/[:.]/g, '-')}`
  return rec => {
    mkdirSync(folder, { recursive: true })
    appendFileSync(join(folder, `${rec.key ?? runtimeFile}.jsonl`), JSON.stringify(rec) + '\n')
  }
}

export async function commitLog (ctx) {
  const folder = logFolder(ctx.work)
  if (!existsSync(folder)) return []
  ctx.seen ??= {}
  await ensure(ctx, 'log')
  // What the layer holds, by size: taken from it once after a start.
  if (!ctx.seen.log) {
    ctx.seen.log = new Map()
    for (const [p] of await ctx.repo.select('/log/*')) ctx.seen.log.set(p.slice('/log/'.length), (await ctx.repo.read(p)).length)
  }
  const changed = []
  for (const f of readdirSync(folder).filter(n => n.endsWith('.jsonl')).sort()) {
    const bytes = readFileSync(join(folder, f))
    if (ctx.seen.log.get(f) !== bytes.length) changed.push([f, bytes])
  }
  if (!changed.length) return []
  const c = await ctx.writer.change('log')
  for (const [f, bytes] of changed) await c.put(`/${f}`, bytes)
  await c.commit(`Log: ${changed.map(([f]) => f).join(', ')}`, { author: AUTHOR })
  for (const [f, bytes] of changed) ctx.seen.log.set(f, bytes.length)
  return changed.map(([f]) => f)
}

export { layer }
