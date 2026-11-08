#!/usr/bin/env bare
// haicc-reconcile from the command line. One JSON line out.
//   node cli.js check|plan|apply|remove <declaration.json> [--strict]
// check: each requirement met, missing or different (fixable or not, with a
// hint), and extras; plan: what apply would do; apply: do it, then check;
// remove: take away what this owner made. Exit 0 when everything is met
// (check, apply) or done (plan, remove); 1 otherwise; 2 on a bad call.
import { createEngine } from './index.js'
import { readDeclaration } from './lib/declaration.js'
import { journal } from './lib/journal.js'
import process from 'bare-process'

const [verb, file, ...rest] = process.argv.slice(2)
if (!['check', 'plan', 'apply', 'remove'].includes(verb) || !file) {
  console.log(JSON.stringify({ error: 'usage: haicc-reconcile check|plan|apply|remove <declaration.json> [--strict]' }))
  process.exit(2)
}
try {
  const d = await readDeclaration(file)
  const strict = d.strict || rest.includes('--strict')
  const j = d.record ? journal(d.record) : null
  const e = createEngine({ providers: d.providers, owner: d.owner, record: j ? v => j.append({ verb, ...v }) : null })
  const result = await e[verb](d.requirements, { strict })
  const ok = verb === 'check' ? result.every(x => x.status === 'met' || x.status === 'extra')
    : verb === 'apply' ? result.failed.length === 0 && result.blocked.length === 0 && result.after.every(x => x.status === 'met' || x.status === 'extra')
      : verb === 'remove' ? result.failed.length === 0 : true
  console.log(JSON.stringify({ verb, ok, result }))
  process.exit(ok ? 0 : 1)
} catch (err) {
  console.log(JSON.stringify({ verb, error: err.message }))
  process.exit(2)
}
