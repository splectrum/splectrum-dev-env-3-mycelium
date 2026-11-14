// main(argv, { env, bare, io }): the haicc command line (README.md beside it).
import { existsSync } from 'bare-fs'
import { join } from 'bare-path'
import os from 'bare-os'
import { viewOf } from 'mrepo-base-request'
import { command } from '../command/index.js'
import { request } from '../request/index.js'
import { unpack } from '../unpack/index.js'
import { outcome } from '../outcome/index.js'
import { sourcesCommand } from '../sources/index.js'
import { MACHINE } from '../boot/index.js'
import { CONFIG } from '../config.js'
import { Failure } from '../failure.js'
import { USAGE } from '../usage.js'

const CONSOLE = { out: line => console.log(line), err: line => console.error(line), stdio: 'inherit' }

export async function main (argv, { env = {}, bare = os.execPath(), io = CONSOLE } = {}) {
  const home = env.HAICC_HOME || join(os.homedir(), '.haicc')
  const work = env.HAICC_WORK || join(home, 'work')
  const root = viewOf(work, CONFIG.root.name)
  try {
    const c = command(argv)
    if (c.kind === 'usage') { io.out(USAGE); return 0 }
    if (c.kind === 'sources') {
      for (const line of sourcesCommand(home, c.args, { org: CONFIG.org, err: io.err })) io.out(line)
      return 0
    }
    if (c.kind === 'machine') {
      const r = await MACHINE[c.protocol][c.action]({ home, work, root, bare, org: CONFIG.org, boot: CONFIG.boot, stdio: io.stdio })
      if (typeof r === 'number') return r
      io.out(JSON.stringify(r))
      return 0
    }
    // a command for the mrepos: into the root mrepo's inbox, its response printed
    if (!existsSync(join(root, 'inbox'))) throw new Failure(`no boot mrepo at ${work} (haicc boot/deploy)`, 3)
    const timeout = Number(env.HAICC_TIMEOUT) > 0 ? Number(env.HAICC_TIMEOUT) : 120
    const { text } = await request(root, c.parts, { uri: CONFIG.root.uri, reply: CONFIG.reply, timeout })
    const print = c.print ?? (env.HAICC_OUTPUT === '1' ? 'output' : env.HAICC_RAW === '1' ? 'raw' : 'record')
    if (print === 'raw') io.out(text.replace(/\n$/, ''))
    if (print === 'record') io.out(unpack(text, Number(env.HAICC_WIDTH) > 0 ? Number(env.HAICC_WIDTH) : 80))
    const o = outcome(text)
    if (!o) throw new Failure('the response holds no completed form', 5)
    if ('error' in o) throw new Failure(o.error, 1)
    if (print === 'output') io.out(JSON.stringify(o.output))
    return 0
  } catch (err) {
    if (err.message) io.err(`haicc: ${err.message}`)
    return err instanceof Failure ? err.code : 1
  }
}
