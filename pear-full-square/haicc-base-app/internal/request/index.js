// request(root, parts, { uri, reply, timeout }): a command sent to an
// mrepo, its response waited for (README.md beside it).
import { existsSync, readFileSync } from 'bare-fs'
import { join } from 'bare-path'
import { record, wrap, guid, inboxOf } from 'mrepo-base-request'
import { Failure } from '../failure.js'

export async function request (root, parts, { uri, reply, timeout = 120, every = 200 }) {
  const key = guid()
  // the command, in its core (where the completed form goes back), in an
  // envelope addressed to the mrepo's inbox; written whole, then renamed
  // into place (the folder's write): the runtime never sees half of one
  inboxOf(root).write(key, wrap(`/${uri}/inbox`, record(reply, parts, key)))
  // its response: the completed form, in the outbox folder under the same key
  const back = join(root, 'outbox', `${key}.json`)
  for (const end = Date.now() + timeout * 1000; !existsSync(back);) {
    if (Date.now() >= end) throw new Failure(`no response in ${timeout} s (the request stays: ${key})`, 4)
    await new Promise(resolve => setTimeout(resolve, every))
  }
  return { key, text: readFileSync(back, 'utf8') }
}
