// A verb's result, read by a person: what was done, what is missing, what
// only a human can do (with the hints), and the URLs.
export function humanText (r) {
  const out = []
  if (r.error) out.push(`${r.verb}: ${r.error}`)
  else {
    const x = r.result || {}
    const checked = x.after || x.check || []
    // The machine's needs (the kinds only checked) said at the top: all met
    // is worth saying; and a project not deployed yet is not a failure.
    const MACHINE = ['os', 'docker', 'nodejs', 'bare', 'subnet', 'udp', 'port']
    const machine = checked.filter(c => MACHINE.includes(c.kind))
    const notDeployed = r.verb === 'status' && x.desired && !x.desired.deployed
    out.push(notDeployed ? `${r.verb} ${r.project}: not deployed yet (start deploys it)  (work: ${r.work})` : `${r.verb} ${r.project}: ${r.ok ? 'done' : 'NOT done'}  (work: ${r.work})`)
    if (machine.length) {
      const met = machine.filter(c => c.status === 'met').length
      out.push(met === machine.length ? `  machine: all ${met} met` : `  machine: ${met} of ${machine.length} met`)
    }
    for (const d of x.done || []) out.push(`  ${d.action.padEnd(7)} ${d.name}${d.result?.url ? `  ${d.result.url}` : ''}`)
    for (const s of [x.stopped, x.removed]) for (const n of s?.done || []) out.push(`  removed ${n}`)
    for (const f of x.failed || []) out.push(`  FAILED  ${f.name}: ${f.error || f.status}${f.hint ? `\n          ${f.hint}` : ''}`)
    for (const b of x.blocked || []) out.push(`  blocked ${b.name} (needs ${b.needs.join(', ')})`)
    const told = new Set([...(x.failed || []), ...(x.blocked || [])].map(f => f.name))
    for (const c of checked.filter(c => !told.has(c.name))) {
      if (c.status === 'met') { if (c.detail?.url) out.push(`  running ${c.name}  ${c.detail.url}`); continue }
      if (notDeployed && c.status === 'missing' && c.fixable) { out.push(`  to make ${c.name}`); continue }
      if (c.status === 'extra') { out.push(`  extra   ${c.name} (left as it is)`); continue }
      out.push(`  ${c.status.padEnd(7)} ${c.name}${c.hint ? `\n          ${c.hint}` : ''}`)
    }
    if (x.desired) out.push(`  desired: ${x.desired.running ? 'running' : x.desired.deployed ? 'deployed, not running' : 'nothing'}`)
  }
  return out.join('\n')
}
