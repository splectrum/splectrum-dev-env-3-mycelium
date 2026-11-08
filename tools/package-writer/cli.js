#!/usr/bin/env bare
// The package writer: haiccing's packages written (the development environment's side of the airgap):
//   tools/bare tools/package-writer/cli.js --out=<folder of package repositories> [--only=a,b] [--keep] [--quiet]
// From this repository (packages.json, its modules, haiccing/<repo>/). Progress
// to stderr as JSON lines; the result to stdout, as JSON; exit 1 when a test
// fails (nothing written).
import process from 'bare-process'
import { join, dirname } from 'bare-path'
import { fileURLToPath } from 'bare-url'
import { writeSync } from 'bare-fs'
import { writePackages } from './index.js'

const flags = Object.fromEntries(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => { const [k, v] = a.slice(2).split('='); return [k, v ?? true] }))
if (!flags.out) { writeSync(2, '--out=<folder> needed\n'); process.exit(2) }
const dev = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const log = flags.quiet ? () => {} : e => writeSync(2, JSON.stringify(e) + '\n')
const r = writePackages({ dev, out: flags.out, only: flags.only ? String(flags.only).split(',') : null, keep: Boolean(flags.keep), log })
// Written at once, then the process ends by itself: on Bare, output still
// buffered for a pipe is lost to an exit.
writeSync(1, JSON.stringify({ ok: r.ok, written: r.written, failed: r.results.flatMap(x => x.runs.filter(y => !y.ok).map(y => ({ dir: x.dir, ...y }))), scratch: r.scratch }, null, 2) + '\n')
process.exitCode = r.ok ? 0 : 1
