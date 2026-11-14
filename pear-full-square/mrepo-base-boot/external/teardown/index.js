// teardown(exec, { uri }): the boot protocol's teardown (README.md beside it).
import { rmSync } from 'bare-fs'
import { stop } from 'mrepo-base-runtime'
import { child } from '../../internal/child.js'

export async function teardown (exec, { uri }) {
  const c = child(exec, uri)
  const recorded = await c.recorded()
  if (!recorded) { await c.refuse(); throw new Error(`not deployed: ${c.at}`) }
  // Its runtime stopped first (when it runs), waited for until its process
  // has ended (mrepo-base-runtime's stop: asked, then SIGTERM, then SIGKILL).
  const stopped = await stop({ repo: c.dir, pid: recorded.runtime?.pid })
  if (stopped) exec.log?.('info', 'runtime stopped', stopped)
  rmSync(c.dir, { recursive: true, force: true })
  // its link, the node it was made at, and what was local about it
  exec.remove(c.links)
  exec.remove(c.node)
  if (await exec.read(c.local).then(() => true, () => false)) exec.remove(c.local)
  return { tornDown: c.at }
}
