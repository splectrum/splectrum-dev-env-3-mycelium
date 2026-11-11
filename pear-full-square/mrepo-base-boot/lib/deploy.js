// The boot protocol's actions (docs/design/repositories.md, "The external
// API": deploy, teardown, redeploy; executed by the parent). Each takes the
// execution's context (exec: reads overlaid, writes collected; exec.runtime:
// the parent's own, its work folder) and the request's form; the child is
// named by the URI's one part (/host).
//   deploy(exec, { uri })     the child's definition, /main/<name>/mrepo/ in
//                             the parent (its structure, by layers), built
//                             into <work>/mrepos/<name>/; linked into the
//                             parent's main: /main/<name>.json
//   teardown(exec, { uri })   the child removed (<work>/mrepos/<name>/), its
//                             link out of main
//   redeploy(exec, form)      teardown, committed locally (exec.commit()), then deploy
// Not yet: the requirements resolved into packages and overlaid, the
// clean-up, the child started.
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'bare-fs'
import { join, dirname } from 'bare-path'
import { tmpdir } from 'bare-os'
import { viewOf } from 'mrepo-base-request'
import { build } from './build.js'

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
    const link = { name: c.name, mrepo: c.view, storage: 'filesystem', layers }
    exec.put(c.link, Buffer.from(JSON.stringify(link, null, 2) + '\n'))
    return { deployed: uri, ...link }
  } finally { rmSync(tmp, { recursive: true, force: true }) }
}

export async function teardown (exec, { uri }) {
  const c = child(exec, uri)
  if (!(await there(exec, c.link))) throw new Error(`not deployed: ${uri}`)
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
