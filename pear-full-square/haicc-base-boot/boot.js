// The boot's command line (the service protocol's boot), the boot package's entry (its bundle's main):
//   bare base-package-boot.bundle boot --work=<folder> [--setup=<folder>]
//   bare base-package-boot.bundle fetch <package> --work=<folder> [--setup=<folder>]
// --setup defaults to the folder holding boot.json, up from the bundle. One JSON line: the
// completed request, a record (the boot's: the one handed over into the repository). Exit 0
// done; 1 not done (on stderr, why, when the request itself was done); 2 a bad call.
import process from 'bare-process'
import { spawnSync } from 'bare-subprocess'
import { dirname, join, resolve } from 'bare-path'
import { existsSync } from 'bare-fs'
import { boot, fetch, HAICC } from './index.js'
import { record, complete, guid } from '../mrepo-base-request/index.js'

const args = process.argv.slice(2)
const flags = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => { const i = a.indexOf('='); return i < 0 ? [a.slice(2), true] : [a.slice(2, i), a.slice(i + 1)] }))
const [command, name] = args.filter(a => !a.startsWith('--'))
// The command as typed, carried in the form.
const typed = args.join(' ')

if (!['boot', 'fetch'].includes(command) || typeof flags.work !== 'string' || (command === 'fetch' && !name)) {
  console.error('usage: boot --work=<folder> [--setup=<folder>] | fetch <package> --work=<folder> [--setup=<folder>]')
  process.exitCode = 2
} else {
  // The setup: --setup, else the folder holding boot.json, up from this bundle
  // (<setup>/<org>/base-package-boot.bundle).
  let setup = resolve(typeof flags.setup === 'string' ? flags.setup : dirname(process.argv[1]))
  if (typeof flags.setup !== 'string') while (!existsSync(join(setup, 'boot.json')) && dirname(setup) !== setup) setup = dirname(setup)
  const work = resolve(flags.work)
  let r
  try {
    r = command === 'boot' ? await boot({ setup, work, command: typed }) : await fetch({ setup, work, repo: name })
  } catch (err) { r = { ok: false, why: err.message } }
  if (r.ok && command === 'boot') {
    // HAICC's package, run once from its layer's folder: it answers.
    const v = spawnSync(process.execPath, [r.bundle, 'version'], { stdio: ['ignore', 'pipe', 'pipe'] })
    r.haicc = v.status === 0 ? JSON.parse(String(v.stdout)) : { failed: String(v.stderr).trim() }
    if (v.status !== 0) r.ok = false
  }
  // The end of execution: the completed request. The boot's own (as in the
  // repository); fetch's, made here (not a request in the repository).
  const done = r.record ?? complete(record(null, { command: typed }, guid()), r.ok ? { ok: true, value: r } : { ok: false, error: r.why })
  console.log(JSON.stringify(done))
  if (!r.ok && r.record && 'output' in r.record.value) console.error(`boot: ${r.why}`)
  if (r.haicc?.failed) console.error(`boot: HAICC did not answer: ${r.haicc.failed}`)
  process.exitCode = r.ok ? 0 : 1
}
