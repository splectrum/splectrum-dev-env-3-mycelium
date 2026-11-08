// Local kinds the tool may create, and checks of what the host holds.
//   folder   { path }               created, marked as this owner's; removed only if ours
//   port     { port, host, holder } free, or held by the process in the pid file `holder`
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'bare-fs'
import { join } from 'bare-path'
import tcp from 'bare-tcp'
import process from 'bare-process'

const MARK = 'haicc-owner'

export const folder = {
  observe: r => existsSync(r.want.path) ? { path: r.want.path, owner: existsSync(join(r.want.path, MARK)) ? readFileSync(join(r.want.path, MARK), 'utf8').trim() : null } : null,
  compare: (r, a) => a ? { status: 'met' } : { status: 'missing' },
  create (r, ctx) { mkdirSync(r.want.path, { recursive: true }); writeFileSync(join(r.want.path, MARK), ctx.owner + '\n'); return { path: r.want.path } },
  owned: (a, ctx) => a.owner === ctx.owner,
  remove (r) { rmSync(r.want.path, { recursive: true, force: true }) }
}

const alive = pid => { try { process.kill(pid, 0); return true } catch { return false } }

export const port = {
  async observe (r) {
    const host = r.want.host || '127.0.0.1'
    const free = await new Promise(resolve => {
      const s = tcp.createServer()
      s.once('error', () => resolve(false))
      s.listen(r.want.port, host, () => { s.close(); resolve(true) })
    })
    let holder = null
    if (!free && r.want.holder && existsSync(r.want.holder)) {
      // A pid, or a JSON object with one ({ pid, ... }).
      const text = readFileSync(r.want.holder, 'utf8').trim()
      const pid = text.startsWith('{') ? JSON.parse(text).pid : Number(text)
      if (alive(pid)) holder = pid
    }
    return { port: r.want.port, host, free, holder }
  },
  compare: (r, a) => a.free ? { status: 'met', detail: 'free' } : a.holder ? { status: 'met', detail: `held by ours (pid ${a.holder})` } : { status: 'different', detail: 'taken' },
  hint: r => `port ${r.want.port} is taken by another process: stop it, or choose another port`
}
