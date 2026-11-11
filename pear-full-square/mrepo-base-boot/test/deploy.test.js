// The boot protocol's actions on a parent built from a structure holding a
// child's definition (/main/host/mrepo/), with a context like the execute
// protocol's: reads from the repository, writes collected, then committed.
import test from 'brittle'
import fs, { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync, readFileSync } from 'bare-fs'
import { join } from 'bare-path'
import { tmpdir } from 'bare-os'
import { openRepo, writer, p2pgitBackend } from 'mycelium-git'
import { gitdirOf } from 'mrepo-base-request'
import { build, deploy, teardown, redeploy } from '../index.js'

const lj = (dir, mode) => { mkdirSync(dir, { recursive: true }); writeFileSync(join(dir, 'layer.json'), JSON.stringify({ mode, description: 'test' })) }

// A parent's structure: main (with the child's definition), runtime.
function structure (root) {
  lj(join(root, 'main'), 'atomic')
  lj(join(root, 'runtime'), 'atomic')
  const def = join(root, 'main', 'host', 'mrepo')
  lj(join(def, 'main'), 'atomic')
  lj(join(def, 'runtime'), 'atomic')
  writeFileSync(join(def, 'runtime', 'service.json'), JSON.stringify({ state: 'booted', type: 'haicc' }))
}

// An execution's context: reads the repository, writes collected and
// committed to main after the action (as the execute protocol does).
function context (work, backend) {
  const repo = openRepo(backend)
  const edits = []
  const exec = {
    runtime: { name: 'boot', work },
    select: uri => repo.select(uri),
    read: uri => repo.read(uri),
    put: (uri, bytes) => edits.push(['put', uri, bytes]),
    remove: uri => edits.push(['remove', uri]),
    commit: () => commit()
  }
  async function commit () {
    if (!edits.length) return
    const c = await writer(backend).change('main')
    for (const [op, uri, bytes] of edits.splice(0)) op === 'put' ? await c.put(uri.slice('/main'.length), bytes) : c.remove(uri.slice('/main'.length))
    await c.commit('test', { author: { name: 'test', email: 'test@localhost' } })
  }
  return { exec, commit, repo }
}

test('deploy, teardown, redeploy a child', async (t) => {
  const work = mkdtempSync(join(tmpdir(), 'deploy-'))
  const src = mkdtempSync(join(tmpdir(), 'deploy-src-'))
  try {
    structure(src)
    await build({ from: src, work, name: 'boot' })
    const backend = p2pgitBackend(gitdirOf(work, 'boot'), { fs })
    const { exec, commit, repo } = context(work, backend)
    const setting = readFileSync(join(work, 'mrepo.json'), 'utf8')

    const d = await deploy(exec, { uri: '/host' })
    await commit()
    t.is(d.deployed, '/host')
    t.alike(Object.keys(d.layers).sort(), ['main', 'runtime'], 'built from its definition')
    t.ok(existsSync(gitdirOf(work, 'host')), 'the child: <work>/mrepos/host/.git')
    const child = openRepo(p2pgitBackend(gitdirOf(work, 'host'), { fs }))
    t.is(JSON.parse((await child.read('/runtime/service.json')).toString()).type, 'haicc')
    t.is(JSON.parse((await repo.read('/main/host.json')).toString()).name, 'host', 'linked into the parent\'s main')
    t.is(readFileSync(join(work, 'mrepo.json'), 'utf8'), setting, 'the work folder\'s setting still the parent\'s')
    await t.exception(deploy(exec, { uri: '/host' }), /deployed already/)

    const r = await redeploy(exec, { uri: '/host' })
    await commit()
    t.is(r.tornDown, '/host')
    t.is(r.deployed, '/host', 'redeployed')
    t.ok((await repo.select('/main/host.json')).length, 'linked again')

    t.alike(await teardown(exec, { uri: '/host' }), { tornDown: '/host' })
    await commit()
    t.absent(existsSync(join(work, 'mrepos', 'host')), 'the child removed')
    t.absent((await repo.select('/main/host.json')).length, 'its link out of main')
    await t.exception(teardown(exec, { uri: '/host' }), /not deployed/)
    await t.exception(deploy(exec, { uri: '/nothing' }), /no definition/)
    await t.exception(deploy(exec, { uri: '/../x' }), /not a child/)
  } finally {
    rmSync(work, { recursive: true, force: true })
    rmSync(src, { recursive: true, force: true })
  }
})
