// The wrapped remote command: a request whose URI leads into another mrepo
// is not executed here: it is passed on whole to that mrepo, and its
// response becomes this request's result.
//   remoteOf(exec, uri)   where a URI leads: null (it stays here), or the
//                         mrepo it enters: a child linked in main, its record
//                         at /main/<name>.json, the URI inside it what is
//                         left: /main/<name>/<rest> -> /<rest>, /main/<name>
//                         -> /  => { name, at: '/main/<name>', dir, uri }
//   pass(ctx, name, core, to)   the child request issued: the same protocol,
//                         action and body, the URI inside the child; its core
//                         addressed back to this request's own branch
//                         (/<mrepo>/execute/<key>); delivered into the
//                         child's inbox folder (the same node: direct; another
//                         node needs dispatch, not built) -> the request's
//                         form with what it waits for: remote { at, uri, key }
import { existsSync } from 'bare-fs'
import { join } from 'bare-path'
import { record, wrap, guid, inboxOf } from 'mrepo-base-request'

export async function remoteOf (exec, uri) {
  const m = String(uri).match(/^\/main\/([a-z][a-z0-9-]*)(\/.*)?$/)
  if (!m || !exec.runtime.dir) return null
  const node = await exec.read(`/main/${m[1]}.json`).then(b => JSON.parse(b.toString()), () => null)
  if (!node?.dir) return null
  return { name: m[1], at: `/main/${m[1]}`, dir: join(exec.runtime.dir, node.dir), uri: m[2] ?? '/' }
}

export function pass (ctx, name, core, to) {
  if (!existsSync(join(to.dir, 'inbox'))) throw new Error(`not reachable: ${to.at} (no inbox at ${to.dir})`)
  const { protocol, action, body } = core.value
  const key = guid()
  const child = record(`/${ctx.name}/execute/${name}`, { protocol, action, uri: to.uri, ...(body !== undefined ? { body } : {}) }, key)
  inboxOf(to.dir).write(key, wrap(`/${to.name}/inbox`, child))
  return { ...core.value, remote: { at: to.at, uri: to.uri, key } }
}
