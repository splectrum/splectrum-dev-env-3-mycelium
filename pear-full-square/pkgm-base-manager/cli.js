#!/usr/bin/env bare
// pkgm: the package manager.
//   pkgm assemble <package folder> <swarm> --into=<repository>   a swarm's codebase into its master's repository
//   pkgm test     <package folder | repository> [--set=<set>]   its tests run in place, bottom up (a set: test/<set>.json)
//   pkgm contents <repository>                                  what is there, and where from
// Progress to stderr as JSON lines (--quiet: none); the result to stdout,
// as JSON; exit 1 when a test fails or the operation is refused, 2 on a bad call.
import process from 'bare-process'
import { readFileSync, writeSync } from 'bare-fs'
import { assemble, testPackage, contentsOf } from './index.js'

const [op, ...rest] = process.argv.slice(2)
const flags = Object.fromEntries(rest.filter(a => a.startsWith('--')).map(a => { const [k, v] = a.slice(2).split('='); return [k, v ?? true] }))
const args = rest.filter(a => !a.startsWith('--'))
const log = flags.quiet ? () => {} : e => writeSync(2, JSON.stringify(e) + '\n')
// Written at once (on Bare, output buffered for a pipe is lost to an exit).
const out = (v, ok = true) => { writeSync(1, JSON.stringify(v, null, 2) + '\n'); process.exit(ok ? 0 : 1) }
const need = (v, what) => { if (!v) { writeSync(2, `pkgm ${op}: ${what} needed\n`); process.exit(2) } return v }

try {
  if (op === 'assemble') out(assemble({ from: need(args[0], 'a package folder'), swarm: need(args[1], 'a swarm'), into: need(flags.into, '--into'), log }))
  else if (op === 'test') { const r = testPackage(need(args[0], 'a folder'), { log, set: flags.set || null }); out(r, r.ok) }
  else if (op === 'contents') out(contentsOf(need(args[0], 'a repository')))
  else { writeSync(2, readFileSync(new URL(import.meta.url).pathname, 'utf8').split('\n').slice(1, 8).map(l => l.replace(/^\/\/ ?/, '')).join('\n') + '\n'); process.exit(2) }
} catch (err) {
  writeSync(2, `pkgm ${op}: ${err.message}\n`)
  process.exit(1)
}
