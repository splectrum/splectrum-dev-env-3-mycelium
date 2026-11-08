#!/usr/bin/env bare
// One node's manager, from the command line: runs for the node's life.
//   bare cli.js join --invitation=<file> --folder=<node-folder> --vault=<vault-dir>
//                    --name=<node> --ip=<address on the swarm's network> --aux-subnet=<a.b.c>
//                    --boot=<folder: the boot program's code, an assembled package>
//                    [--image=<tag>] [--observer=true] [--metrics-every=<ms>]
//   (a node on a host of its own: its auxiliary network made here, no swarm
//   manager; the image the invitation's unless named)
// Writes its pid to <folder>/manager.pid; SIGTERM or SIGINT stops the node
// gracefully, then the manager exits. Prints one JSON line when the node
// is ready ({ event: 'ready', ...state }), and one when it has exited
// ({ event: 'exited', ...state }).
import process from 'bare-process'
import { mkdirSync, writeFileSync, rmSync, readFileSync, writeSync } from 'bare-fs'
import { join, resolve } from 'bare-path'
import { joinFromInvitation } from './index.js'
import { vault } from './vault.js'
import { validateName } from '../mycelium-uri/index.js'

const argv = process.argv.slice(2)
const flags = Object.fromEntries(argv.filter(a => a.startsWith('--')).map(a => { const [k, ...v] = a.slice(2).split('='); return [k, v.join('=')] }))
const [op] = argv.filter(a => !a.startsWith('--'))
// Written synchronously: a line just before the exit is not lost.
const say = o => writeSync(1, JSON.stringify(o) + '\n')
if (op !== 'join') { writeSync(2, 'usage: cli.js join --invitation=... (see the header)\n'); process.exit(2) }

try {
  // The boundary: names from the command line and the invitation, validated
  // once (mycelium-uri); inside, they are trusted.
  const invitation = JSON.parse(readFileSync(flags.invitation, 'utf8'))
  validateName(invitation.swarm, 'swarm name')
  validateName(flags.name, 'node name')
  if (!flags.boot) throw new Error('--boot=<folder> is needed: the boot program\'s code')

  mkdirSync(flags.folder, { recursive: true })
  writeFileSync(join(flags.folder, 'manager.pid'), String(process.pid) + '\n')
  // The previous run's state is the previous run's.
  rmSync(join(flags.folder, 'state.json'), { force: true })
  const m = await joinFromInvitation({
    invitation: flags.image ? { ...invitation, image: flags.image } : invitation,
    folder: flags.folder,
    vault: vault(flags.vault),
    boot: resolve(flags.boot),
    name: flags.name,
    ip: flags.ip,
    auxSubnet: flags['aux-subnet'],
    observer: flags.observer === 'true',
    metricsEvery: Number(flags['metrics-every'] || 30000)
  })
  let stopping = null
  const stop = () => { stopping ??= m.stop() }
  process.on('SIGTERM', stop)
  process.on('SIGINT', stop)
  m.ready.then(s => say({ event: 'ready', ...s }), () => {})
  const end = await m.done
  await m.flush()
  if (stopping) await stopping
  say({ event: 'exited', ...end })
  rmSync(join(flags.folder, 'manager.pid'), { force: true })
  process.exit(end.exitCode === 0 ? 0 : 1)
} catch (err) {
  writeSync(2, `p2p-node-manager: ${err.message}\n`)
  rmSync(join(flags.folder || '.', 'manager.pid'), { force: true })
  process.exit(1)
}
