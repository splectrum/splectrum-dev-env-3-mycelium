#!/usr/bin/env bare
// haicc: a node's HAICC (<swarm>/<node>/haicc <command>), from the
// platform's package (packages/base-package-haicc), copied in by its
// swarm's cold boot.
//   haicc boot                        the node's warm boot: what was copied in validated by
//                                     the node itself: each package intact (its hash), then
//                                     its validation set, in place; then, the swarm having a
//                                     codebase, its container started from its config
//                                     (node.json): the swarm's node running, from the master's
//                                     packages (mounted read-only); up when it says it started
//   haicc shutdown                    the node's shutdown: its container stopped and removed;
//                                     its folder kept (its config, its key), for its boot
// Removing a node is its swarm's: <swarm>/haicc shutdown <node>.
//   haicc test <package> [--set=<set>]   a package here: intact (its hash), then its tests, bottom up
//   haicc fetch <repository>          a repository into the root's haiccing/
//   haicc list | version
// The node's folder ($HAICC_WORK): packages/ (whole repositories, each with
// its package.json), log/ (its log); the root's haiccing/ two up. A node
// installs nothing: its codebase is the master's package repository,
// assembled by the package manager (with the swarm's step). What every
// command prints goes to log/ too, in order (files of 10 KB named by their
// start, newest last); --verbose and --debug say more. Exit 0 when done; 1
// when not (the output says what is missing); 2 on a bad call.
import process from 'bare-process'
import { existsSync, readFileSync, readdirSync, writeFileSync, renameSync } from 'bare-fs'
import { join, resolve, dirname, basename } from 'bare-path'
import { spawnSync } from 'bare-subprocess'
import { fileURLToPath } from 'bare-url'
import { openLog } from './lib/log.js'
import { selfTest } from './lib/selftest.js'
import { pkgm } from './lib/pkgm.js'
import { ensureImage, startContainer, stopContainer } from './lib/container.js'

const { testPackage, verify } = await pkgm()

const argv = process.argv.slice(2)
const flags = Object.fromEntries(argv.filter(a => a.startsWith('--')).map(a => { const [k, v] = a.slice(2).split('='); return [k, v ?? true] }))
const [verb, name] = argv.filter(a => !a.startsWith('--'))
const work = resolve(process.env.HAICC_WORK || '.')
const packages = join(work, 'packages')
// The root's haiccing/: a node is two down from it (<work>/<swarm>/<node>).
const haiccing = [join(work, 'haiccing'), join(work, '..', 'haiccing'), join(work, '..', '..', 'haiccing')].find(d => existsSync(d)) || join(work, 'haiccing')

// The command as it was called (the launcher's $0, HAICC_AS), not passed on.
const calledAs = process.env.HAICC_AS || `./${basename(dirname(work))}/${basename(work)}/haicc`
process.env.HAICC_AS = ''   // (Bare's environment refuses a delete)
const log = openLog({ dir: join(work, 'log'), command: [calledAs, ...argv], level: flags.debug ? 'debug' : flags.verbose ? 'verbose' : 'normal' })

const usage = () => { process.stderr.write(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1).filter((l, i, a) => a.slice(0, i + 1).every(x => x.startsWith('//'))).map(l => l.replace(/^\/\/ ?/, '')).join('\n') + '\n'); process.exit(2) }
const fetchScript = join(packages, 'base-package-haicc', 'modules', 'pear-full-square', 'haicc-base-boot', 'fetch.sh')
// What is here: the repositories copied in whole, each with its manifest.
const packagesHere = () => {
  const found = {}
  for (const n of existsSync(packages) ? readdirSync(packages).sort() : []) {
    const f = join(packages, n, 'package.json')
    if (existsSync(f)) { const h = JSON.parse(readFileSync(f, 'utf8')).pkgm?.hash; if (h) found[n] = { hash: h } }
  }
  return found
}

function printTest (n, t) {
  for (const r of t.runs) console.log(`  ${r.ok ? 'ok    ' : 'FAILED'} ${n}: ${r.what} (${r.pass}/${r.tests})${r.ok ? '' : '\n' + r.output}`)
  return t.ok
}

// The node's config (node.json, written by its swarm's cold boot): its
// name, role, key, container, network, address, its codebase and master.
const configFile = join(work, 'node.json')
const readConfig = () => existsSync(configFile) ? JSON.parse(readFileSync(configFile, 'utf8')) : null
const writeConfig = c => { writeFileSync(configFile + '.new', JSON.stringify(c, null, 2) + '\n'); renameSync(configFile + '.new', configFile) }

try {
  if (verb === 'shutdown') {
    // The node's shutdown: its container stopped and removed; its folder
    // kept (its HAICC, its config and key, its log), for its boot.
    console.log(`The node ${basename(dirname(work))}/${basename(work)}: its shutdown`)
    const c = readConfig()
    if (c?.container) {
      const r = stopContainer(c)
      console.log(`  ${r.said}`)
      if (!r.ok) process.exit(1)
      if (c.live) { delete c.live; writeConfig(c) }
    } else console.log('  its container: none (no codebase here), nothing to stop')
    console.log('Shut down')
    process.exit(0)
  } else if (verb === 'boot') {
    // The node's warm boot: what was copied in, validated by the node
    // itself (each package intact, then its validation set); then its
    // container started (with the swarm's step: none yet).
    console.log(`The node ${basename(dirname(work))}/${basename(work)}: its warm boot, validating what was copied in (${packages})`)
    const t = selfTest(packages)
    const failed = t.runs.filter(r => !r.ok)
    if (!t.repos.length) console.log('  no packages here: nothing to test')
    console.log(t.ok ? `Ready: ${t.runs.length} test runs passed (${t.repos.join(', ')})` : `Not ready: ${failed.length} of ${t.runs.length} test runs failed`)
    if (!t.ok) process.exit(1)
    const c = readConfig()
    if (!c?.code) { console.log('  its container: none (the swarm has no codebase), nothing to start'); process.exit(0) }
    const img = ensureImage(dirname(process.execPath))
    if (!img.ok) { console.log(`  its image ${img.tag}: could not be built: ${img.said}`); process.exit(1) }
    console.log(`  its image: ${img.tag}${img.built ? ', built' : ''} (Bare's runtime; the code mounted, not in it)`)
    console.log(`  its container ${c.container} (${c.role}, ${c.ip} on ${c.network}): the swarm's codebase from ${c.code}, read-only`)
    const r = await startContainer(c, work, img.tag)
    console.log(`  ${r.ok ? 'ok    ' : 'FAILED'} the node ${r.said}${r.ok ? ` (${(r.ms / 1000).toFixed(1)} s)` : ''}`)
    if (!r.ok) { console.log(`  its log: docker logs ${c.container}`); process.exit(1) }
    writeConfig({ ...c, live: { key: r.owner, dht: r.dht } })
    console.log('Running')
    process.exit(0)
  } else if (verb === 'version') {
    console.log(`haicc, the node ${work}`)
    for (const [n, p] of Object.entries(packagesHere())) console.log(`  ${n}: ${p.hash.slice(0, 12)}`)
  } else if (verb === 'list') {
    console.log(`packages (${packages}):`)
    for (const [n, p] of Object.entries(packagesHere())) console.log(`  ${n}  ${p.hash.slice(0, 12)}`)
  } else if (verb === 'fetch') {
    if (!name) usage()
    const r = spawnSync('sh', [fetchScript, haiccing, '--requires', name], { encoding: 'utf8', env: { ...process.env, PATH: `${dirname(process.execPath)}:${process.env.PATH}` } })
    if (r.stdout) process.stdout.write(r.stdout)
    if (r.status !== 0) { console.log(`haicc fetch: ${name} could not be fetched (haiccing/sources)`); process.exit(1) }
  } else if (verb === 'test') {
    if (!name) usage()
    const dir = join(packages, name)
    if (!existsSync(join(dir, 'package.json'))) { console.log(`haicc test: no package ${name} here (${packages})`); process.exit(1) }
    // Intact first (its hash against the one it was written with), then its tests (--set=<set>).
    const v = verify(dir)
    console.log(`  ${v.ok ? 'ok    ' : 'FAILED'} ${name}: ${v.said}`)
    const ok = v.ok && printTest(name, testPackage(dir, { set: flags.set ? String(flags.set) : null }))
    console.log(ok ? `test ${name}: passed` : `test ${name}: FAILED`)
    process.exit(ok ? 0 : 1)
  } else usage()
} catch (err) {
  console.log(`haicc ${verb}: ${err.message}`)
  process.exit(1)
}
