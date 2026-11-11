// A documentation package's main (generated: tools/lib/dispatcher.js): no
// entry point, nothing to run; its files are read from its bundle.
export async function run (target = '/run', { dryRun = false } = {}) {
  if (target === '/' && dryRun) return []
  throw new Error(`no such entry: ${target} (a documentation package: nothing to run)`)
}
