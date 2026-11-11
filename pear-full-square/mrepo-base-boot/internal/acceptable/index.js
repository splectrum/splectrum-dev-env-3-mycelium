// acceptable(have, want): an installed Bare's version accepted for the pinned one (README.md beside it).
export function acceptable (have, want) {
  const [a, b] = [have, want].map(v => String(v).replace(/^v/, '').split('.').map(Number))
  if (a.length < 3 || a.some(Number.isNaN) || a[0] !== b[0]) return false
  for (let i = 1; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i]
  return true
}
