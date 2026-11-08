// haicc-deployment — a deployment as an object: its declared configuration,
// what runs on top, and its desired lifecycle state, made true by
// haicc-reconcile (notes/haicc-reconcile.md).
//   const d = await openDeployment({ project, work })
//   await d.deploy()     the configuration should exist
//   await d.start()      and run, on top of it
//   await d.stop()       not run; the configuration kept
//   await d.teardown()   nothing of it: what it made, taken away
//   await d.reconcile({ exceptKinds })  the world brought back to the desired state
//   await d.status()     the desired state and what is there
//
// A project file (`project.json`): { owner, providers: [modules],
// configuration: [requirements], running: [requirements], strict }.
// "{here}" is the project's folder, "{work}" the deployment's work folder
// (where its state and everything it makes live), "{packages}" the install
// folder the code runs from ($HAICC_PACKAGES, or $HAICC_HOME/packages; in
// the development repository, its root). `packages`: [names], the
// project's packages, installed by the package manager from the project's
// siblings: requirements of kind `package`, first in its configuration
// (where the install folder is the package manager's). Every verb is a record in
// the deployment's lifecycle journal (deployment/lifecycle.jsonl); the
// desired state is their fold. What the engine checks and does goes to its
// reconcile journal (deployment/reconcile.jsonl).
import { readFileSync, mkdirSync, existsSync } from 'bare-fs'
import { dirname, resolve, join } from 'bare-path'
import { pathToFileURL } from 'bare-url'
import { createEngine, providers as builtin } from '../haicc-reconcile/index.js'
import { journal } from '../haicc-reconcile/lib/journal.js'
import { validateName } from '../haicc-reconcile/lib/names.js'
import process from 'bare-process'

const VERBS = { deploy: { deployed: true, running: false }, start: { deployed: true, running: true }, stop: { running: false }, teardown: { deployed: false, running: false } }

export const desiredOf = records => records.reduce((s, r) => VERBS[r.value.verb] ? { ...s, ...VERBS[r.value.verb], since: r.value.time, last: r.value.verb } : s, { deployed: false, running: false, since: null, last: null })

// The boundary: a project file read and checked once.
export const haiccHome = () => process.env.HAICC_HOME || join(process.env.HAICC_WORK || '.', 'install')
export const packagesFolder = () => resolve(process.env.HAICC_PACKAGES || join(haiccHome(), 'packages'))

export async function readProject (file, work, { packages = packagesFolder(), from = null } = {}) {
  const here = dirname(resolve(file))
  const p = JSON.parse(readFileSync(file, 'utf8').replaceAll('{here}', here).replaceAll('{work}', work).replaceAll('{packages}', packages))
  validateName(p.owner, 'project owner')
  for (const r of [...(p.configuration || []), ...(p.running || [])]) validateName(r.name || r.kind, 'requirement name')
  const providers = { ...builtin }
  const configuration = p.configuration || []
  const installer = join(packages, 'pear-full-square', 'pkgm-base-manager', 'reconcile.js')
  if (p.packages?.length && existsSync(join(packages, 'pkgm')) && existsSync(installer)) {
    Object.assign(providers, (await import(pathToFileURL(installer).href)).providers)
    configuration.unshift(...p.packages.map(n => ({ name: `package-${n}`, kind: 'package', want: { name: n, from: from || dirname(here), into: packages } })))
  }
  for (const m of p.providers || []) Object.assign(providers, (await import(pathToFileURL(resolve(here, m)).href)).providers)
  return { owner: p.owner, strict: Boolean(p.strict), configuration, running: p.running || [], packages: p.packages || [], providers, file: resolve(file), title: p.title || p.owner }
}

export async function openDeployment ({ project: file, work, packages, from }) {
  work = resolve(work)
  mkdirSync(join(work, 'deployment'), { recursive: true })
  const p = await readProject(file, work, { packages, from })
  const lifecycle = journal(join(work, 'deployment', 'lifecycle.jsonl'))
  const log = journal(join(work, 'deployment', 'reconcile.jsonl'))
  let verb = null
  const engine = createEngine({ providers: p.providers, owner: p.owner, record: v => log.append({ verb, ...v }) })
  const both = () => [...p.configuration, ...p.running]
  const runningNames = () => p.running.map(r => r.name || r.kind)
  const stopRunning = () => engine.remove(both(), { only: runningNames() })
  const desired = async () => desiredOf(lifecycle.read())

  // `exceptKinds`: kinds left alone (the Splectral server reconciling its
  // own project leaves itself).
  async function reconcile ({ exceptKinds = [] } = {}) {
    const want = await desired()
    verb = 'reconcile'
    if (want.running) return engine.apply(both().filter(r => !exceptKinds.includes(r.kind)), { strict: p.strict })
    const stopped = await stopRunning()
    if (want.deployed) return { stopped, ...(await engine.apply(p.configuration, { strict: p.strict })) }
    return { stopped, removed: await engine.remove(p.configuration) }
  }
  const act = v => async () => {
    lifecycle.append({ verb: v, time: Date.now(), project: p.owner })
    verb = v
    const want = await desired()
    if (v === 'deploy') return engine.apply(p.configuration, { strict: p.strict })
    if (v === 'start') return engine.apply(both(), { strict: p.strict })
    if (v === 'stop') return { stopped: await stopRunning() }
    return { stopped: await stopRunning(), removed: await engine.remove(p.configuration), desired: want }
  }
  async function status () {
    const want = await desired()
    verb = 'status'
    const reqs = want.running ? both() : want.deployed ? p.configuration : []
    return { project: p.owner, desired: want, check: reqs.length ? await engine.check(reqs, { strict: p.strict }) : [] }
  }
  // What deploying would need, checked: the machine before anything is made.
  const check = () => { verb = 'check'; return engine.check(both(), { strict: p.strict }) }
  return { project: p, work, check, deploy: act('deploy'), start: act('start'), stop: act('stop'), teardown: act('teardown'), reconcile, status, desired }
}
