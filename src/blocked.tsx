import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ArrowLeft, Check, Coffee, LockKeyhole } from 'lucide-react'
import { recoverState } from './extensionApi'
import { defaultState, loadExtensionState, subscribeToExtensionState } from './storage'
import type { ExtensionState } from './types'
import './focus.css'

function formatClock(milliseconds: number) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainder = seconds % 60
  return [hours, minutes, remainder].map((value) => String(value).padStart(2, '0')).join(':')
}

function BlockedPage() {
  const [state, setState] = useState<ExtensionState>(() => structuredClone(defaultState))
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(Date.now())
  const params = new URLSearchParams(location.search)
  const site = params.get('site') || 'This website'

  useEffect(() => {
    let mounted = true
    void recoverState().catch(() => loadExtensionState()).then((next) => {
      if (mounted) {
        setState(next)
        setLoading(false)
      }
    })
    const unsubscribe = subscribeToExtensionState(setState)
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => {
      mounted = false
      unsubscribe()
      window.clearInterval(timer)
    }
  }, [])

  const session = state.activeSession
  const active = Boolean(session && session.endsAt > now)
  const activeBreak = active ? state.activeBreak : null

  return (
    <main className="blocked-page">
      <header className="blocked-brand"><span className="brand-mark">F</span><span>Focus</span></header>
      {loading ? (
        <section className="blocked-panel"><p className="eyebrow">Checking session</p><h1>One moment.</h1></section>
      ) : active && session ? (
        <section className="blocked-panel">
          <span className={`blocked-lock ${activeBreak ? 'break-lock' : ''}`}>{activeBreak ? <Coffee size={30}/> : <LockKeyhole size={30}/>}</span>
          <p className="eyebrow">{activeBreak ? 'Your designed break is active' : 'You’re in focus mode'}</p>
          <h1>{activeBreak ? 'Rest without scrolling.' : 'Stay with the work.'}</h1>
          <p className="blocked-copy"><strong>{site}</strong> stays blocked {activeBreak ? 'throughout the break' : 'until your focus session ends'}.</p>
          <div className="blocked-timer" aria-label={`${formatClock((activeBreak?.endsAt ?? session.endsAt) - now)} remaining`}>
            {formatClock((activeBreak?.endsAt ?? session.endsAt) - now)}
          </div>
          <p className="blocked-remaining">{activeBreak ? 'until focus resumes' : 'remaining'}</p>
          <div className="blocked-ledger"><span>Current session</span><strong>{session.sessionName}</strong></div>
          <button className="return-button" onClick={() => history.back()}><ArrowLeft size={17}/> Return to focused work</button>
        </section>
      ) : (
        <section className="blocked-panel ended-panel">
          <span className="blocked-lock"><Check size={30}/></span>
          <p className="eyebrow">Session ended</p>
          <h1>This site is available again.</h1>
          <p className="blocked-copy">Your focus session is no longer active, and Focus has removed its blocking rules.</p>
          <button className="return-button" onClick={() => location.reload()}>Continue</button>
        </section>
      )}
      <footer>Chrome can disable or remove Focus. While disabled, sites cannot be blocked, but session time continues to elapse.</footer>
    </main>
  )
}

createRoot(document.getElementById('blocked-root')!).render(<BlockedPage/>)
