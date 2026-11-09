// The cold boot's command line, the boot package's entry (its bundle's main):
//   bare base-package-boot.bundle boot --work=<folder> [--setup=<folder>]
//   bare base-package-boot.bundle fetch <package> --work=<folder> [--setup=<folder>]
// --setup defaults to the folder the bundle is in. Each step as a JSON line;
// the result last. Exit 0 done; 1 not done; 2 a bad call.
import process from 'bare-process'
import { spawnSync } from 'bare-subprocess'
import { dirname, join, resolve } from 'bare-path'
import { boot, fetch, HAICC } from './index.js'

const args = process.argv.slice(2)
const flags = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => { const i = a.indexOf('='); return i < 0 ? [a.slice(2), true] : [a.slice(2, i), a.slice(i + 1)] }))
const [command, name] = args.filter(a => !a.startsWith('--'))
const say = e => console.log(JSON.stringify(e))

if (!['boot', 'fetch'].includes(command) || typeof flags.work !== 'string' || (command === 'fetch' && !name)) {
  console.error('usage: boot --work=<folder> [--setup=<folder>] | fetch <package> --work=<folder> [--setup=<folder>]')
  process.exitCode = 2
} else {
  const setup = resolve(typeof flags.setup === 'string' ? flags.setup : dirname(process.argv[1]))
  const work = resolve(flags.work)
  let r
  try {
    r = command === 'boot' ? await boot({ setup, work, say }) : await fetch({ setup, work, repo: name, say })
  } catch (err) { r = { ok: false, why: err.message } }
  if (r.ok && command === 'boot') {
    // HAICC's package, run once from its layer's folder: it answers.
    const v = spawnSync(process.execPath, [r.bundle, 'version'], { stdio: ['ignore', 'pipe', 'pipe'] })
    r.haicc = v.status === 0 ? JSON.parse(String(v.stdout)) : { failed: String(v.stderr).trim() }
    if (v.status !== 0) r.ok = false
  }
  say({ result: r })
  process.exitCode = r.ok ? 0 : 1
}
