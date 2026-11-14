// deploy and teardown: the machine level, above the root mrepo (README.md
// beside it).
import { existsSync, readdirSync, statSync, rmSync } from 'bare-fs'
import { join } from 'bare-path'
import { spawn } from 'bare-subprocess'
import { sources } from '../sources/index.js'
import { Failure } from '../failure.js'

// haicc boot/deploy: the boot component's bundle, from the sources, run
// with the Bare running this; its exit code.
export async function deploy ({ home, work, bare, org, boot, stdio = 'inherit' }) {
  const s = sources(home)
  const bundle = s.find(`${org}/${boot}.bundle`)
  if (!bundle) throw new Failure(`no ${org}/${boot}.bundle in the sources (haicc sources link <folder>)`, 3)
  const child = spawn(bare, [bundle, `--work=${work}`, ...s.list().map(x => `--sources=${x}`), '--no-follow'], { stdio })
  return new Promise(resolve => child.on('exit', code => resolve(code ?? 1)))
}

// The mrepos from one down: those deployed below it first (in the shadow
// of its main, at any depth), itself last.
function mrepos (dir) {
  const below = []
  const walk = d => {
    for (const n of readdirSync(d).sort()) {
      const p = join(d, n)
      let folder = false
      try { folder = statSync(p).isDirectory() } catch {}
      if (!folder) continue
      if (existsSync(join(p, '.git'))) below.push(...mrepos(p)); else walk(p)
    }
  }
  if (existsSync(join(dir, 'main'))) walk(join(dir, 'main'))
  return [...below, dir]
}

// haicc boot/teardown: every runtime under the root stopped, then what
// boot/deploy put in place removed; what was done.
export async function teardown ({ work, root }) {
  if (!existsSync(root)) throw new Failure(`no boot mrepo at ${work} (nothing to tear down)`, 3)
  // the runtime's library only here: nothing else of the app needs it
  const { stop } = await import('mrepo-base-runtime')
  let runtimes = 0
  for (const dir of mrepos(root)) {
    try { if (await stop({ repo: dir })) runtimes++ } catch { throw new Failure(`a runtime under ${work} did not stop`, 1) }
  }
  // what boot/deploy put in place, by name: nothing else in the work folder
  for (const n of ['mrepos', 'packages', 'mrepo.json']) rmSync(join(work, n), { recursive: true, force: true })
  return { tornDown: '.', runtimes, work }
}

// The machine level's protocols, their actions.
export const MACHINE = { boot: { deploy, teardown } }
