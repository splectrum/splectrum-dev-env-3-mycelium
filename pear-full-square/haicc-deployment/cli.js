#!/usr/bin/env bare
// A project's deployment from the command line. One JSON line out.
//   node cli.js deploy|start|stop|teardown|reconcile|status <project.json> [--work=<folder>]
// The work folder defaults to manager/<owner>, in the current folder. Exit 0 when the verb's
// state is reached; 1 otherwise (the result says what is missing, and
// hints what only a human can do); 2 on a bad call.
import { join } from 'bare-path'
import { readFileSync } from 'bare-fs'
import { openDeployment } from './index.js'
import process from 'bare-process'

const argv = process.argv.slice(2)
const flags = Object.fromEntries(argv.filter(a => a.startsWith('--')).map(a => { const [k, v] = a.slice(2).split('='); return [k, v] }))
const [verb, file] = argv.filter(a => !a.startsWith('--'))
const verbs = ['deploy', 'start', 'stop', 'teardown', 'reconcile', 'status']
if (!verbs.includes(verb) || !file) {
  console.log(JSON.stringify({ error: `usage: haicc-deployment ${verbs.join('|')} <project.json> [--work=<folder>]` }))
  process.exit(2)
}
try {
  const owner = JSON.parse(readFileSync(file, 'utf8')).owner
  const d = await openDeployment({ project: file, work: flags.work || join('manager', owner) })
  const result = await d[verb]()
  const met = xs => (xs || []).every(x => x.status === 'met' || x.status === 'extra')
  // status of a project never deployed: say what deploying would need.
  if (verb === 'status' && !result.desired.deployed) result.check = await d.check()
  const ok = verb === 'status' ? met(result.check)
    : result.after ? result.failed.length === 0 && result.blocked.length === 0 && met(result.after)
      : [result.stopped, result.removed].every(x => !x || x.failed.length === 0)
  console.log(JSON.stringify({ verb, project: d.project.owner, work: d.work, ok, result }))
  process.exit(ok ? 0 : 1)
} catch (err) {
  console.log(JSON.stringify({ verb, error: err.message }))
  process.exit(2)
}
