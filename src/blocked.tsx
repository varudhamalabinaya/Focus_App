import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ArrowLeft, ArrowRight, Check, LockKeyhole } from 'lucide-react'
import { loadFocusState, persistFocusState } from './storage'
import './focus.css'

function BlockedPage() {
  const [requesting, setRequesting] = useState(false)
  const [sent, setSent] = useState(false)
  const [reason, setReason] = useState('')
  const [duration, setDuration] = useState(15)
  const params = new URLSearchParams(location.search)
  const site = params.get('site') || 'YouTube'
  const [focusState] = useState(loadFocusState)
  const progressPercent = Math.round((focusState.progress.verifiedTasks / focusState.progress.totalTasks) * 100)

  function submit() {
    const state = loadFocusState()
    state.accessRequests.unshift({ id: `ar-${Date.now()}`, site, reason, duration, requestedAt: 'Just now', status: 'pending' })
    persistFocusState(state)
    setSent(true)
  }

  return (
    <main className="blocked-page">
      <header className="blocked-brand"><span className="brand-mark">F</span><span>Focus</span></header>
      <section className="blocked-panel">
        {!requesting && !sent && <>
          <span className="intervention-icon"><LockKeyhole size={31}/></span>
          <p className="eyebrow">Commitment Protection</p>
          <h1>A pause before<br/>you continue.</h1>
          <p>You chose to protect this time for deep work. <strong>{site}</strong> is blocked while your commitment is active.</p>
          <div className="blocked-ledger"><span>{focusState.commitment.name}</span><strong>Day {focusState.commitment.day} <i/> {progressPercent}% complete</strong></div>
          <button className="primary wide" onClick={() => setRequesting(true)}>Request temporary access <ArrowRight size={17}/></button>
          <button className="secondary wide" onClick={() => history.back()}><ArrowLeft size={16}/> Return to focused work</button>
        </>}
        {requesting && !sent && <>
          <p className="eyebrow">A deliberate exception</p>
          <h1>Why do you<br/>need access?</h1>
          <p>Abinaya will see only this reason, the site, and requested duration.</p>
          <label className="blocked-field"><span>Reason</span><textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Be specific about what you need to do."/></label>
          <label className="blocked-field"><span>Duration</span><select value={duration} onChange={(event) => setDuration(Number(event.target.value))}><option value="5">5 minutes</option><option value="10">10 minutes</option><option value="15">15 minutes</option><option value="30">30 minutes</option></select></label>
          <button className="primary wide" disabled={reason.trim().length < 8} onClick={submit}>Send request to Abinaya</button>
          <button className="secondary wide" onClick={() => setRequesting(false)}>Cancel</button>
        </>}
        {sent && <div className="sent-state"><span><Check size={28}/></span><p className="eyebrow">Request sent</p><h1>Wait for Abinaya’s decision.</h1><p>{site} stays blocked until the request is approved. You can return to your work now.</p><button className="primary wide" onClick={() => history.back()}>Return to focused work</button></div>}
      </section>
      <footer>Browser-level prototype protection · Focus cannot prevent extension removal.</footer>
    </main>
  )
}

createRoot(document.getElementById('blocked-root')!).render(<BlockedPage/>)
