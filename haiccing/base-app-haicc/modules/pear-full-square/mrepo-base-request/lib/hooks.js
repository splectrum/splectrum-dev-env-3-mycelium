// Hooks: the commands an mrepo runs on a status transition, as files its
// defining package dropped into its runtime layer, one folder a transition:
//   /runtime/hooks/<transition>/<name>.json     a command, its parts:
//                                               ["help/extract"]
// No config is written or merged: a file there is a hook, in name order.
//   boot                                 fired by the runtime as it starts
//   initialise, start, stop, shutdown    fired by the service, each as it
//                                        makes that transition
//   hooks(reader, transition) -> [{ name, command }]     reader: what reads
//       the mrepo ({ select, read }: the repository, or an execution)
export const TRANSITIONS = ['boot', 'initialise', 'start', 'stop', 'shutdown']
export const hooksAt = transition => `/runtime/hooks/${transition}`

export async function hooks (reader, transition) {
  if (!TRANSITIONS.includes(transition)) throw new Error(`not a transition: ${transition} (${TRANSITIONS.join(', ')})`)
  const found = await Promise.resolve().then(() => reader.select(`${hooksAt(transition)}/*`)).catch(() => [])
  const out = []
  for (const [path] of found) {
    const name = path.slice(path.lastIndexOf('/') + 1)
    if (!name.endsWith('.json')) continue
    const command = JSON.parse((await reader.read(path)).toString())
    if (!Array.isArray(command) || !command.length || command.some(p => typeof p !== 'string' || !p)) throw new Error(`not a hook: ${path} (a command, its parts)`)
    out.push({ name: name.slice(0, -5), command })
  }
  return out.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
}
