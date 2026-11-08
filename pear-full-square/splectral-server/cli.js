#!/usr/bin/env bare
// The Splectral server, from the command line: runs until stopped
// (SIGTERM, SIGINT).
//   bare cli.js --config=<config.json>
// Prints one JSON line with its URL when it is listening.
//   bare cli.js act --config=<config.json> --action=<id> [--with=<json>]
// A client: the action produced into a client topic of its own, its result
// read back (the server may start after it is asked). One JSON line.

import { readFileSync, writeSync } from 'bare-fs'
import { dirname, resolve } from 'bare-path'
import process from 'bare-process'
import { startServer } from './index.js'

// Written at once: on Bare, console.log bypasses process.stdout, and output
// still buffered for a pipe is lost to an exit.
const say = v => writeSync(1, JSON.stringify(v) + '\n')

const argv = process.argv.slice(2)
const flags = Object.fromEntries(argv.filter(a => a.startsWith('--')).map(a => { const i = a.indexOf('='); return [a.slice(2, i), a.slice(i + 1)] }))
const file = resolve(flags.config)
const config = JSON.parse(readFileSync(file, 'utf8'))
// Folders in the configuration are relative to it.
const at = p => resolve(dirname(file), p)
if (argv[0] === 'act') {
  const { askServer } = await import('./client.js')
  const out = await askServer({ runs: at(config.runs || 'runs'), action: flags.action, with: flags.with ? JSON.parse(flags.with) : {} }).catch(err => ({ ok: false, error: err.message }))
  say(out)
  process.exit(out.ok ? 0 : 1)
}
config.extensions = (config.extensions || []).map(at)
if (config.runs) config.runs = at(config.runs)
const s = await startServer({ config })
say({ event: 'listening', url: s.url })
const stop = async () => { await s.close(); process.exit(0) }
process.on('SIGTERM', stop)
process.on('SIGINT', stop)
