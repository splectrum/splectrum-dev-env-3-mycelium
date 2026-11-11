// teardown(exec, { uri }): the boot protocol's teardown (README.md beside it).
import { rmSync } from 'bare-fs'
import os from 'bare-os'
import { ask } from 'mrepo-base-runtime'
import { child } from '../../internal/child.js'

const alive = pid => { try { os.kill(pid, 0); return true } catch { return false } }
const ended = async (pid, ms) => { for (let i = 0; i < ms / 100 && alive(pid); i++) await new Promise(resolve => setTimeout(resolve, 100)); return !alive(pid) }

// A runtime's process ended: asked first (ask), then SIGTERM, then SIGKILL,
// each waited for; true when it has ended (how: which one ended it).
async function stopped (pid, ask) {
  if (!alive(pid)) { stopped.how = 'not running'; return true }
  await ask?.()
  if (await ended(pid, 5000)) { stopped.how = 'asked'; return true }
  try { os.kill(pid, 'SIGTERM') } catch {}
  if (await ended(pid, 5000)) { stopped.how = 'SIGTERM'; return true }
  try { os.kill(pid, 'SIGKILL') } catch {}
  if (await ended(pid, 2000)) { stopped.how = 'SIGKILL'; return true }
  return false
}

export async function teardown (exec, { uri }) {
  const c = child(exec, uri)
  if (!(await c.recorded())) throw new Error(`not deployed: ${uri}`)
  // Its runtime stopped first (when it runs), waited for until its process
  // has ended (not only until it stops answering): asked over its socket;
  // still there, SIGTERM; still there, SIGKILL.
  const was = await ask({ repo: c.dir, op: 'status' })
  const pid = was?.pid ?? (await c.recorded())?.runtime?.pid
  if (pid && await stopped(pid, () => was && ask({ repo: c.dir, op: 'stop' }))) exec.log?.('info', 'runtime stopped', { pid, how: stopped.how })
  else if (pid && alive(pid)) throw new Error(`its runtime did not stop: pid ${pid}`)
  rmSync(c.dir, { recursive: true, force: true })
  exec.remove(c.node)
  return { tornDown: uri }
}
