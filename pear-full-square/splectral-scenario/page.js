// The page of a scenario: its steps, the step running, its messages; a
// button to run it. Generic: any scenario, any world.
const { useState, useEffect } = window.React

export default function Scenario ({ state, param, act, html }) {
  const [sc, setSc] = useState(null)
  const [error, setError] = useState(null)
  useEffect(() => { fetch(`/scenario/${param}`).then(r => r.json()).then(setSc) }, [param])
  if (!sc) return html`<p class="muted">Loading…</p>`
  // The latest run only: a scenario runs again any number of times. A run
  // begins with its first message (`start`; older records: the step -1
  // message naming the scenario).
  const all = state.activity.filter(e => e.scenario === param)
  const isStart = e => e.kind === 'say' && (e.start || (e.step === -1 && String(e.text).startsWith('Scenario:')))
  let from = -1
  all.forEach((e, i) => { if (isStart(e)) from = i })
  const mine = from < 0 ? [] : all.slice(from)
  const done = new Set(mine.filter(e => e.kind === 'scenarioStep').map(e => e.step))
  const says = mine.filter(e => e.kind === 'say')
  // The outcome is the world's, not this page's: it survives leaving the
  // page and coming back, and shows in a replay.
  const runs = all.filter(isStart).length
  const finished = mine.some(e => e.kind === 'say' && e.step === sc.steps.length)
  const running = mine.length > 0 && !finished
  const failed = mine.find(e => e.kind === 'say' && e.failed)
  const outcome = error ? { ok: false, error } : failed ? { ok: false, error: failed.text } : finished ? { ok: true } : null
  const run = async () => { setError(null); const r = await act({ action: 'run-scenario', with: { id: param } }); if (!r.ok) setError(r.error) }
  return html`
    <section data-scenario=${param}>
      <h2>${sc.title}</h2>
      ${sc.description ? html`<p class="muted">${sc.description}</p>` : null}
      <button data-run onClick=${run} disabled=${running}>${running ? 'Running…' : runs ? 'Run again' : 'Run'}</button>${runs > 1 ? html` <span class="muted" data-runs=${runs}>run ${runs}</span>` : null}
      ${outcome ? html`<span data-outcome=${outcome.ok ? 'ok' : 'failed'}> ${outcome.ok ? 'Done.' : outcome.error}</span>` : null}
      <ol>${sc.steps.map((s, i) => html`<li data-step=${i} data-done=${done.has(i) ? 'yes' : 'no'} style=${{ opacity: done.has(i) ? 1 : 0.6 }}>${s.say || s.do || s.await}</li>`)}</ol>
      <h3>Messages</h3>
      <div data-says>${says.map(e => html`<p data-say>${e.text}</p>`)}</div>
    </section>`
}
