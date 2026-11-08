#!/usr/bin/env bare
// haicc at the root of a work folder (./haicc): the part of HAICC the host
// needs, run from packages/base-package-haicc (copied in by ./boot,
// stage 1), on Bare (its runtime in bare/, from the platform's package). The
// work folder: HAICC_WORK.
// Each `haicc boot` or `haicc shutdown` works on the configuration of the folder
// it is called from, and keeps it; removing a child is `teardown <child>`.
// At the root (./haicc), on swarms.json, the host's swarms:
//   haicc boot [--yes]           the host's prerequisites (git, Docker Engine), checked
//                                and fixed with a yes; each swarm in swarms.json booted;
//                                then haiccing/install, if there, or the next commands
//   haicc boot <swarm>           a swarm here (swarms.json): booted, from its own copy
//   haicc boot <repo>[/<swarm>] [--from=<folder>] [--as=<name>] [--strict]
//                                a package's swarms (or the one), made from its configuration
//                                (swarms/<swarm>/ in the package, from haiccing/, fetched if
//                                not there, or from --from): the package checked intact; the
//                                swarm's folder (its launcher, its config files copied); its
//                                entry in swarms.json (where from, its hash); then booted (the
//                                master's build assembles the codebase into its packages/).
//                                --as names a single swarm otherwise; --strict: its nodes are
//                                its package's only (none added or torn down by hand).
//   haicc shutdown [<swarm>]     each swarm's (or the one's) shutdown: its nodes removed,
//                                its folder and nodes.json kept
//   haicc teardown <swarm>       the swarm removed: its nodes, its folder, its entry
//   haicc shutdown --cold        (./shutdown) everything removed back to the setup: the
//                                swarms, swarms.json, packages/, ./haicc; kept: haiccing/,
//                                log/, bare/ (the runtime; external downloads are retained)
// In a swarm (<swarm>/haicc), on its nodes.json (copied from its package):
//   haicc boot [<node>] [--role=master|node] [--no-echo]
//                                each node (or the one: added if new, unless the swarm is
//                                strict), the master first: the platform's pair copied in
//                                afresh, its launcher, the swarm's codebase assembled into the
//                                master's packages/<package>/ from
//                                the swarm's package (the package manager), then its own
//                                boot (<swarm>/<node>/haicc boot), as it happens
//   haicc shutdown [<node>]      each node's (or the one's) cold shutdown: its container
//                                removed, its folder removed; nodes.json kept
//   haicc teardown <node>        the node removed, and its entry (not in a strict swarm)
// A functionality of a package, by its URI (from haiccing/, or --from=<folder>):
//   haicc boot <repo>/test/<test> [--keep]   a test: its folder copied into swarms/test/<test>/,
//                                its cold boot (its boot script) run there, its result its
//                                exit code; then its teardown (its own, else the platform's)
//   haicc boot <repo>/test [--set=full]      a set (test/<set>.json): its tests run in place
//                                (the package manager), then each booted one
// Both: haicc fetch <repository> (into haiccing/), haicc list, haicc sources (what the
// sources hold, listed, and kept as haiccing/sources.json).
// The root's boot refreshes the platform's pair (HAICC, the package manager) from the
// sources and deploys it, every time; nodes get it as they boot.
// Removing is asked first (--yes agrees). Names are made URI parts, the changes said.
// --verbose: each check's detail too. What every command prints goes to
// log/ as well, in order (files of 10 KB named by their start, newest last). Exit 0 when done,
// 1 when not (the output says what is missing), 2 on a bad call.
import process from 'bare-process'
import { existsSync, readdirSync, readFileSync, openSync, closeSync, mkdirSync, writeFileSync, chmodSync, renameSync, rmSync, rmdirSync, writeSync, readSync } from 'bare-fs'
import { join, dirname, resolve } from 'bare-path'
import { spawn, spawnSync } from 'bare-subprocess'
import { isTTY } from 'bare-tty'
import { fileURLToPath } from 'bare-url'
import { openLog } from './lib/log.js'
import { CHECKS } from './lib/host.js'
import { pkgm } from './lib/pkgm.js'
import crypto from 'bare-crypto'

const here = dirname(fileURLToPath(import.meta.url))
const argv = process.argv.slice(2)
const flags = Object.fromEntries(argv.filter(a => a.startsWith('--')).map(a => { const [k, v] = a.slice(2).split('='); return [k, v ?? true] }))
const [verb, name] = argv.filter(a => !a.startsWith('--'))
const work = resolve(process.env.HAICC_WORK || '.')
const haiccing = join(work, 'haiccing')
// A swarm's command run by the root (the root echoes and logs every line of
// it: HAICC_NOLOG) does not log itself; typed, it does.
const level = flags.debug ? 'debug' : flags.verbose ? 'verbose' : 'normal'
// Said and logged: the command's header and close line (a command run by
// the root, HAICC_NOLOG, says them only: the root logs what it echoes).
// The command as it was called (the launcher's $0, HAICC_AS), not passed on.
const calledAs = process.env.HAICC_AS || (process.env.HAICC_SWARM ? `./${process.env.HAICC_SWARM}/haicc` : './haicc')
process.env.HAICC_AS = ''   // (Bare's environment refuses a delete)
// The root's log/: a swarm runs the root's HAICC, so it logs there too (a
// node runs its own HAICC, in its own log/).
const log = openLog({ dir: join(work, 'log'), file: process.env.HAICC_NOLOG !== '1', command: flags.cold ? [process.env.HAICC_SHUTDOWN_AS || './shutdown', ...argv.filter(a => a !== 'shutdown' && a !== '--cold')] : [calledAs, ...argv], level })

const usage = () => { process.stderr.write(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1).filter((l, i, a) => a.slice(0, i + 1).every(x => x.startsWith('//'))).map(l => l.replace(/^\/\/ ?/, '')).join('\n') + '\n'); process.exit(2) }

// A yes, asked of the person (or given with --yes; none without a terminal).
async function ask (what) {
  if (flags.yes) { console.log(`  yes (--yes): ${what}`); return true }
  let fd
  try { fd = openSync('/dev/tty', 'r+') } catch { console.log(`  not done, no terminal to ask (--yes to agree): ${what}`); return false }
  // The question on the terminal, the answer read from it to the end of its
  // line (no answer, Ctrl-D: a no).
  writeSync(fd, `  ${what}? [y/N] `)
  let answer = ''
  const b = Buffer.alloc(1)
  try { while (readSync(fd, b, 0, 1) === 1 && b[0] !== 10) answer += String.fromCharCode(b[0]) } catch {}
  closeSync(fd)
  const yes = /^y(es)?$/i.test(answer.trim())
  // The answer recorded: on a terminal, the question and the answer are
  // already there, so to the log only; to a pipe or a file, said.
  const record = `  ${what}? ${yes ? 'yes' : 'no'}\n`
  if (isTTY(1)) log.note?.(`  ${what}? [y/N] ${answer.trim()}\n`)
  else process.stdout.write(record)
  return yes
}

// The host's prerequisites, in order: checked; what is missing fixed with
// a yes and checked again; what is still missing said, with its hint.
async function hostPrerequisites () {
  console.log("The host's prerequisites (git, Docker Engine):")
  const missing = []
  for (const c of CHECKS) {
    process.stdout.write(`  checking ${c.name}... `)
    let a = c.observe()
    if (c.met(a)) { console.log(`ok (${c.detail(a)})`); continue }
    console.log(`missing (${c.detail(a)})`)
    if (c.fix) {
      const r = await c.fix(ask, a)
      console.log(`  ${r.said}`)
      if (r.done) a = c.observe()   // nothing changed otherwise
      if (r.done && c.met(a)) { console.log(`  ok      ${c.name}  ${c.detail(a)}`); continue }
    }
    console.log(`  ${c.name}: ${c.hint}`)
    missing.push(c.name)
  }
  if (missing.length) { console.log(`Not booted (${missing.join(', ')}): fix what is said above, then ./haicc boot again`); return false }
  console.log(`  all ${CHECKS.length} met`)
  return true
}

// haiccing/install: one haicc command a line, each its own command (it
// logs itself), stopping at the first failure.
function installFile () {
  const file = join(haiccing, 'install')
  if (!existsSync(file)) {
    console.log(`\nBooted. Next, from ${work}:`)
    console.log('  ./haicc boot <swarm>          a swarm: its folder, launcher and nodes.json')
    console.log('  <swarm>/haicc boot master     its master: a node\'s manager, its own HAICC')
    console.log('  ./haicc list                  the swarms here, their nodes')
    return 0
  }
  console.log('\nhaiccing/install:')
  const lines = readFileSync(file, 'utf8').split('\n')
  for (let n = 1; n <= lines.length; n++) {
    const line = lines[n - 1].trim()
    if (!line || line.startsWith('#')) continue
    console.log(`\n[${n}] ./haicc ${line}`)
    const r = spawnSync(join(work, 'haicc'), line.split(/\s+/), { stdio: 'inherit' })
    if (r.status !== 0) { console.log(`haiccing/install stopped at line ${n}: ./haicc ${line}`); return 1 }
  }
  console.log('\nhaiccing/install done')
  return 0
}

// The work folder's own folders and files: not a swarm's name; a swarm's
// own files: not a node's name.
const OWN = ['packages', 'haiccing', 'bare', 'nodejs', 'log', 'haicc', 'boot', 'shutdown', 'swarms.json', 'swarms', 'user']
const SWARM_OWN = ['haicc', 'nodes.json', 'splectral']
const ROLES = ['master', 'node']
const inSwarm = process.env.HAICC_SWARM || null
// A name made a URI part: lowercase a-z, 0-9, words joined by single '-'.
export const cleanName = raw => raw.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

// A name, cleaned, the change said; null (and why) when nothing is left of it.
function clean (raw, what, own) {
  const n = cleanName(raw || '')
  if (!n) { console.log(`haicc: '${raw ?? ''}': no ${what} name in it (a-z, 0-9)`); return null }
  if (n !== raw) console.log(`The ${what} name '${raw}' is not a URI part (lowercase a-z, 0-9, words joined by single '-'): it is '${n}'.`)
  if (own.includes(n)) { console.log(`haicc: '${n}' is taken by the ${what === 'swarm' ? 'work folder' : 'swarm\'s folder'} itself (${own.join(', ')}): choose another name`); return null }
  return n
}

// The configurations: swarms.json (the host's swarms, in order), and each
// swarm's nodes.json (its nodes here and their roles).
const jsonFile = {
  read: (f, empty) => existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : empty,
  write: (f, v) => { writeFileSync(f + '.new', JSON.stringify(v, null, 2) + '\n'); renameSync(f + '.new', f) }
}
const swarmsFile = join(work, 'swarms.json')
const readSwarms = () => jsonFile.read(swarmsFile, { swarms: {} })
const nodesFile = swarm => join(work, swarm, 'nodes.json')
const readNodes = swarm => jsonFile.read(nodesFile(swarm), { swarm, nodes: {} })
// A swarm's nodes in the order to take them down: the nodes, then the master.
const downOrder = s => Object.keys(s.nodes).sort((a, b) => (s.nodes[a].role === 'master') - (s.nodes[b].role === 'master') || a.localeCompare(b))

// A child HAICC run, its output here as it happens (each line marked), or
// only its last line; its exit code.
async function echoed (cmd, args, env, cwd = undefined) {
  const child = spawn(cmd, args, { cwd, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] })
  let last = ''; let partial = ''; let atStart = true
  const echo = chunk => {
    const s = String(chunk)
    const lines = (partial + s).split('\n')
    partial = lines.pop()
    for (const l of lines) if (l.trim()) last = l
    // Each line marked once, where it starts (a chunk can end mid-line).
    if (!flags['no-echo']) process.stdout.write((atStart ? '  | ' : '') + s.replace(/\n(?=.)/g, '\n  | '))
    atStart = s.endsWith('\n')
  }
  child.stdout.on('data', echo); child.stderr.on('data', echo)
  const code = await new Promise(resolve => child.on('close', resolve))
  if (partial.trim()) last = partial
  if (flags['no-echo']) console.log(`  | ${last}`)
  return code
}

// Removing is asked once, by the command the person typed (its children
// are told --yes).
async function confirm (what) {
  console.log(`${what}. A plain remove: no way back.`)
  return ask('go ahead')
}

const hostReady = () => {
  const notMet = CHECKS.filter(c => !c.met(c.observe())).map(c => c.name)
  if (notMet.length) console.log(`The host is not ready (${notMet.join(', ')}): ./haicc boot first`)
  return !notMet.length
}

// ---- a swarm, from its folder: on nodes.json ----------------------------

// A node built if its folder is not there (its cold boot: the platform's
// package, base-package-haicc, copied in whole: HAICC and the package
// manager; its launcher); then its own boot (warm), as it happens.
async function bootNode (swarm, node) {
  const dir = join(work, swarm, node)
  if (existsSync(dir) && !existsSync(join(dir, 'packages'))) { console.log(`The node ${swarm}/${node}: ${dir} is there, and not a node's manager`); return 1 }
  console.log(`The node ${swarm}/${node} (${readNodes(swarm).nodes[node]?.role}), its manager (${dir}):`)
  // Built again from scratch: a node running is stopped first (its own
  // shutdown), as what it runs from is copied in again.
  if (existsSync(join(dir, 'haicc')) && nodeConfigOf(swarm, node)?.container) {
    const code = await echoed(join(dir, 'haicc'), ['shutdown'], { HAICC_WORK: dir, HAICC_NOLOG: '', HAICC_SWARM: '' })
    if (code !== 0) { console.log(`  its shutdown ended with exit ${code}: not built again`); return 1 }
  }
  mkdirSync(join(dir, 'packages'), { recursive: true })
  // The platform's pair, copied in afresh every time (as haiccing/ has it: the
  // root's boot refreshes it); the node's warm boot deploys it properly.
  for (const repo of PLATFORM) {
    const at = join(dir, 'packages', repo)
    if (!existsSync(join(haiccing, repo, 'package.json'))) {
      const f = spawnSync('sh', [join(here, 'fetch.sh'), haiccing, repo], { env: { ...process.env, PATH: `${dirname(process.execPath)}:${process.env.PATH}` } })
      process.stdout.write(String(f.stdout || ''))
      if (f.status !== 0) { console.log(`  ${repo}: could not be fetched (haiccing/sources)`); return 1 }
    }
    const c = spawnSync('sh', ['-c', 'rm -rf "$2.new" && cp -al "$1" "$2.new" && rm -rf "$2.new/.git" && rm -rf "$2" && mv "$2.new" "$2"', 'copy', join(haiccing, repo), at] )
    if (c.status !== 0) { console.log(`  ${repo}: could not be copied in: ${String(c.stderr || '').trim()}`); return 1 }
    const hash = JSON.parse(readFileSync(join(at, 'package.json'), 'utf8')).pkgm?.hash?.slice(0, 12)
    console.log(`  copied ${repo} (${hash}) into ${join(dir, 'packages')}`)
  }
  if (readNodes(swarm).nodes[node]?.role === 'master' && await assembleRepository(swarm, dir)) return 1
  if (writeNodeConfig(swarm, node, dir)) return 1
  if (!existsSync(join(dir, 'haicc'))) {
    writeFileSync(join(dir, 'haicc.new'), `#!/bin/sh
# HAICC for the node ${swarm}/${node} (written by its swarm's HAICC): ${swarm}/${node}/haicc <command>,
# the node's own HAICC (installed in its packages/).
work=$(cd "$(dirname "$0")" && pwd)
HAICC_WORK=$work; HAICC_AS=$0; export HAICC_WORK HAICC_AS
PATH=$work/../../bare:$PATH; export PATH
exec bare "$work/packages/base-package-haicc/modules/pear-full-square/haicc-deployment/haicc.js" "$@"
`)
    chmodSync(join(dir, 'haicc.new'), 0o755)
    renameSync(join(dir, 'haicc.new'), join(dir, 'haicc'))
    console.log(`  written ${join(dir, 'haicc')}`)
  }
  console.log(`Its boot (${swarm}/${node}/haicc boot)${flags['no-echo'] ? ', its outcome only' : ''}:`)
  const code = await echoed(join(dir, 'haicc'), ['boot'], { HAICC_WORK: dir, HAICC_NOLOG: '', HAICC_SWARM: '' })
  console.log(code === 0 ? `The node ${swarm}/${node}: up` : `The node ${swarm}/${node}: its boot ended with exit ${code} (its log: ${swarm}/${node}/log/)`)
  return code === 0 ? 0 : 1
}

// The master's package repository: the swarm's codebase, assembled by the
// package manager from the swarm's package (where swarms.json says it came
// from) into the master's packages/<package>/ (every level's packages are
// in its packages/), at every build of the master. None
// for a swarm without a codebase (no modules.json).
async function assembleRepository (swarm, dir) {
  const entry = readSwarms().swarms[swarm] || {}
  if (!entry.package || !existsSync(join(work, swarm, 'modules.json'))) return 0
  const pkg = join(entry.root, entry.package)
  if (!existsSync(join(pkg, 'swarms', entry.swarm)) && !(entry.root === haiccing && packageDir(entry.package))) { console.log(`  its codebase: the package ${pkg} is not there (swarms.json): not assembled`); return 1 }
  const { assemble } = await pkgm()
  try {
    const a = assemble({ from: pkg, swarm: entry.swarm, into: join(dir, 'packages', entry.package) })
    console.log(`  its packages: the codebase of ${entry.package}/swarms/${entry.swarm} assembled into ${swarm}/${dir.split('/').pop()}/packages/${entry.package}/: ${a.ours} modules of ours, ${a.third} third-party (${a.hash.slice(0, 12)})`)
    return 0
  } catch (err) { console.log(`  its codebase could not be assembled: ${err.message}`); return 1 }
}

// ---- a swarm's nodes running: Docker -------------------------------------

const dockerRun = (...args) => { const r = spawnSync('docker', args, { stdio: ['ignore', 'pipe', 'pipe'] }); return { ok: r.status === 0, out: String(r.stdout || '').trim(), err: String(r.stderr || '').trim() } }
// This install's id: its folder, hashed (Docker's names are host-wide).
const installId = crypto.createHash('sha256').update(work).digest('hex').slice(0, 8)
const networkOf = swarm => `haicc-${installId}-${swarm}`
const labels = swarm => ({ 'haicc.install': work, 'haicc.swarm': swarm })

// The swarm's network (one per swarm, labelled with the install): made on
// its first node's boot, removed with its shutdown. Its subnet, as
// [a, b, c, d] and the prefix.
function ensureNetwork (swarm) {
  const name = networkOf(swarm)
  if (!dockerRun('network', 'inspect', name).ok) {
    const labelArgs = Object.entries(labels(swarm)).flatMap(([k, v]) => ['--label', `${k}=${v}`])
    let c = dockerRun('network', 'create', ...labelArgs, name)
    // Docker 28 gives a node its address (--ip) only on a network made with a
    // subnet: the one Docker picked, made again with it given.
    if (c.ok) {
      const [sub, gw] = dockerRun('network', 'inspect', '-f', '{{(index .IPAM.Config 0).Subnet}} {{(index .IPAM.Config 0).Gateway}}', name).out.split(' ')
      dockerRun('network', 'rm', name)
      c = dockerRun('network', 'create', ...labelArgs, '--subnet', sub, ...(gw ? ['--gateway', gw] : []), name)
    }
    if (!c.ok) { console.log(`  the swarm's network ${name}: could not be made: ${c.err}`); return null }
    console.log(`  the swarm's network ${name}: made`)
  }
  const subnet = dockerRun('network', 'inspect', '-f', '{{(index .IPAM.Config 0).Subnet}}', name).out
  const [base, bits] = subnet.split('/')
  return { name, subnet, base: base.split('.').map(Number), bits: Number(bits) }
}
function removeNetwork (swarm) {
  const name = networkOf(swarm)
  if (!dockerRun('network', 'inspect', name).ok) return
  const r = dockerRun('network', 'rm', name)
  console.log(r.ok ? `  the swarm's network ${name}: removed` : `  the swarm's network ${name}: not removed: ${r.err}`)
}

const nodeConfigOf = (swarm, node) => jsonFile.read(join(work, swarm, node, 'node.json'), null)

// A node's config (node.json, in its folder): its name, role and key (made
// at its first build, kept while its folder is: in readable text for now);
// for a swarm with a codebase, its container, network, address, the code
// (the master's packages/<package>/) and, for a node that is not the
// master, the master's key and DHT (from the master's config, once it runs).
function writeNodeConfig (swarm, node, dir) {
  const role = readNodes(swarm).nodes[node]?.role || 'node'
  const had = jsonFile.read(join(dir, 'node.json'), {})
  const config = { swarm, name: node, role, key: had.key || crypto.randomBytes(32).toString('hex') }
  const entry = readSwarms().swarms[swarm] || {}
  const nodes = readNodes(swarm).nodes
  const master = Object.keys(nodes).find(n => nodes[n].role === 'master')
  if (entry.package && existsSync(join(work, swarm, 'modules.json')) && master) {
    const net = ensureNetwork(swarm)
    if (!net) return 1
    // Its address: kept, else the first free one from .10 on in the subnet.
    const taken = new Set(Object.keys(nodes).filter(n => n !== node).map(n => nodeConfigOf(swarm, n)?.ip).filter(Boolean))
    const at = i => { const n = ((net.base[0] << 24) >>> 0) + (net.base[1] << 16) + (net.base[2] << 8) + net.base[3] + i; return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.') }
    let ip = had.ip && had.network === net.name ? had.ip : null
    for (let i = 10; !ip; i++) if (!taken.has(at(i))) ip = at(i)
    Object.assign(config, { container: `${net.name}-${node}`, network: net.name, ip, labels: labels(swarm), code: join(work, swarm, master, 'packages', entry.package) })
    if (role !== 'master') {
      const live = nodeConfigOf(swarm, master)?.live
      if (!live?.dht) { console.log(`  the master ${swarm}/${master} is not running (its node.json has no live key): boot it first (${swarm}/haicc boot ${master})`); return 1 }
      config.master = live
    }
  }
  jsonFile.write(join(dir, 'node.json'), config)
  console.log(`  its config ${swarm}/${node}/node.json: its key${had.key ? ' (kept)' : ' (new)'}${config.container ? `, its container ${config.container} at ${config.ip}` : ''}`)
  return 0
}

// ---- a swarm's Splectral: its server, on this host ----------------------

// A swarm whose package names Splectral components (splectral.json:
// components, the host's name in scenarios, a port) gets a Splectral
// server: on the host (it reads the containers' logs and acts on them),
// from the master's packages (the components are in the swarm's codebase),
// in the background, started with the swarm's boot and stopped with its
// shutdown. Its folder: <swarm>/splectral/ (config.json, server.pid, its
// output in server.log, runs/: its actions and scenario runs). Other hosts
// a demo plays (splectral.json's `hosts`: a host of its own, its nodes
// joined by invitation, run by node managers, inside the swarm): a folder
// each, hosts/<host>/ (its node managers' folders, its invitation), with
// its vault (vaults/<host>/) and its boot program's code (the swarm's
// package, as the master's packages/ hold it); its managers stopped with
// the server.
const splectralDir = swarm => join(work, swarm, 'splectral')
const sh = (script, ...args) => { const r = spawnSync('sh', ['-c', script, 'sh', ...args], { stdio: ['ignore', 'pipe', 'pipe'] }); return { ok: r.status === 0, out: String(r.stdout || '').trim() } }
const runningPid = swarm => {
  const f = join(splectralDir(swarm), 'server.pid')
  if (!existsSync(f)) return null
  const pid = readFileSync(f, 'utf8').trim()
  return sh('kill -0 "$1" 2>/dev/null', pid).ok ? pid : null
}

function stopSplectral (swarm) {
  // The other hosts' node managers first: each stops its node gracefully.
  const others = join(splectralDir(swarm), 'hosts')
  for (const host of existsSync(others) ? readdirSync(others).sort() : []) {
    for (const n of readdirSync(join(others, host)).sort()) {
      const f = join(others, host, n, 'manager.pid')
      if (!existsSync(f)) continue
      const pid = readFileSync(f, 'utf8').trim()
      if (!sh('kill -0 "$1" 2>/dev/null', pid).ok) continue
      sh('kill "$1"; i=0; while kill -0 "$1" 2>/dev/null && [ $i -lt 600 ]; do sleep 0.1; i=$((i+1)); done; true', pid)
      console.log(`  ${host}'s node manager ${n} (pid ${pid}): stopped`)
    }
  }
  const pid = runningPid(swarm)
  rmSync(join(splectralDir(swarm), 'server.pid'), { force: true })
  if (!pid) return 0
  sh('kill "$1"; i=0; while kill -0 "$1" 2>/dev/null && [ $i -lt 50 ]; do sleep 0.1; i=$((i+1)); done; kill -9 "$1" 2>/dev/null; true', pid)
  console.log(`  its Splectral server (pid ${pid}): stopped`)
  return 0
}

async function startSplectral (swarm) {
  const sp = jsonFile.read(join(work, swarm, 'splectral.json'), null)
  if (!sp?.components?.length) return 0
  const entry = readSwarms().swarms[swarm] || {}
  const nodes = readNodes(swarm).nodes
  const master = Object.keys(nodes).find(n => nodes[n].role === 'master')
  const modules = join(work, swarm, master || 'master', 'packages', entry.package || '', 'modules')
  // A module of the codebase by its name: modules/<org>/<name>.
  const find = name => (existsSync(modules) ? readdirSync(modules).sort() : []).filter(o => o !== 'node_modules').map(o => join(modules, o, name)).find(d => existsSync(join(d, 'package.json')))
  const server = find('splectral-server')
  const extensions = sp.components.map(c => [c, find(c)])
  const missing = [...(server ? [] : ['splectral-server']), ...extensions.filter(([, d]) => !d || !existsSync(join(d, 'splectral.json'))).map(([c]) => c)]
  if (missing.length) { console.log(`  its Splectral: not in the swarm's codebase (${modules}): ${missing.join(', ')}`); return 1 }
  stopSplectral(swarm)
  const dir = splectralDir(swarm)
  mkdirSync(join(dir, 'runs'), { recursive: true })
  const host = sp.host || 'host-a'
  const config = { port: sp.port ?? 0, host: '127.0.0.1', extensions: extensions.map(([, d]) => d), sources: [{ kind: 'haicc-swarm', host, folder: join(work, swarm) }], runs: join(dir, 'runs'), hosts: { [host]: { folder: join(work, swarm) } } }
  for (const other of sp.hosts || []) {
    const folder = join(dir, 'hosts', other)
    mkdirSync(folder, { recursive: true })
    config.hosts[other] = { folder, vault: join(dir, 'vaults', other), boot: dirname(modules) }
    config.sources.push({ kind: 'p2p-host', host: other, folder })
  }
  jsonFile.write(join(dir, 'config.json'), config)
  const log = join(dir, 'server.log')
  // In a session of its own, so it outlives this command; its pid kept.
  const r = sh('setsid "$1" "$2" "--config=$3" > "$4" 2>&1 < /dev/null & echo $!', process.execPath, join(server, 'cli.js'), join(dir, 'config.json'), log)
  if (!r.ok || !r.out) { console.log('  its Splectral server: could not be started'); return 1 }
  writeFileSync(join(dir, 'server.pid'), r.out + '\n')
  for (let i = 0; i < 300; i++) {
    const text = existsSync(log) ? readFileSync(log, 'utf8') : ''
    const url = text.split('\n').map(l => { try { return JSON.parse(l).url } catch { return null } }).find(Boolean)
    if (url) { console.log(`  its Splectral: ${url} (${sp.components.join(', ')}; pid ${r.out}, its output ${swarm}/splectral/server.log)`); return 0 }
    if (!runningPid(swarm)) break
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  console.log(`  its Splectral server did not start: ${(existsSync(log) ? readFileSync(log, 'utf8') : '').trim().split('\n').slice(-3).join(' | ')}`)
  stopSplectral(swarm)
  return 1
}

// A node's cold shutdown: its own shutdown (its container removed), then
// its folder removed.
async function removeNode (swarm, node) {
  const dir = join(work, swarm, node)
  if (!existsSync(dir)) { console.log(`The node ${swarm}/${node}: not here (nothing to remove)`); return 0 }
  if (existsSync(join(dir, 'haicc'))) {
    console.log(`The node ${swarm}/${node} (${swarm}/${node}/haicc shutdown):`)
    const code = await echoed(join(dir, 'haicc'), ['shutdown'], { HAICC_WORK: dir, HAICC_NOLOG: '', HAICC_SWARM: '' })
    if (code !== 0) { console.log(`The node ${swarm}/${node}: its shutdown ended with exit ${code}: not removed (its log: ${swarm}/${node}/log/)`); return 1 }
  }
  rmSync(dir, { recursive: true, force: true })
  console.log(`  removed ${swarm}/${node}/`)
  return 0
}

// A strict swarm (--strict when made): its nodes are its package's only
// (nodes.json, copied from it), none added or torn down by hand.
const strict = swarm => Boolean(readSwarms().swarms[swarm]?.strict)
const refusedStrict = (swarm, s, node) => console.log(`haicc: the swarm ${swarm} is strict: its nodes are its package's (nodes.json: ${Object.keys(s.nodes).join(', ') || 'none'})${node ? `, ${node} is not one` : ''}; change the package, make the swarm again`)

async function swarmBoot (swarm, node) {
  const s = readNodes(swarm)
  if (node) {
    if (!s.nodes[node]) {
      if (strict(swarm)) { refusedStrict(swarm, s, node); return 1 }
      if (!hostReady()) return 1
      const master = Object.keys(s.nodes).find(n => s.nodes[n].role === 'master')
      const role = flags.role || (master ? 'node' : 'master')
      if (!ROLES.includes(role)) { console.log(`haicc boot: --role=${role}: a role is one of ${ROLES.join(', ')}`); return 2 }
      if (role === 'master' && master) { console.log(`haicc boot: the swarm ${swarm} has its master already (${master})`); return 1 }
      s.nodes[node] = { role }
      jsonFile.write(nodesFile(swarm), s)
      console.log(`The swarm ${swarm}: ${node} added to nodes.json, its role ${role}`)
    }
    if (!hostReady()) return 1
    return bootNode(swarm, node)
  }
  if (!hostReady()) return 1
  // Each node in nodes.json, the master first.
  const order = [...downOrder(s).filter(n => s.nodes[n].role === 'master'), ...downOrder(s).filter(n => s.nodes[n].role !== 'master')]
  console.log(`The swarm ${swarm}: its nodes booted, the master first (${order.join(', ') || 'none in nodes.json'})`)
  for (const n of order) if (await bootNode(swarm, n)) return 1
  return startSplectral(swarm)
}

async function swarmShutdown (swarm, node, { asked = false } = {}) {
  const s = readNodes(swarm)
  if (node) {
    if (!s.nodes[node]) { console.log(`haicc shutdown: no node ${node} in the swarm ${swarm}`); return 1 }
    if (!asked && !(await confirm(`The node ${swarm}/${node}: its cold shutdown, its container and its folder removed (kept in nodes.json)`))) return 1
    return removeNode(swarm, node)
  }
  const order = downOrder(s)
  if (!asked && !(await confirm(`The swarm ${swarm}: its nodes' cold shutdown, the master last (${order.join(', ') || 'none'}): their folders removed; kept: nodes.json`))) return 1
  console.log(`The swarm ${swarm}: its nodes shut down, the master last (${order.join(', ') || 'none'})`)
  stopSplectral(swarm)
  for (const n of order) if (await removeNode(swarm, n)) return 1
  removeNetwork(swarm)
  return 0
}

async function swarmTeardown (swarm, node) {
  const s = readNodes(swarm)
  if (strict(swarm)) { refusedStrict(swarm, s); return 1 }
  if (!s.nodes[node]) { console.log(`haicc teardown: no node ${node} in the swarm ${swarm}`); return 1 }
  if (!(await confirm(`The node ${swarm}/${node} removed: its container, its folder, its entry in nodes.json`))) return 1
  if (await removeNode(swarm, node)) return 1
  delete s.nodes[node]
  jsonFile.write(nodesFile(swarm), s)
  console.log(`The swarm ${swarm}: ${node} removed from nodes.json`)
  return 0
}

// ---- the root: on swarms.json ------------------------------------------------

// A swarm's launcher (the root's HAICC, in that swarm).
function writeSwarmLauncher (swarm) {
  writeFileSync(join(work, swarm, 'haicc'), `#!/bin/sh
# The swarm ${swarm} on this host (written by the root's HAICC): ${swarm}/haicc <command>,
# the root's HAICC in this swarm.
work=$(cd "$(dirname "$0")/.." && pwd)
HAICC_WORK=$work; HAICC_SWARM=${swarm}; HAICC_AS=$0; export HAICC_WORK HAICC_SWARM HAICC_AS
PATH=$work/bare:$PATH; export PATH
exec bare "$work/packages/base-package-haicc/modules/pear-full-square/haicc-base-boot/haicc.js" "$@"
`)
  chmodSync(join(work, swarm, 'haicc'), 0o755)
}

// A package's swarms (or the one), made from its configuration: the package
// checked (sealed: intact, else refused; without a hash, from --from: mixed,
// and said); each swarm's folder (its launcher, its config files copied), its
// entry in swarms.json; then booted (the master's build assembles its
// repository from the package).
// A swarm already here from the same package and path: booted from its own
// copy; from another: refused.
async function deployPackage (uri) {
  const [repo, only] = uri.split('/')
  const pkg = packageDir(repo)
  if (!pkg) { if (!only && !flags.from) console.log(`  (and no swarm ${repo} here: swarms.json)`); return 1 }
  const root = flags.from ? resolve(work, String(flags.from)) : haiccing
  const { verify, assemble } = await pkgm()
  const v = verify(pkg)
  const sealed = v.ok
  if (!v.ok && (v.recorded || !flags.from)) { console.log(`The package ${repo}: ${v.said}: not deployed`); return 1 }
  console.log(`The package ${repo} (${pkg}): ${sealed ? v.said : 'no hash recorded: mixed (a development package, --from)'}`)
  const there = existsSync(join(pkg, 'swarms')) ? readdirSync(join(pkg, 'swarms')).filter(d => existsSync(join(pkg, 'swarms', d, 'nodes.json'))).sort() : []
  const wanted = only ? [only] : there
  if (!wanted.length) { console.log(`The package ${repo}: no swarms in it (swarms/<swarm>/nodes.json)`); return 1 }
  for (const w of wanted) if (!there.includes(w)) { console.log(`The package ${repo}: no swarm ${w} in it (swarms/: ${there.join(', ') || 'none'})`); return 1 }
  if (flags.as && wanted.length > 1) { console.log(`haicc boot: --as names a single swarm; ${repo} has ${wanted.length} (${wanted.join(', ')}): name one, ${repo}/<swarm>`); return 2 }
  if (!hostReady()) return 1
  for (const w of wanted) {
    const swarm = clean(flags.as ? String(flags.as) : w, 'swarm', OWN)
    if (!swarm) return 2
    const from = { package: repo, root, swarm: w }
    const had = readSwarms().swarms[swarm]
    if (had) {
      if (had.package !== repo || had.root !== root || had.swarm !== w) { console.log(`haicc boot: the swarm ${swarm} is here already, made from ${had.package ? `${had.root}/${had.package}/swarms/${had.swarm}` : 'by hand'}: --as=<another name>, or teardown ${swarm} first`); return 1 }
      console.log(`The swarm ${swarm}: here already, from ${repo}/swarms/${w}: booted from its own copy`)
    } else {
      if (existsSync(join(work, swarm))) { console.log(`haicc boot: ${join(work, swarm)} is there, and not a swarm of swarms.json: choose another name (--as)`); return 1 }
      const src = join(pkg, 'swarms', w)
      const dir = join(work, swarm)
      mkdirSync(dir, { recursive: true })
      writeSwarmLauncher(swarm)
      const files = readdirSync(src).filter(f => f.endsWith('.json')).sort()
      for (const f of files) writeFileSync(join(dir, f), readFileSync(join(src, f)))
      jsonFile.write(nodesFile(swarm), { swarm, ...JSON.parse(readFileSync(join(src, 'nodes.json'), 'utf8')) })
      console.log(`The swarm ${swarm}: made from ${repo}/swarms/${w}: its launcher ${swarm}/haicc, ${files.join(', ')}`)
      const all = readSwarms()
      all.swarms[swarm] = { ...from, hash: sealed ? v.hash : null, sealed, strict: Boolean(flags.strict), made: new Date().toISOString() }
      jsonFile.write(swarmsFile, all)
      console.log(`The host: ${swarm} added to swarms.json (${sealed ? 'sealed' : 'mixed'}${flags.strict ? ', strict' : ''})`)
    }
    console.log(`The swarm ${swarm} (${swarm}/haicc boot):`)
    if (await inSwarmRun(swarm, ['boot', ...(flags['no-echo'] ? ['--no-echo'] : [])])) return 1
  }
  return 0
}

// A swarm's own command, through its launcher (it logs in the root's log too).
const inSwarmRun = (swarm, args) => echoed(join(work, swarm, 'haicc'), args, { HAICC_WORK: work, HAICC_SWARM: swarm, HAICC_NOLOG: '1' })

// The platform's pair: HAICC and the package manager (HAICC uses it from beside it).
const PLATFORM = ['base-package-haicc', 'base-package-pkgm']

// Every root boot: the pair fetched again from the sources, then deployed at
// the root by the package manager (staged, intact, validated, put in place);
// the nodes get it as they boot. Nothing compared, nothing kept.
async function refreshPlatform () {
  console.log("The platform's pair, refreshed from the sources (haiccing/sources):")
  const f = await echoed('sh', [join(here, 'fetch.sh'), haiccing, '--refresh', ...PLATFORM], { PATH: `${dirname(process.execPath)}:${process.env.PATH}` })
  if (f !== 0) { console.log("  not refreshed: the sources could not give the platform's pair (above)"); return 1 }
  const { deploy } = await pkgm()
  for (const repo of ['base-package-pkgm', 'base-package-haicc']) {
    const r = deploy({ from: join(haiccing, repo), into: join(work, 'packages', repo) })
    console.log(`  ${r.ok ? 'ok    ' : 'FAILED'} ${repo}: ${r.said}`)
    if (!r.ok) {
      for (const x of (r.runs || []).filter(x => !x.ok)) console.log((x.output || '').split('\n').slice(-20).map(l => `         ${l}`).join('\n'))
      return 1
    }
  }
  return 0
}

// What the sources hold: listed, and kept as a manifest (haiccing/sources.json).
async function listSources () {
  const r = spawnSync('sh', [join(here, 'fetch.sh'), haiccing, '--list'], { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, PATH: `${dirname(process.execPath)}:${process.env.PATH}` } })
  process.stderr.write(String(r.stderr || ''))
  const held = String(r.stdout || '').split('\n').filter(Boolean).map(l => { const [repository, kind, ...where] = l.split(' '); return { repository, kind, where: where.join(' ') } })
  jsonFile.write(join(haiccing, 'sources.json'), { listed: new Date().toISOString(), repositories: held })
  console.log(`The sources (haiccing/sources): ${held.length} repositories (haiccing/sources.json)`)
  for (const h of held) console.log(`  ${h.repository}  (${h.kind} ${h.where})`)
  return r.status === 0 ? 0 : 1
}

async function rootBoot (swarm) {
  if (swarm) {
    if (!readSwarms().swarms[swarm] || swarm.includes('/') || flags.from || flags.as) return deployPackage(swarm)
    if (!hostReady()) return 1
    console.log(`The swarm ${swarm} (${swarm}/haicc boot):`)
    return (await inSwarmRun(swarm, ['boot', ...(flags['no-echo'] ? ['--no-echo'] : [])])) ? 1 : 0
  }
  if (!(await hostPrerequisites())) return 1
  if (await refreshPlatform()) return 1
  const all = Object.keys(readSwarms().swarms)
  if (all.length) {
    console.log(`The host's swarms (swarms.json): ${all.join(', ')}`)
    for (const sw of all) {
      console.log(`The swarm ${sw} (${sw}/haicc boot):`)
      if (await inSwarmRun(sw, ['boot', ...(flags['no-echo'] ? ['--no-echo'] : [])])) { console.log(`The host's boot stopped at the swarm ${sw}`); return 1 }
    }
  }
  return installFile()
}

async function rootShutdown (swarm) {
  const all = swarm ? [swarm] : Object.keys(readSwarms().swarms).reverse()
  if (swarm && !readSwarms().swarms[swarm]) { console.log(`haicc shutdown: no swarm ${swarm} here (swarms.json)`); return 1 }
  if (!(await confirm(`${swarm ? `The swarm ${swarm}` : `The host's swarms (${all.join(', ') || 'none'})`}: their nodes' cold shutdown, their folders removed; kept: each swarm's folder and nodes.json, swarms.json`))) return 1
  for (const sw of all) {
    console.log(`The swarm ${sw} (${sw}/haicc shutdown):`)
    if (await inSwarmRun(sw, ['shutdown', '--yes'])) return 1
  }
  return 0
}

async function rootTeardown (swarm) {
  const all = readSwarms()
  if (!all.swarms[swarm] && !existsSync(nodesFile(swarm))) { console.log(`haicc teardown: no swarm ${swarm} here`); return 1 }
  if (!(await confirm(`The swarm ${swarm} removed: its nodes' cold shutdown, its folder, its entry in swarms.json`))) return 1
  if (existsSync(join(work, swarm, 'haicc'))) {
    console.log(`The swarm ${swarm} (${swarm}/haicc shutdown):`)
    if (await inSwarmRun(swarm, ['shutdown', '--yes'])) return 1
  }
  rmSync(join(work, swarm), { recursive: true, force: true })
  console.log(`  removed ${swarm}/`)
  delete all.swarms[swarm]
  jsonFile.write(swarmsFile, all)
  console.log(`The host: ${swarm} removed from swarms.json`)
  return 0
}

// ---- a functionality, by its URI: tests ------------------------------------

// The package a URI starts from: in haiccing/ (fetched if not there), or in
// the folder --from names.
function packageDir (repo) {
  const root = flags.from ? resolve(work, String(flags.from)) : haiccing
  const dir = join(root, repo)
  if (!existsSync(join(dir, 'package.json')) && !flags.from) {
    const f = spawnSync('sh', [join(here, 'fetch.sh'), haiccing, repo], { env: { ...process.env, PATH: `${dirname(process.execPath)}:${process.env.PATH}` } })
    process.stdout.write(String(f.stdout || ''))
  }
  // From haiccing/: a written package (package.json); from --from, any folder.
  if (!existsSync(join(dir, flags.from ? '' : 'package.json'))) { console.log(`no package ${repo} in ${root}`); return null }
  return dir
}

// The platform's default teardown for a test (platform/test/teardown in
// the platform's package), else: its run's folder removed.
const platformPackage = resolve(here, '..', '..', '..')
async function teardownTest (run, env) {
  const own = join(run, 'teardown')
  const standard = join(platformPackage, 'platform', 'test', 'teardown')
  const script = existsSync(own) ? own : existsSync(standard) ? standard : null
  if (script) return echoed('sh', [script], env)
  rmSync(run, { recursive: true, force: true })
  return 0
}

// One booted test: its folder copied into its run's (swarms/test/<test>/),
// its cold boot run there, as it happens; then its teardown.
async function bootTest (repo, pkg, t) {
  const src = join(pkg, 'test', t)
  const meta = existsSync(join(src, 'test.json')) ? JSON.parse(readFileSync(join(src, 'test.json'), 'utf8')) : {}
  const uri = `${repo}/test/${t}`
  if ((meta.needs || []).includes('docker') && !hostReady()) { console.log(`  skipped ${uri}: it needs Docker Engine, not ready here`); return 'skipped' }
  if (meta.destroys) {
    console.log(`The test ${uri} changes what is outside its run: ${meta.destroys}. A new install may be needed after it.`)
    if (!(await ask('run it'))) { console.log(`  skipped ${uri}: not agreed`); return 'skipped' }
  }
  const run = join(work, 'swarms', 'test', t)
  rmSync(run, { recursive: true, force: true })
  mkdirSync(dirname(run), { recursive: true })
  const c = spawnSync('cp', ['-a', src, run] )
  if (c.status !== 0) { console.log(`  FAILED ${uri}: its folder could not be copied: ${String(c.stderr).trim()}`); return 'failed' }
  console.log(`The test ${uri} (its run: swarms/test/${t}/), its cold boot:`)
  const env = { HAICC_WORK: work, HAICC_PACKAGE: pkg, HAICC_RUN: run, HAICC_PLATFORM: platformPackage, HAICC_NOLOG: '1', HAICC_SWARM: '' }
  const t0 = Date.now()
  const code = existsSync(join(run, 'boot')) ? await echoed('sh', [join(run, 'boot')], { ...env, PWD: run }, run) : 1
  const secs = ((Date.now() - t0) / 1000).toFixed(1)
  if (flags.keep) console.log(`  kept (--keep): swarms/test/${t}/`)
  else {
    const td = await teardownTest(run, env)
    console.log(td === 0 ? `  torn down: swarms/test/${t}/` : `  its teardown ended with exit ${td}: swarms/test/${t}/ may be left`)
    // No empty folders left: swarms/test/, swarms/.
    for (const d of [join(work, 'swarms', 'test'), join(work, 'swarms')]) { try { rmdirSync(d) } catch {} }
  }
  console.log(`  ${code === 0 ? 'ok    ' : 'FAILED'} ${uri} (${secs} s${code === 0 ? '' : `, exit ${code}`})`)
  return code === 0 ? 'passed' : 'failed'
}

// A test, or a set: in place first (the package manager), then the booted ones.
async function bootTests (uri) {
  const [repo, , t] = uri.split('/')
  const pkg = packageDir(repo)
  if (!pkg) return 1
  const tally = { passed: 0, failed: 0, skipped: 0 }
  const { testPackage } = await pkgm()
  let booted = []
  if (t) {
    if (!existsSync(join(pkg, 'test', t))) { console.log(`no test ${t} in ${repo} (test/${t})`); return 1 }
    if (existsSync(join(pkg, 'test', t, 'boot'))) booted = [t]
    else {
      const r = spawnSync('sh', [join(pkg, 'test', t, 'test')], { cwd: join(pkg, 'test', t) })
      process.stdout.write(String(r.stdout || '') + String(r.stderr || ''))
      const ok = r.status === 0
      console.log(`  ${ok ? 'ok    ' : 'FAILED'} ${uri}`); tally[ok ? 'passed' : 'failed']++
    }
  } else {
    const set = String(flags.set || 'full')
    console.log(`The tests of ${repo}, the set ${set} (test/${set}.json): in place first`)
    let r
    try {
      r = testPackage(pkg, { set, log: e => { if (e.kind === 'tested') console.log(`  ${e.ok ? 'ok    ' : 'FAILED'} ${repo}/${e.what} (${e.pass}/${e.tests}, ${(e.ms / 1000).toFixed(1)} s)`) } })
    } catch (err) { console.log(err.message); return 1 }
    for (const x of r.runs) { tally[x.ok ? 'passed' : 'failed']++; if (!x.ok) console.log(x.output.split('\n').slice(-20).map(l => `         ${l}`).join('\n')) }
    booted = r.booted
  }
  for (const b of booted) tally[await bootTest(repo, pkg, b)]++
  console.log(`${tally.failed ? 'FAILED' : 'Passed'}: ${tally.passed} passed, ${tally.failed} failed, ${tally.skipped} skipped`)
  return tally.failed ? 1 : 0
}

// The cold shutdown (./shutdown): every swarm removed, then the root's own,
// back to the setup.
async function coldShutdown () {
  const all = Object.keys(readSwarms().swarms).reverse()
  if (!(await confirm(`The work folder, cold: every swarm (${all.join(', ') || 'none'}), swarms.json, packages/ and ./haicc removed; kept: haiccing/, log/, bare/ (./boot sets it up again)`))) return 1
  for (const sw of all) {
    if (existsSync(join(work, sw, 'haicc'))) {
      console.log(`The swarm ${sw} (${sw}/haicc shutdown):`)
      if (await inSwarmRun(sw, ['shutdown', '--yes'])) { console.log('The cold shutdown stopped: a swarm could not be shut down (above)'); return 1 }
    }
    rmSync(join(work, sw), { recursive: true, force: true }); console.log(`  removed ${sw}/`)
  }
  rmSync(swarmsFile, { force: true }); console.log('  removed swarms.json')
  if (existsSync(join(work, 'swarms'))) { rmSync(join(work, 'swarms'), { recursive: true, force: true }); console.log('  removed swarms/ (test runs)') }
  // Last: what runs this command (it is loaded: removing its files is safe).
  rmSync(join(work, 'packages'), { recursive: true, force: true }); console.log('  removed packages/')
  rmSync(join(work, 'haicc'), { force: true }); console.log('  removed ./haicc')
  console.log(`The work folder: shut down, cold (kept: haiccing/, log/${existsSync(join(work, 'bare')) ? ', bare/' : ''}); ./boot sets it up again`)
  return 0
}

function list () {
  const all = inSwarm ? [inSwarm] : Object.keys(readSwarms().swarms)
  console.log(`swarms (${inSwarm ? `${work}/${inSwarm}` : `${work}, swarms.json`}):${all.length ? '' : ' none yet'}`)
  for (const sw of all) {
    const s = readNodes(sw)
    console.log(`  ${sw}`)
    for (const n of downOrder(s).reverse()) console.log(`    ${n}  ${s.nodes[n].role}${existsSync(join(work, sw, n, 'haicc')) ? '' : '  (not built: shut down)'}`)
  }
  return 0
}

// What a command names: a swarm (at the root) or a node (in a swarm); null:
// not a name.
// One name, of this level's child: a path is refused, not cleaned into one name.
const isTestUri = arg => /^[^/]+\/test(\/[^/]+)?$/.test(arg || '')
const named = arg => {
  if (arg === undefined || verb === 'fetch' || (verb === 'boot' && !inSwarm && isTestUri(arg))) return arg
  // At the root, <repo>/<swarm>: a package's swarm (not a swarm's node).
  if (verb === 'boot' && !inSwarm && /^[^/]+\/[^/]+$/.test(arg) && !readSwarms().swarms[arg.split('/')[0]]) return arg
  if (arg.includes('/')) {
    const [a, b] = arg.split('/')
    console.log(inSwarm
      ? `'${arg}': one node's name here (${inSwarm}/haicc ${verb} <node>)`
      : `'${arg}': one swarm's name here; a node is its swarm's: ${a}/haicc ${verb} ${b || '<node>'}`)
    return null
  }
  return inSwarm ? clean(arg, 'node', SWARM_OWN) : clean(arg, 'swarm', OWN)
}

try {
  const n = named(name)
  if (n === null) process.exit(2)
  if (verb === 'boot' && !inSwarm && isTestUri(n)) process.exit(await bootTests(n))
  if (verb === 'boot') process.exit(inSwarm ? await swarmBoot(inSwarm, n) : await rootBoot(n))
  else if (verb === 'shutdown') {
    if (flags.cold && !inSwarm && !n) process.exit(await coldShutdown())
    process.exit(inSwarm ? await swarmShutdown(inSwarm, n, { asked: Boolean(flags.yes) }) : await rootShutdown(n))
  } else if (verb === 'teardown') {
    if (!n) { console.log(`haicc teardown <${inSwarm ? 'node' : 'swarm'}>: which ${inSwarm ? 'node' : 'swarm'} to remove`); process.exit(2) }
    process.exit(inSwarm ? await swarmTeardown(inSwarm, n) : await rootTeardown(n))
  } else if (verb === 'sources') {
    process.exit(await listSources())
  } else if (verb === 'fetch') {
    if (!name) usage()
    // As it happens, through our own stdout (the log sees it too).
    const code = await new Promise(resolve => {
      const c = spawn('sh', [join(here, 'fetch.sh'), haiccing, '--requires', name], { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, PATH: `${dirname(process.execPath)}:${process.env.PATH}` } })
      c.stdout.on('data', d => process.stdout.write(d))
      c.stderr.on('data', d => process.stderr.write(d))
      c.on('close', resolve)
    })
    if (code !== 0) console.log(`haicc fetch: not all of ${name} could be fetched (haiccing/sources)`)
    process.exit(code === 0 ? 0 : 1)
  } else if (verb === 'list') process.exit(list())
  else usage()
} catch (err) {
  console.log(`haicc ${verb}: ${err.message}`)
  process.exit(1)
}
