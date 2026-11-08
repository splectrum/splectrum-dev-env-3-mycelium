// The host's prerequisites, checked and fixed by the root's boot: the
// boot's own copy (it depends on nothing: haicc-reconcile's machine kinds
// hold the same checks for projects in managers; a test in the development
// repository keeps the two agreeing). Each fix only with a person's yes,
// with sudo unless root.
//   for (const c of CHECKS) { const a = c.observe(); c.met(a); await c.fix(ask, a) }
import { spawnSync } from 'bare-subprocess'
import process from 'bare-process'

// A stuck command (a Docker daemon not answering) counts as no answer.
const run = (cmd, args) => { const r = spawnSync('timeout', ['20', cmd, ...args], { stdio: ['ignore', 'pipe', 'ignore'] }); return r.status === 0 ? String(r.stdout).trim() : null }
const has = cmd => spawnSync('sh', ['-c', `command -v ${cmd}`], { stdio: 'ignore' }).status === 0
export const atLeast = (v, min) => { const a = v.split('.').map(Number); const b = String(min).split('.').map(Number); for (let i = 0; i < b.length; i++) { if ((a[i] || 0) !== b[i]) return (a[i] || 0) > b[i] } return true }
const root = () => run('id', ['-u']) === '0'
const user = () => run('id', ['-un'])

// A change to the machine: asked first; run (with sudo unless root), its
// output the person's to see.
async function change (ask, what, cmds) {
  if (!(await ask(what))) return { done: false, said: `not done: ${what}` }
  for (const c of cmds) {
    const argv = root() ? c : ['sudo', ...c]
    const r = spawnSync(argv[0], argv.slice(1), { stdio: ['ignore', 'inherit', 'inherit'] })
    if (r.status !== 0) return { done: false, said: `${argv.join(' ')}: exit ${r.status}` }
  }
  return { done: true, said: `done: ${what}` }
}

export const CHECKS = [
  {
    name: 'git',
    observe () { const v = run('git', ['--version']); return v ? { version: v.split(' ')[2] } : null },
    met: a => Boolean(a && atLeast(a.version, '2.25')),
    detail: a => a ? a.version : 'not installed',
    fix: ask => change(ask, 'install git with apt', [['apt-get', 'update', '-q'], ['apt-get', 'install', '-y', '-q', 'git']]),
    hint: 'git 2.25 or later is needed (apt-get install git)'
  },
  {
    name: 'docker-installed',
    observe: () => has('docker') ? { version: (run('docker', ['--version']) || '').split(' ')[2]?.replace(',', '') } : null,
    met: a => Boolean(a),
    detail: a => a ? a.version : 'not installed',
    fix: ask => change(ask, 'install Docker Engine (docker.io) with apt', [['apt-get', 'update', '-q'], ['apt-get', 'install', '-y', '-q', 'docker.io']]),
    hint: 'Docker Engine is needed (apt-get install docker.io)'
  },
  {
    name: 'docker-running',
    observe: () => ({ running: Boolean(run('docker', ['version', '--format', '{{.Server.Version}}'])) }),
    met: a => a.running,
    detail: a => a.running ? 'running' : 'not reachable (not running, or no access: docker-group)',
    fix: ask => change(ask, 'start the Docker daemon', [has('systemctl') ? ['systemctl', 'start', 'docker'] : ['service', 'docker', 'start']]),
    hint: 'start the Docker daemon (systemctl start docker, or service docker start)'
  },
  {
    name: 'docker-group',
    observe () {
      if (root()) return { member: true, as: 'root' }
      const member = (run('id', ['-nG']) || '').split(' ').includes('docker')
      const listed = (run('getent', ['group', 'docker']) || '').split(':')[3]?.split(',').includes(user()) ?? false
      return { member, listed }
    },
    met: a => a.member,
    detail: a => a.as || (a.member ? 'member' : a.listed ? 'added: holds from the next login' : 'not in the docker group'),
    fix: (ask, a) => a.listed ? { done: false, said: 'added already: log in again (or: newgrp docker)' } : change(ask, `add ${user()} to the docker group`, [['usermod', '-aG', 'docker', user()]]),
    hint: 'log in again for the docker group to hold (or: newgrp docker), then boot again'
  },
  {
    name: 'docker-native',
    observe () {
      const out = run('docker', ['info', '--format', '{{json .}}'])
      if (!out) return null
      const info = JSON.parse(out)
      return { rootless: (info.SecurityOptions || []).some(o => /rootless/.test(o)), desktop: /Docker Desktop/i.test(info.OperatingSystem || '') }
    },
    met: a => Boolean(a && !a.rootless && !a.desktop),
    detail: a => !a ? 'not reachable' : a.rootless ? 'rootless' : a.desktop ? 'Docker Desktop' : 'rootful, native',
    fix: null,
    hint: 'Docker Engine, rootful and native, is needed: not Docker Desktop, not rootless (in WSL2: inside the distribution)'
  }
]
