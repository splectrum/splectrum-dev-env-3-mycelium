// The boot protocol's actions (docs/design/repositories.md, "The external
// API": deploy, teardown, redeploy; executed by the parent). Each takes the
// execution's context (exec: reads overlaid, writes collected; exec.runtime:
// the parent's own, its directory) and the request's form; the child is named
// by the URI's one part (/host) and lives inside its parent, at
// <parent>/main/<name>/ (forward: the parent reaches its inbox folder).
//   deploy(exec, { uri, body: { package } })
//       the target package (its type: the body's, else the one recorded at
//       the node) lists, in its mrepo/packages/layer.json, the packages the
//       child is made of, in order; each fetched into the work folder's store
//       (reached by the mapping the parent's packages manifest records), its
//       mrepo/ part laid in, in that order (a file at the same path replaces);
//       built at <parent>/main/<name>/; its packages linked individually; its
//       type recorded at the node, /main/<name>.json; its runtime started
//       from its own packages/, by its directory (its inbox operational)
//   teardown(exec, { uri })   its runtime stopped (asked over its socket; still
//                             running, SIGTERM; still, SIGKILL; until its process
//                             has ended), its folder removed, its node record out
//   redeploy(exec, form)      teardown, committed locally (exec.commit()),
//                             then deploy (the type recorded, if the body names none)
// Not yet: the clean-up; what is done outside the repository (a runtime
// started, a folder removed) is not undone by a reset.
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'bare-fs'
import { join, dirname } from 'bare-path'
import os, { tmpdir } from 'bare-os'
import { build } from './build.js'
import { fetch, structureOf, place } from './packages.js'
import { parseSource } from './prerequisites.js'
import { start, ask } from 'mrepo-base-runtime'

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

function child (exec, uri) {
  const name = uri.slice(1)
  if (!/^[a-z][a-z0-9-]*$/.test(name)) throw new Error(`not a child to deploy: ${uri}`)
  const dir = exec.runtime.dir
  if (!dir) throw new Error('no directory in the context')
  return { name, dir: join(dir, 'main', name), node: `/main/${name}.json` }
}

const json = async (exec, uri) => exec.read(uri).then(b => JSON.parse(b.toString()), () => null)

export async function deploy (exec, { uri, body }) {
  const c = child(exec, uri)
  if (await json(exec, c.node)) throw new Error(`deployed already: ${uri}`)
  if (existsSync(c.dir)) throw new Error(`in the way: ${c.dir}`)
  const target = body?.package
  if (!target) throw new Error(`no package to deploy ${uri} from (the body's package)`)
  // The store and the sources: the mapping the parent's packages manifest records.
  const mine = await json(exec, '/packages/manifest.json')
  if (!mine?.store) throw new Error('no store: the parent\'s packages manifest names none')
  const store = mine.store
  const sources = (mine.sources || []).map(parseSource)
  // The target's list, in order, from its own structure.
  fetch({ store, sources, pkg: target })
  const listed = structureOf({ store, pkg: target })['packages/layer.json']
  if (!listed) throw new Error(`${target} lists no packages (mrepo/packages/layer.json)`)
  const list = JSON.parse(listed.toString()).packages || []
  // Each package's mrepo/ part laid in, in that order; built inside the parent.
  const tmp = mkdtempSync(join(tmpdir(), `deploy-${c.name}-`))
  try {
    for (const pkg of list) {
      fetch({ store, sources, pkg })
      for (const [p, bytes] of Object.entries(structureOf({ store, pkg }))) {
        mkdirSync(dirname(join(tmp, p)), { recursive: true })
        writeFileSync(join(tmp, p), bytes)
      }
    }
    mkdirSync(dirname(c.dir), { recursive: true })
    const { layers } = await build({ from: tmp, dir: c.dir, setting: false })
    const { packages } = await place({ dir: c.dir, store, sources, list })
    const record = { name: c.name, package: target, packages: Object.keys(packages), dir: `main/${c.name}`, layers }
    // Its runtime started, from its own packages/ (its pinned runtime), by
    // its directory: its inbox operational. Not when it has no runtime.
    const runtime = join(c.dir, 'packages', 'haiccing', 'base-package-runtime.bundle')
    if (existsSync(runtime)) {
      const s = await start({ repo: c.dir, bundle: runtime })
      if (!s) throw new Error(`its runtime did not start: ${c.dir}`)
      record.runtime = { pid: s.pid }
    }
    exec.put(c.node, Buffer.from(JSON.stringify(record, null, 2) + '\n'))
    return { deployed: uri, ...record }
  } finally { rmSync(tmp, { recursive: true, force: true }) }
}

export async function teardown (exec, { uri }) {
  const c = child(exec, uri)
  if (!(await json(exec, c.node))) throw new Error(`not deployed: ${uri}`)
  // Its runtime stopped first (when it runs), waited for until its process
  // has ended (not only until it stops answering): asked over its socket;
  // still there, SIGTERM; still there, SIGKILL.
  const was = await ask({ repo: c.dir, op: 'status' })
  const pid = was?.pid ?? (await json(exec, c.node))?.runtime?.pid
  if (pid && await stopped(pid, () => was && ask({ repo: c.dir, op: 'stop' }))) exec.log?.('info', 'runtime stopped', { pid, how: stopped.how })
  else if (pid && alive(pid)) throw new Error(`its runtime did not stop: pid ${pid}`)
  rmSync(c.dir, { recursive: true, force: true })
  exec.remove(c.node)
  return { tornDown: uri }
}

// Teardown committed locally (its record's removal then seen), then deploy:
// the package the body names, else the one recorded.
export async function redeploy (exec, form) {
  const c = child(exec, form.uri)
  const was = await json(exec, c.node)
  const down = await teardown(exec, form)
  await exec.commit('torn down')
  return { ...down, ...(await deploy(exec, { ...form, body: { package: form.body?.package ?? was?.package } })) }
}
