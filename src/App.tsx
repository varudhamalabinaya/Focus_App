import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  Check,
  Clock3,
  Coffee,
  LockKeyhole,
  Plus,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react'
import { displayDomain, normalizeDomain } from './domains'
import { useFocus } from './state'
import type { FocusSettings } from './types'

const durationOptions = [25, 45, 60, 90]
const breakOptions: Array<number | null> = [null, 15, 25, 45, 60]
const suggestions = ['youtube.com', 'instagram.com', 'reddit.com']

function formatClock(milliseconds: number) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainder = seconds % 60
  return [hours, minutes, remainder].map((value) => String(value).padStart(2, '0')).join(':')
}

function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder ? `${hours} hr ${remainder} min` : `${hours} hr`
}

function Brand() {
  return (
    <header className="brand-row">
      <div className="brand"><span className="brand-mark">F</span><span>Focus</span></div>
      <span className="local-label">Local session</span>
    </header>
  )
}

function AccountabilityCard() {
  return (
    <aside className="accountability-card">
      <span className="accountability-icon"><Sparkles size={16}/></span>
      <div>
        <strong>Accountability</strong>
        <p>Coming soon — available in the app.</p>
      </div>
      <span className="soon-label">Soon</span>
    </aside>
  )
}

function SetupView() {
  const { state, error, start } = useFocus()
  const [settings, setSettings] = useState<FocusSettings>(() => structuredClone(state.settings))
  const [domainInput, setDomainInput] = useState('')
  const [domainError, setDomainError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [customDuration, setCustomDuration] = useState(
    durationOptions.includes(state.settings.durationMinutes) ? '' : String(state.settings.durationMinutes),
  )

  function updateSettings(patch: Partial<FocusSettings>) {
    setSettings((current) => ({ ...current, ...patch }))
  }

  function addDomain(rawValue: string) {
    setDomainError('')
    const domain = normalizeDomain(rawValue)
    if (!domain) {
      setDomainError('Enter a valid domain, such as youtube.com.')
      return
    }
    if (settings.blockedDomains.includes(domain)) {
      setDomainError(`${domain} is already on the list.`)
      return
    }
    updateSettings({ blockedDomains: [...settings.blockedDomains, domain] })
    setDomainInput('')
  }

  function removeDomain(domain: string) {
    updateSettings({ blockedDomains: settings.blockedDomains.filter((item) => item !== domain) })
    setDomainError('')
  }

  const validationMessage = useMemo(() => {
    if (settings.sessionName.trim().length < 2) return 'Add a session name.'
    if (settings.durationMinutes < 1 || settings.durationMinutes > 480) return 'Choose a duration between 1 and 480 minutes.'
    if (!settings.blockedDomains.length) return 'Add at least one website to block.'
    if (settings.blockedDomains.length > 50) return 'Focus supports up to 50 blocked websites.'
    return ''
  }, [settings])

  async function submit() {
    if (validationMessage) return
    setSubmitting(true)
    await start({ ...settings, sessionName: settings.sessionName.trim() })
    setSubmitting(false)
  }

  return (
    <main className="popup-shell setup-view">
      <Brand/>
      <section className="intro">
        <p className="eyebrow">Set focus</p>
        <h1>Protect one clear block of time.</h1>
        <p>Choose what matters now. Focus will hold your selected websites until the session expires.</p>
      </section>

      <section className="form-section">
        <label className="field-label" htmlFor="session-name">Session name</label>
        <input
          id="session-name"
          className="text-input"
          maxLength={80}
          value={settings.sessionName}
          onChange={(event) => updateSettings({ sessionName: event.target.value })}
        />
      </section>

      <section className="form-section">
        <div className="section-label-row">
          <span className="field-label">Duration</span>
          <span>{formatMinutes(settings.durationMinutes)}</span>
        </div>
        <div className="choice-grid duration-grid" role="group" aria-label="Session duration">
          {durationOptions.map((minutes) => (
            <button
              key={minutes}
              className={settings.durationMinutes === minutes && !customDuration ? 'selected' : ''}
              onClick={() => { setCustomDuration(''); updateSettings({ durationMinutes: minutes }) }}
            >
              {minutes}
              <small>min</small>
            </button>
          ))}
        </div>
        <label className="custom-duration">
          <span>Custom</span>
          <input
            type="number"
            min={1}
            max={480}
            inputMode="numeric"
            placeholder="Minutes"
            value={customDuration}
            onChange={(event) => {
              setCustomDuration(event.target.value)
              updateSettings({ durationMinutes: Number(event.target.value) })
            }}
          />
        </label>
      </section>

      <section className="form-section">
        <span className="field-label">Break reminder</span>
        <div className="choice-grid break-grid" role="group" aria-label="Break reminder interval">
          {breakOptions.map((minutes) => (
            <button
              key={minutes ?? 'off'}
              className={settings.breakIntervalMinutes === minutes ? 'selected' : ''}
              onClick={() => updateSettings({ breakIntervalMinutes: minutes })}
            >
              {minutes ?? 'Off'}{minutes && <small>min</small>}
            </button>
          ))}
        </div>
      </section>

      <section className="form-section websites-section">
        <div className="section-label-row">
          <span className="field-label">Blocked websites</span>
          <span>{settings.blockedDomains.length} selected</span>
        </div>
        <form
          className="domain-entry"
          onSubmit={(event) => { event.preventDefault(); addDomain(domainInput) }}
        >
          <input
            aria-describedby={domainError ? 'domain-error' : undefined}
            aria-invalid={Boolean(domainError)}
            placeholder="youtube.com or a full URL"
            value={domainInput}
            onChange={(event) => { setDomainInput(event.target.value); setDomainError('') }}
          />
          <button type="submit" aria-label="Add website"><Plus size={18}/></button>
        </form>
        {domainError && <p id="domain-error" className="field-error" role="alert">{domainError}</p>}
        <div className="domain-list" aria-label="Websites that will be blocked">
          {settings.blockedDomains.map((domain) => (
            <div className="domain-row" key={domain}>
              <span className="site-letter">{domain.charAt(0).toUpperCase()}</span>
              <span>{displayDomain(domain)}</span>
              <button onClick={() => removeDomain(domain)} aria-label={`Remove ${domain}`}><X size={16}/></button>
            </div>
          ))}
        </div>
        <div className="suggestions">
          <span>Quick add</span>
          {suggestions.filter((domain) => !settings.blockedDomains.includes(domain)).map((domain) => (
            <button key={domain} onClick={() => addDomain(domain)}>+ {domain.split('.')[0]}</button>
          ))}
          {suggestions.every((domain) => settings.blockedDomains.includes(domain)) && <small>All suggestions added</small>}
        </div>
      </section>

      <p className="incognito-note">To focus in private windows, enable “Allow in Incognito” for Focus in Chrome’s extension settings.</p>
      <section className="start-bar">
        <p><LockKeyhole size={14}/><span><strong>Locks when started.</strong> Settings stay fixed until time expires.</span></p>
        {(error || validationMessage) && <span className="start-error" role="alert">{error || validationMessage}</span>}
        <button className="primary-button" disabled={Boolean(validationMessage) || submitting} onClick={submit}>
          {submitting ? 'Starting…' : 'Start focus session'} <ArrowRight size={18}/>
        </button>
      </section>
    </main>
  )
}

function ActiveView() {
  const { state, takeBreak, error } = useFocus()
  const session = state.activeSession!
  const activeBreak = state.activeBreak
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const remaining = (activeBreak?.endsAt ?? session.endsAt) - now
  const breakMessage = state.breakReminderDue
    ? 'Pause focus for exactly five minutes. Your focus deadline will move once; every site stays blocked.'
    : activeBreak
      ? `Focus resumes automatically in ${formatClock(activeBreak.endsAt - now)}. Protected sites remain locked.`
    : !session.breakIntervalMinutes
      ? 'Break reminder off'
      : state.nextBreakAt
        ? `Next break in ${formatClock(state.nextBreakAt - now)}`
        : 'No more break reminders this session'

  return (
    <main className="popup-shell active-view">
      <Brand/>
      <section className={`timer-panel ${activeBreak ? 'on-break' : ''}`}>
        <p className="mode-label"><span/> {activeBreak ? 'Designed break' : 'Focus mode'}</p>
        <div className="timer" aria-label={`${formatClock(remaining)} remaining`}>{formatClock(remaining)}</div>
        <p className="remaining-label">{activeBreak ? 'until focus resumes' : 'remaining'}</p>
        <h1>{session.sessionName}</h1>
        <div className="protected-line"><ShieldCheck size={18}/><strong>{activeBreak ? 'Blocking stays protected' : 'Focus is protected'}</strong></div>
      </section>

      <section className={`break-status ${state.breakReminderDue ? 'due' : ''} ${activeBreak ? 'active-break' : ''}`}>
        {activeBreak ? <Coffee size={19}/> : <Clock3 size={19}/>}
        <div><strong>{activeBreak ? 'Five-minute break in progress' : state.breakReminderDue ? 'Break available' : 'Your pace'}</strong><p>{breakMessage}</p></div>
        {state.breakReminderDue && <button onClick={takeBreak}>Start 5-minute break</button>}
      </section>
      {error && <p className="form-error" role="alert">{error}</p>}

      <section className="active-sites">
        <div className="section-label-row">
          <span className="field-label">Protected websites</span>
          <span>{session.blockedDomains.length} blocked</span>
        </div>
        <div className="locked-domain-list">
          {session.blockedDomains.map((domain) => (
            <span key={domain}><LockKeyhole size={13}/>{displayDomain(domain)}</span>
          ))}
        </div>
      </section>

      <AccountabilityCard/>
      <aside className="truth-note">
        <ShieldCheck size={17}/>
        <p>Focus has no pause, stop, or editing controls during a session. Chrome still allows disabling or removal; while disabled, blocking cannot work, but elapsed wall time still counts and never becomes extra focus time.</p>
      </aside>
      <p className="incognito-note">Incognito blocking works only after you enable “Allow in Incognito” in Chrome. Focus cannot enable that permission for you.</p>
    </main>
  )
}

function CompletionView() {
  const { state, beginAgain, error } = useFocus()
  const completed = state.completedSession!
  return (
    <main className="popup-shell completion-view">
      <Brand/>
      <section className="completion-panel">
        <span className="completion-mark"><Check size={25}/></span>
        <p className="eyebrow">Session complete</p>
        <h1>Your time is yours again.</h1>
        <p>The blocking rules have been removed automatically.</p>
        <dl>
          <div><dt>Session</dt><dd>{completed.sessionName}</dd></div>
          <div><dt>Focused for</dt><dd>{formatMinutes(completed.durationMinutes)}</dd></div>
        </dl>
      </section>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary-button" onClick={beginAgain}>Set another focus <ArrowRight size={18}/></button>
    </main>
  )
}

export default function App() {
  const { state, loading } = useFocus()
  if (loading) {
    return (
      <main className="popup-shell loading-view">
        <div className="brand"><span className="brand-mark">F</span><span>Focus</span></div>
        <p>Restoring your focus session…</p>
      </main>
    )
  }
  if (state.activeSession) return <ActiveView/>
  if (state.completedSession) return <CompletionView/>
  return <SetupView/>
}
