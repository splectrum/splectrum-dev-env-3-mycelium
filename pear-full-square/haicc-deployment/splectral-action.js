// A Splectral action, so a Splectral instance started by a project can bring
// that project back to its desired state before a scenario runs again:
//   reconcile-project {}   the project in the server's configuration
//                          (`project: { file, work }`), reconciled
import { openDeployment } from './index.js'

export default async (args, ctx) => {
  const p = ctx.config.project
  if (!p) throw new Error('this Splectral was not started for a project')
  const d = await openDeployment({ project: p.file, work: p.work })
  // Everything but this server itself: it is the one running the scenario.
  const r = await d.reconcile({ exceptKinds: ['splectral-server'] })
  const failed = [...(r.failed || []), ...(r.blocked || [])]
  if (failed.length) throw new Error(`not reconciled: ${failed.map(f => f.name).join(', ')}`)
  return { done: (r.done || []).map(x => `${x.name}:${x.action}`) }
}
