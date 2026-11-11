// The boot protocol's actions (docs/design/repositories.md, "The external
// API": deploy, teardown, redeploy; executed by the parent). Each takes the
// execution's context (exec: reads overlaid, writes collected; exec.runtime:
// the parent's own, its work folder) and the request's form; the child is
// named by the URI's one part (/host).
//   deploy(exec, { uri })     the child's definition, /main/<name>/mrepo/ in
//                             the parent (its structure, by layers), built
//                             into <work>/mrepos/<name>/; linked into the
//                             parent's main: /main/<name>.json
//   teardown(exec, { uri })   the child's runtime stopped, the child removed
//                             (<work>/mrepos/<name>/), its link out of main
//   redeploy(exec, form)      teardown, committed locally (exec.commit()), then deploy
// Not yet: the requirements resolved into packages and overlaid, the
// clean-up; what is done outside the repository (a runtime started, a folder
// removed) is not undone by a reset.
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'bare-fs'
import { join, dirname } from 'bare-path'
import os, { tmpdir } from 'bare-os'
import { viewOf } from 'mrepo-base-request'
import { build } from './build.js'
import { place } from './packages.js'
import { start, ask } from 'mrepo-base-runtime'
import { parseSource } from './prerequisites.js'

function child (exec, uri) {
  const name = uri.slice(1)
  if (!/^[a-z][a-z0-9-]*$/.test(name)) throw new Error(`not a child to deploy: ${uri}`)
  const work = exec.runtime.work
  if (!work) throw new Error('no work folder in the context')
  return { name, work, view: viewOf(work, name), link: `/main/${name}.json` }
}

const there = async (exec, uri) => (await exec.select(uri)).length > 0

// Every file under a folder of the repository, by path inside it.
async function filesOf (exec, uri) {
  const out = []
  for (const [p, node] of await exec.select(`${uri}/*`)) {
    if (node.type === 'blob') out.push(p.slice(uri.length + 1))
    else for (const f of await filesOf(exec, p)) out.push(`${p.slice(uri.length + 1)}/${f}`)
  }
  return out
}

export async function deploy (exec, { uri }) {
  const c = child(exec, uri)
  if (await there(exec, c.link)) throw new Error(`deployed already: ${uri}`)
  if (existsSync(c.view)) throw new Error(`in the way: ${c.view}`)
  const from = `/main/${c.name}/mrepo`
  const files = await filesOf(exec, from)
  if (!files.length) throw new Error(`no definition: ${from}`)
  // The definition as files, then built (the child's own setting not written:
  // the work folder's belongs to the parent).
  const tmp = mkdtempSync(join(tmpdir(), `deploy-${c.name}-`))
  try {
    for (const f of files) {
      mkdirSync(dirname(join(tmp, f)), { recursive: true })
      writeFileSync(join(tmp, f), await exec.read(`${from}/${f}`))
    }
    const { layers } = await build({ from: tmp, work: c.work, name: c.name, setting: false })
    // Its packages put in place, each mrepo on the versions it lists: from
    // the work folder's store, else the sources the parent's were placed
    // from (its packages layer's manifest).
    let placed = null
    if (existsSync(join(tmp, 'packages', 'layer.json'))) {
      const list = JSON.parse(readFileSync(join(tmp, 'packages', 'layer.json'), 'utf8')).packages || []
      const mine = await exec.read('/packages/manifest.json').then(b => JSON.parse(b.toString()), () => ({}))
      const sources = (mine.sources || []).map(parseSource)
      if (list.length) placed = (await place({ work: c.work, name: c.name, sources, list })).packages
    }
    const link = { name: c.name, mrepo: c.view, storage: 'filesystem', layers, packages: placed ? Object.keys(placed) : [] }
    // Its runtime started, from its own packages/ (its pinned runtime), by
    // its directory: its inbox operational. Not when it has no runtime.
    const runtime = join(c.view, 'packages', 'haiccing', 'base-package-runtime.bundle')
    if (existsSync(runtime)) {
      const s = await start({ repo: c.view, bundle: runtime })
      if (!s) throw new Error(`its runtime did not start: ${c.view}`)
      link.runtime = { pid: s.pid }
    }
    exec.put(c.link, Buffer.from(JSON.stringify(link, null, 2) + '\n'))
    return { deployed: uri, ...link }
  } finally { rmSync(tmp, { recursive: true, force: true }) }
}

export async function teardown (exec, { uri }) {
  const c = child(exec, uri)
  if (!(await there(exec, c.link))) throw new Error(`not deployed: ${uri}`)
  // Its runtime stopped first (when it runs), waited for until its process
  // has ended (not only until it stops answering).
  const was = await ask({ repo: c.view, op: 'status' })
  if (was) {
    await ask({ repo: c.view, op: 'stop' })
    const alive = () => { try { os.kill(was.pid, 0); return true } catch { return false } }
    for (let i = 0; i < 100 && alive(); i++) await new Promise(resolve => setTimeout(resolve, 100))
    if (alive()) throw new Error(`its runtime did not stop: pid ${was.pid}`)
  }
  rmSync(c.view, { recursive: true, force: true })
  exec.remove(c.link)
  return { tornDown: uri }
}

// Teardown committed locally (its removal of the link then seen), then deploy.
export async function redeploy (exec, form) {
  const down = await teardown(exec, form)
  await exec.commit('torn down')
  return { ...down, ...(await deploy(exec, form)) }
}
