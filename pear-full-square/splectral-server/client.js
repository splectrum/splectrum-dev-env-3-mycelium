// A client of the Splectral server through topics, from another process
// (the command line): its action produced into a client topic of its own;
// its result read from the server's actions topic by correlation id. The
// server need not be up when the action is produced.
//   const out = await askServer({ runs, action, with, timeout })   { ok, result | error }
import { join } from 'bare-path'
import process from 'bare-process'
import crypto from 'bare-crypto'
import { openTopic, folderStorage } from '../mycelium-topic/index.js'
import { correlationOf } from './lib/clients.js'

export async function askServer ({ runs, action, with: args = {}, timeout = 600000, every = 250 }) {
  const client = `cli-${process.pid}-${Date.now()}`
  const correlation = `${client}:${crypto.randomUUID()}`
  const mine = await openTopic({ storage: folderStorage(join(runs, 'clients', client, 'actions')) })
  const results = await openTopic({ storage: folderStorage(join(runs, 'actions')) })
  const from = results.endOffset()
  await mine.produce({ value: { action, with: args }, headers: [{ key: 'correlation', value: correlation }] })
  return new Promise((resolve, reject) => {
    const limit = setTimeout(() => { stop(); reject(new Error(`no answer within ${timeout} ms (is the server running?)`)) }, timeout)
    const stop = results.follow(from, records => {
      const r = records.find(x => correlationOf(x) === correlation)
      if (!r) return
      clearTimeout(limit)
      stop()
      resolve(r.value.ok ? { ok: true, result: r.value.result ?? null } : { ok: false, error: r.value.error })
    }, { every })
  })
}
