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
  exec.remove(c.node)
  return { tornDown: c.at }
}
