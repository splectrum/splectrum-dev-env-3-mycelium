// parseSource(s): a source, 'folder:<path>' or 'github:<org>', parsed (README.md beside it).
export function parseSource (s) {
  const i = s.indexOf(':')
  const kind = i < 0 ? s : s.slice(0, i)
  const at = i < 0 ? '' : s.slice(i + 1)
  if (kind === 'folder') return { kind, path: at }
  if (kind === 'github') return { kind, org: at || 'haiccing' }
  throw new Error(`not a source: ${s} (folder:<path>, github:<org>)`)
}
