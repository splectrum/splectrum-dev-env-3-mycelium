// A command sent on: a request whose position is a shortcut is not executed
// here. The command that follows is sent to the mrepo linked there, as it
// is, and its response becomes this request's result.
//   pass(ctx, name, core, to, command)
//     to        where it leads (mrepo-base-xpath's resolve): { at, mrepo,
//               folder, dir }: the linked mrepo's unique URI and its folder
//     command   the command sent on, its parts, unchanged
//     the child request issued: its value the command; its core addressed
//     back to this request's own branch (/<this mrepo>/execute/<key>);
//     delivered into the linked mrepo's inbox folder (the same node:
//     direct; another node needs dispatch, not built)
//     -> the request's form with what it waits for: remote { at, folder, key }
import { existsSync } from 'bare-fs'
import { join } from 'bare-path'
import { record, wrap, guid, inboxOf } from 'mrepo-base-request'

export function pass (ctx, name, core, to, command) {
  if (!to?.dir || !existsSync(join(to.dir, 'inbox'))) throw new Error(`not reachable: ${to?.at} (no inbox at ${to?.dir})`)
  const key = guid()
  const child = record(`/${ctx.uri ?? ctx.name}/execute/${name}`, command, key)
  inboxOf(to.dir).write(key, wrap(`/${to.mrepo}/inbox`, child))
  return { ...core.value, remote: { at: to.at, folder: to.folder, key } }
}
