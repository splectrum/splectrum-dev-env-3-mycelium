// The node actions against stand-ins for docker and a node's HAICC: a node
// found by its URI, paused and resumed only from the right state, stopped and
// started by its own HAICC.
import test from 'brittle'
import { mkdtempSync, mkdirSync, writeFileSync, chmodSync, rmSync, readFileSync, existsSync } from 'bare-fs'
import { join } from 'bare-path'
import { tmpdir } from 'bare-os'
import process from 'bare-process'
import { findNode } from '../lib/hosts.js'
import pause from '../pause.js'
import resume from '../resume.js'
import stop from '../stop.js'
import start from '../start.js'

test('find, pause, resume, stop, start', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'actions-'))
  const bin = join(dir, 'bin')
  mkdirSync(bin)
  const state = join(dir, 'state')
  writeFileSync(state, 'running')
  // docker: a container's state kept in a file; pause and unpause change it.
  writeFileSync(join(bin, 'docker'), `#!/bin/sh
case "$1" in
  inspect) s=$(cat "${state}"); [ "$s" = gone ] && exit 1; echo "$s" ;;
  pause) echo paused > "${state}" ;;
  unpause) echo running > "${state}" ;;
esac
`)
  chmodSync(join(bin, 'docker'), 0o755)
  const swarm = join(dir, 'hosts')
  mkdirSync(join(swarm, 'node-1'), { recursive: true })
  writeFileSync(join(swarm, 'node-1', 'node.json'), JSON.stringify({ swarm: 'hosts', name: 'node-1', role: 'node', container: 'c1' }))
  // The node's HAICC: shutdown and boot, said in a file; its environment its own.
  writeFileSync(join(swarm, 'node-1', 'haicc'), `#!/bin/sh
echo "$1 work=[$HAICC_WORK]" >> "${dir}/said"
[ "$1" = shutdown ] && echo gone > "${state}"
[ "$1" = boot ] && echo running > "${state}"
exit 0
`)
  chmodSync(join(swarm, 'node-1', 'haicc'), 0o755)
  const path = process.env.PATH
  process.env.PATH = `${bin}:${path}`
  process.env.HAICC_WORK = '/elsewhere'
  const ctx = { config: { hosts: { 'host-a': { folder: swarm } } } }
  try {
    t.is((await findNode(ctx.config, '/hosts/node-1')).state, 'running')
    await t.exception(findNode(ctx.config, '/hosts/node-9'), /no node here/)
    await t.exception(resume({ node: '/hosts/node-1' }, ctx), /not paused/)
    t.alike(await pause({ node: '/hosts/node-1' }, ctx), { node: '/hosts/node-1', paused: true })
    t.is((await findNode(ctx.config, '/hosts/node-1')).state, 'paused')
    t.alike(await resume({ node: '/hosts/node-1' }, ctx), { node: '/hosts/node-1', resumed: true })
    t.alike(await stop({ node: '/hosts/node-1' }, ctx), { node: '/hosts/node-1', stopped: true })
    t.is((await start({ node: '/hosts/node-1' }, ctx)).started, true)
    t.is(readFileSync(join(dir, 'said'), 'utf8'), 'shutdown work=[]\nboot work=[]\n', 'its own HAICC, no level\'s settings passed on')
  } finally {
    process.env.PATH = path
    process.env.HAICC_WORK = ''
    rmSync(dir, { recursive: true, force: true })
  }
})
