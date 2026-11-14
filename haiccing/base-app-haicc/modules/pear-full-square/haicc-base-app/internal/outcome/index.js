// outcome(text): a response record's completed form, its output or its
// error (README.md beside it).
export function outcome (text) {
  let form = null
  try { form = JSON.parse(text)?.value?.value } catch { return null }
  if (!form || typeof form !== 'object' || Array.isArray(form)) return null
  if ('error' in form) return { error: (typeof form.error === 'string' ? form.error : JSON.stringify(form.error)).replace(/\n/g, ' ') }
  if ('output' in form) return { output: form.output }
  return null
}
