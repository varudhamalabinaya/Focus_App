import { useMemo, useState } from 'react'
import { Bell, CheckCircle2, ChevronLeft, ChevronRight, Info, LockKeyhole, Plus, ShieldCheck, Trash2, UserRoundCheck, X } from 'lucide-react'
import {
  EmptyState, EvidenceReviewCard, FocusHeader, Navigation, PartnerStatus,
  ProgressSummary, SectionHeading, StatusPill, TaskItem,
} from './components'
import { extensionMode } from './extensionApi'
import { useFocus } from './state'
import type { Commitment, Goal, Task } from './types'

function cloneCommitment(commitment: Commitment) {
  return structuredClone(commitment)
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${date}T12:00:00`))
}

function CommitmentDetails({ commitment, goal, onCommitment, onGoal }: { commitment: Commitment; goal: Goal; onCommitment: (draft: Commitment) => void; onGoal: (goal: Goal) => void }) {
  return (
    <div className="editor-fields">
      <label className="editor-field"><span>Commitment name</span><input value={commitment.name} onChange={(event) => onCommitment({ ...commitment, name: event.target.value })}/></label>
      <label className="editor-field"><span>Goal name</span><input value={goal.name} onChange={(event) => onGoal({ ...goal, name: event.target.value })}/></label>
      <label className="editor-field"><span>Why this goal matters</span><textarea value={goal.why} onChange={(event) => onGoal({ ...goal, why: event.target.value })}/></label>
      <div className="editor-grid">
        <label className="editor-field"><span>Duration</span><select value={commitment.duration} onChange={(event) => onCommitment({ ...commitment, duration: Number(event.target.value) })}><option value="7">7 days</option><option value="14">14 days</option><option value="21">21 days</option><option value="30">30 days</option></select></label>
        <label className="editor-field"><span>Start date</span><input type="date" value={commitment.startDate} onChange={(event) => onCommitment({ ...commitment, startDate: event.target.value })}/></label>
      </div>
    </div>
  )
}

function CommitmentTasks({ draft, goalId, onChange }: { draft: Commitment; goalId: string; onChange: (draft: Commitment) => void }) {
  const goalTasks = draft.tasks.filter((task) => task.goalId === goalId)
  function updateTask(id: string, update: Partial<Task>) {
    onChange({ ...draft, tasks: draft.tasks.map((task) => task.id === id ? { ...task, ...update } : task) })
  }
  function addTask() {
    onChange({ ...draft, tasks: [...draft.tasks, { id: `task-${Date.now()}`, goalId, title: '', schedule: 'Daily · anytime', recurring: true, evidenceRequired: true, status: 'open', attempt: 1 }] })
  }
  return (
    <div className="task-editor">
      {goalTasks.map((task, index) => (
        <fieldset className="task-edit-card" key={task.id}>
          <legend>Task {index + 1}</legend>
          <button className="remove-task" aria-label={`Remove task ${index + 1}`} disabled={goalTasks.length === 1} onClick={() => onChange({ ...draft, tasks: draft.tasks.filter((item) => item.id !== task.id) })}><X size={15}/></button>
          <label className="editor-field"><span>Task</span><input value={task.title} onChange={(event) => updateTask(task.id, { title: event.target.value })} placeholder="What will you complete?"/></label>
          <label className="editor-field"><span>Simple schedule</span><input value={task.schedule} onChange={(event) => updateTask(task.id, { schedule: event.target.value })} placeholder="Daily · before 1 PM"/></label>
          <div className="choice-row">
            <label><input type="checkbox" checked={task.recurring} onChange={(event) => updateTask(task.id, { recurring: event.target.checked })}/><span>{task.recurring ? 'Recurring task' : 'One-time task'}</span></label>
            <label><input type="checkbox" checked={task.evidenceRequired} onChange={(event) => updateTask(task.id, { evidenceRequired: event.target.checked })}/><span>Evidence required</span></label>
          </div>
        </fieldset>
      ))}
      <button className="add-task-button" onClick={addTask}><Plus size={16}/> Add another task</button>
    </div>
  )
}

function OnboardingPage() {
  const { state, saveCommitment, saveGoal } = useFocus()
  const [step, setStep] = useState(0)
  const [intent, setIntent] = useState(0)
  const [draft, setDraft] = useState(() => cloneCommitment(state.commitment))
  const [goal, setGoal] = useState<Goal>(() => structuredClone(state.goals.find((item) => item.id === state.activeGoalId) ?? state.goals[0]))
  const goalTasks = draft.tasks.filter((task) => task.goalId === goal.id)
  const stepLabels = ['Intent', 'Details', 'Tasks', 'Review']
  const detailsValid = draft.name.trim().length > 3 && goal.name.trim().length > 2 && goal.why.trim().length > 8 && Boolean(draft.startDate)
  const tasksValid = goalTasks.length > 0 && goalTasks.every((task) => task.title.trim() && task.schedule.trim())
  function startCommitment() {
    saveGoal(goal)
    saveCommitment(draft, true)
  }
  return (
    <main className="onboarding">
      <div className="onboarding-mark">Focus <span>{String(step + 1).padStart(2, '0')} / 04 · {stepLabels[step]}</span></div>
      {step === 0 ? <>
        <p className="eyebrow">Start with intention</p>
        <h1>What deserves your<br/>undivided attention?</h1>
        <p>A commitment makes the work visible and gives someone you trust enough context to help.</p>
        <div className="intent-list">
          {['Build a new habit', 'Reduce distractions', 'Spend more time with loved ones', 'Work toward a personal goal'].map((label, index) => <button key={label} className={intent === index ? 'selected' : ''} onClick={() => setIntent(index)}><span>0{index + 1}</span>{label}<ChevronRight size={17}/></button>)}
        </div>
        <button className="primary wide" onClick={() => setStep(1)}>Continue</button>
      </> : step === 1 ? <>
        <p className="eyebrow">Shape the commitment</p>
        <h1>Make the goal<br/>specific.</h1>
        <p>Define the period and the reason you want to return to when motivation shifts.</p>
        <CommitmentDetails commitment={draft} goal={goal} onCommitment={setDraft} onGoal={setGoal}/>
        <div className="editor-actions"><button className="secondary" onClick={() => setStep(0)}><ChevronLeft size={16}/> Back</button><button className="primary" disabled={!detailsValid} onClick={() => setStep(2)}>Set tasks <ChevronRight size={16}/></button></div>
      </> : step === 2 ? <>
        <p className="eyebrow">Define the practice</p>
        <h1>What work will<br/>count each day?</h1>
        <p>Add one-time or recurring tasks, simple schedules, and the evidence Abinaya should expect.</p>
        <CommitmentTasks draft={draft} goalId={goal.id} onChange={setDraft}/>
        <div className="editor-actions"><button className="secondary" onClick={() => setStep(1)}><ChevronLeft size={16}/> Details</button><button className="primary" disabled={!tasksValid} onClick={() => setStep(3)}>Review <ChevronRight size={16}/></button></div>
      </> : <>
        <p className="eyebrow">Review deliberately</p>
        <h1>Your commitment,<br/>written clearly.</h1>
        <div className="onboarding-review">
          <span>{draft.duration} days · Starts {formatDate(draft.startDate)}</span>
          <h2>{draft.name}</h2>
          <h3 className="review-goal-name">Goal · {goal.name}</h3>
          <p>{goal.why}</p>
          <dl><div><dt>Partner</dt><dd>{state.partner.name}</dd></div><div><dt>Protection</dt><dd>{draft.blockedSites.filter((site) => site.enabled).map((site) => site.site).join(', ')}</dd></div><div><dt>Tasks</dt><dd>{goalTasks.length} · {goalTasks.filter((task) => task.evidenceRequired).length} need evidence</dd></div></dl>
          <ol className="review-task-list">{goalTasks.map((task) => <li key={task.id}><strong>{task.title}</strong><span>{task.schedule} · {task.recurring ? 'Recurring' : 'One-time'} · {task.evidenceRequired ? 'Evidence' : 'No evidence'}</span></li>)}</ol>
        </div>
        <button className="primary wide" onClick={startCommitment}>Start commitment</button>
        <button className="secondary wide" onClick={() => setStep(1)}>Edit commitment details</button>
        <button className="text-button centered" onClick={() => setStep(0)}>Change intention</button>
      </>}
    </main>
  )
}

function HomePage() {
  const { state, setPage, completeTask, submitEvidence } = useFocus()
  const activeGoal = state.goals.find((goal) => goal.id === state.activeGoalId) ?? state.goals[0]
  const activeTasks = state.commitment.tasks.filter((task) => task.goalId === activeGoal.id)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = state.commitment.tasks.find((task) => task.id === selectedId) ?? null
  const [note, setNote] = useState('')
  const [fileName, setFileName] = useState('')
  const rejection = selected
    ? state.evidence.find((item) => item.taskId === selected.id && item.status === 'rejected' && item.attempt === selected.attempt - (selected.attempt < 5 ? 1 : 0))
      ?? state.evidence.find((item) => item.taskId === selected.id && item.status === 'rejected')
    : undefined

  function sendEvidence() {
    if (!selected || !fileName) return
    submitEvidence(selected.id, note || 'Completed as scheduled.', fileName)
    setSelectedId(null)
    setNote('')
    setFileName('')
  }

  return (
    <main>
      <ProgressSummary
        name={state.commitment.name}
        day={state.commitment.day}
        duration={state.commitment.duration}
        taskCount={activeTasks.length}
        verifiedTasks={state.progress.verifiedTasks}
        totalTasks={state.progress.totalTasks}
        streak={state.progress.verifiedStreak}
        partnerName={state.partner.name}
      />
      <section className="content-section">
        <SectionHeading eyebrow={`${activeGoal.name} · Wednesday, Aug 26`} title="Today’s record" action={<button className="text-button" onClick={() => setPage('progress')}>History <ChevronRight size={15}/></button>}/>
        <div className="task-list">
          {activeTasks.map((task) => <TaskItem key={task.id} task={task} onSelect={(item) => setSelectedId(item.id)}/>)}
        </div>
      </section>
      <section className="content-section compact">
        <PartnerStatus name={state.partner.name}/>
      </section>
      {selected && (
        <div className="modal-backdrop" onMouseDown={() => setSelectedId(null)}>
          <section className="sheet" onMouseDown={(event) => event.stopPropagation()}>
            <div className="sheet-handle"/>
            {selected.status === 'open' ? <>
              <p className="eyebrow">Task ready</p><h2>{selected.title}</h2>
              <p className="muted">{selected.evidenceRequired ? 'Complete the work first. You will add evidence in the next step.' : 'This task does not require evidence and will be verified immediately.'}</p>
              <button className="primary wide" onClick={() => { completeTask(selected.id); setSelectedId(null) }}><CheckCircle2 size={17}/> Complete</button>
            </> : selected.status === 'completed' || selected.status === 'rejected' ? <>
              <p className="eyebrow">{selected.status === 'rejected' ? 'Evidence returned' : 'Work completed'}</p>
              <h2>{selected.status === 'rejected' ? 'Resubmit your evidence' : 'Submit evidence'}</h2>
              <p className="muted">Evidence helps {state.partner.name} make a fair decision. It is context, not proof.</p>
              {selected.status === 'rejected' && <div className="notice rejected"><Info size={16}/><span><strong>{selected.attempt >= 5 ? 'Final attempt used' : `Attempt ${selected.attempt} of 5`}</strong>{rejection?.rejectionReason ?? 'Review the partner feedback before resubmitting.'}</span></div>}
              {selected.status === 'rejected' && selected.attempt >= 5 ? <div className="final-attempt">No further resubmissions are available. Discuss this task with {state.partner.name}.</div> : <>
                <label className="upload-zone">
                  <input type="file" accept="image/*" onChange={(event) => setFileName(event.target.files?.[0]?.name || '')}/>
                  <span className="upload-icon"><Plus size={20}/></span>
                  <strong>{fileName || 'Add a mock photo'}</strong>
                  <small>{fileName ? 'Ready to submit' : 'JPG or PNG · stored locally for this demo'}</small>
                </label>
                <label className="field"><span>Note <small>optional</small></span><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder={`What should ${state.partner.name} know?`}/></label>
                <button className="primary wide" disabled={!fileName} onClick={sendEvidence}>Submit for verification</button>
              </>}
            </> : <>
              <p className="eyebrow">Task status</p><h2>{selected.status === 'waiting' ? `Waiting for ${state.partner.name}` : 'Verified'}</h2>
              <p className="muted">{selected.status === 'waiting' ? 'Your evidence is pending review. You cannot submit another item until a decision is made.' : 'This task is recorded as verified progress.'}</p>
            </>}
            <button className="secondary wide" onClick={() => setSelectedId(null)}>Close</button>
          </section>
        </div>
      )}
    </main>
  )
}

function GoalsPage() {
  const { state, setActiveGoal, saveGoal, addGoal, saveCommitment } = useFocus()
  const activeGoal = state.goals.find((goal) => goal.id === state.activeGoalId) ?? state.goals[0]
  const activeTasks = state.commitment.tasks.filter((task) => task.goalId === activeGoal.id)
  const [editing, setEditing] = useState(false)
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState(() => cloneCommitment(state.commitment))
  const [draftGoal, setDraftGoal] = useState<Goal>(() => structuredClone(activeGoal))
  const draftGoalTasks = draft.tasks.filter((task) => task.goalId === draftGoal.id)
  const draftValid = Boolean(draft.name.trim() && draftGoal.name.trim() && draftGoal.why.trim() && draftGoalTasks.length && draftGoalTasks.every((task) => task.title.trim() && task.schedule.trim()))
  function openEditor(goal = activeGoal, isNew = false) {
    const nextCommitment = cloneCommitment(state.commitment)
    if (isNew) {
      nextCommitment.goalIds = [...nextCommitment.goalIds, goal.id]
      nextCommitment.tasks.push({ id: `task-${Date.now()}`, goalId: goal.id, title: '', schedule: 'Daily · anytime', recurring: true, evidenceRequired: true, status: 'open', attempt: 1 })
    }
    setDraft(nextCommitment)
    setDraftGoal(structuredClone(goal))
    setCreating(isNew)
    setEditing(true)
  }
  function saveEdits() {
    const goalTasks = draft.tasks.filter((task) => task.goalId === draftGoal.id)
    if (!draft.name.trim() || !draftGoal.name.trim() || !draftGoal.why.trim() || !goalTasks.length || goalTasks.some((task) => !task.title.trim() || !task.schedule.trim())) return
    if (creating) addGoal(draftGoal)
    else saveGoal(draftGoal)
    saveCommitment(draft)
    setEditing(false)
  }
  return (
    <main>
      <header className="page-intro"><p className="eyebrow">Your direction</p><h1>Goals & commitment</h1><p>The work you chose, written clearly enough to return to.</p></header>
      <section className="goal-switcher" aria-label="Goals">
        {state.goals.map((goal, index) => <button key={goal.id} className={goal.id === activeGoal.id ? 'active' : ''} onClick={() => setActiveGoal(goal.id)}><span>0{index + 1}</span>{goal.name}</button>)}
        <button className="add-goal" onClick={() => openEditor({ id: `goal-${Date.now()}`, name: '', why: '' }, true)}><Plus size={15}/> Add goal</button>
      </section>
      <section className="commitment-record">
        <div className="record-number">{String(state.goals.findIndex((goal) => goal.id === activeGoal.id) + 1).padStart(2, '0')}</div>
        <div><span className="status-line"><i/> Active goal · Day {state.commitment.day}</span><h2>{activeGoal.name}</h2><p>{activeGoal.why}</p></div>
        <dl>
          <div><dt>Started</dt><dd>{formatDate(state.commitment.startDate)}</dd></div>
          <div><dt>Duration</dt><dd>{state.commitment.duration} days</dd></div>
          <div><dt>Evidence</dt><dd>{activeTasks.filter((task) => task.evidenceRequired).length} of {activeTasks.length} tasks</dd></div>
          <div><dt>Partner</dt><dd>{state.partner.name}</dd></div>
        </dl>
        <button className="secondary wide" onClick={() => openEditor()}>Edit goal & commitment</button>
      </section>
      <section className="content-section">
        <SectionHeading eyebrow={`Scoped to ${activeGoal.name}`} title="Goal tasks" action={<button className="icon-button" aria-label="Add task" onClick={() => openEditor()}><Plus size={18}/></button>}/>
        {activeTasks.map((task, index) => (
          <button className="goal-row editable" key={task.id} onClick={() => openEditor()}><span>0{index + 1}</span><div><strong>{task.title}</strong><small>{task.schedule} · {task.recurring ? 'Recurring' : 'One-time'} · {task.evidenceRequired ? 'Evidence required' : 'No evidence'}</small></div><ChevronRight size={16}/></button>
        ))}
      </section>
      {editing && (
        <div className="modal-backdrop editor-backdrop" onMouseDown={() => setEditing(false)}>
          <section className="sheet editor-sheet" onMouseDown={(event) => event.stopPropagation()}>
            <div className="sheet-handle"/>
            <div className="editor-sheet-title"><div><p className="eyebrow">{creating ? 'Add goal' : 'Edit goal'}</p><h2>{creating ? 'A second direction' : 'Refine the record'}</h2></div><button className="icon-button" onClick={() => setEditing(false)} aria-label="Close editor"><X size={17}/></button></div>
            <p className="muted">Goals share this Commitment period while keeping their tasks clearly scoped.</p>
            <CommitmentDetails commitment={draft} goal={draftGoal} onCommitment={setDraft} onGoal={setDraftGoal}/>
            <SectionHeading eyebrow={`Scoped to ${draftGoal.name || 'new goal'}`} title="Tasks"/>
            <CommitmentTasks draft={draft} goalId={draftGoal.id} onChange={setDraft}/>
            <div className="editor-actions sticky"><button className="secondary" onClick={() => setEditing(false)}>Cancel</button><button className="primary" disabled={!draftValid} onClick={saveEdits}>Save changes</button></div>
          </section>
        </div>
      )}
    </main>
  )
}

function ProgressPage() {
  const { state } = useFocus()
  const recent = state.evidence.filter((item) => item.status === 'approved').slice(0, 4)
  const percentage = Math.round((state.progress.verifiedTasks / state.progress.totalTasks) * 100)
  return (
    <main>
      <header className="page-intro"><p className="eyebrow">Measured honestly</p><h1>Progress</h1><p>A record of verified work, not a score to chase.</p></header>
      <section className="history-ledger">
        <div><strong>{state.progress.verifiedTasks}</strong><span>of {state.progress.totalTasks} tasks<br/>verified · {percentage}%</span></div>
        <div><strong>{state.progress.completedDays}</strong><span>of {state.progress.totalDays} days<br/>completed</span></div>
        <div><strong>{String(state.progress.verifiedStreak).padStart(2, '0')}</strong><span>day verified<br/>streak</span></div>
      </section>
      <section className="content-section">
        <SectionHeading eyebrow="Last seven days" title="Consistency"/>
        <div className="week-chart">
          {['T','F','S','S','M','T','W'].map((day, index) => <div key={`${day}-${index}`}><span className={index < 5 ? 'complete' : index === 6 ? 'today' : ''}>{index < 5 && <CheckCircle2 size={15}/>}</span><small>{day}</small></div>)}
        </div>
      </section>
      <section className="content-section">
        <SectionHeading title="Verified record"/>
        {recent.map((item) => <div className="timeline-row" key={item.id}><span><CheckCircle2 size={16}/></span><div><strong>{item.taskTitle}</strong><small>{item.submittedAt} · Attempt {item.attempt}</small></div></div>)}
      </section>
    </main>
  )
}

function AccountabilityPage() {
  const { state, decideEvidence, decideAccess } = useFocus()
  const pendingEvidence = state.evidence.filter((item) => item.status === 'pending')
  const pendingAccess = state.accessRequests.filter((item) => item.status === 'pending')
  const history = useMemo(() => [...state.evidence].filter((item) => item.status !== 'pending').slice(0, 3), [state.evidence])
  return (
    <main>
      <header className="page-intro partner-intro"><p className="eyebrow">{state.partner.name}’s review desk</p><h1>Accountability</h1><p>Only the context needed to make a fair decision.</p></header>
      <div className="trust-note"><ShieldCheck size={18}/><p><strong>Decision-relevant context only.</strong> Evidence supports a conversation; it does not prove the work happened.</p></div>
      <section className="content-section">
        <SectionHeading eyebrow={`${pendingEvidence.length} awaiting review`} title="Evidence"/>
        {pendingEvidence.length === 0 ? <EmptyState title="All caught up" body={`New evidence from ${state.user.name} will appear here.`}/> : pendingEvidence.map((item) => (
          <EvidenceReviewCard key={item.id} item={item} onDecision={(decision, reason) => decideEvidence(item.id, decision, reason)}/>
        ))}
      </section>
      <section className="content-section">
        <SectionHeading eyebrow={`${pendingAccess.length} open request`} title="Temporary access"/>
        {pendingAccess.map((request) => (
          <article className="access-card" key={request.id}>
            <div className="access-head"><span className="site-letter">{request.site[0]}</span><div><h3>{request.site}</h3><small>{request.requestedAt} · {request.duration} minutes</small></div><StatusPill status={request.status}/></div>
            <blockquote>“{request.reason}”</blockquote>
            <div className="approval-actions"><button className="secondary danger" onClick={() => decideAccess(request.id, 'rejected')}>Decline</button><button className="primary" onClick={() => decideAccess(request.id, 'approved')}>Allow {request.duration} min</button></div>
          </article>
        ))}
      </section>
      <section className="content-section"><SectionHeading title="Recent decisions"/>{history.map((item) => <div className="decision-row" key={item.id}><div><strong>{item.taskTitle}</strong><small>{item.submittedAt}</small></div><StatusPill status={item.status}/></div>)}</section>
    </main>
  )
}

function SettingsPage() {
  const { state, setPage, toggleNotifications, toggleRule, reset } = useFocus()
  return (
    <main>
      <header className="page-intro"><p className="eyebrow">Preferences & trust</p><h1>Settings</h1><p>Keep protection explicit and under your control.</p></header>
      <section className="settings-section">
        <h2>Accountability</h2>
        <button className="setting-row" onClick={() => setPage('goals')}><span className="setting-icon"><UserRoundCheck size={18}/></span><span><strong>{state.partner.name}</strong><small>Accountability partner · View commitment goals</small></span><ChevronRight size={18}/></button>
      </section>
      <section className="settings-section">
        <h2>Blocked sites</h2>
        {state.commitment.blockedSites.map((rule) => (
          <div className="setting-row" key={rule.id}><span className="site-letter small">{rule.site[0]}</span><span><strong>{rule.site}</strong><small>{rule.hostname}</small></span><button className={`toggle ${rule.enabled ? 'on' : ''}`} onClick={() => toggleRule(rule.id)} aria-label={`Toggle ${rule.site}`}><span/></button></div>
        ))}
      </section>
      <section className="settings-section">
        <h2>Notifications</h2>
        <div className="setting-row"><span className="setting-icon"><Bell size={18}/></span><span><strong>Commitment updates</strong><small>Evidence and access decisions</small></span><button className={`toggle ${state.notificationsEnabled ? 'on' : ''}`} onClick={toggleNotifications}><span/></button></div>
      </section>
      <section className="protection-note">
        <LockKeyhole size={22}/><div><h3>Commitment Protection</h3><p>This prototype blocks sites at the browser level using Chrome extension rules. It cannot prevent extension removal or device-level bypass. Stronger protection depends on future platform support.</p><span>{extensionMode() ? 'Chrome extension mode active' : 'Web preview · blocking is simulated'}</span></div>
      </section>
      <button className="reset-button" onClick={() => confirm('Reset all local demo data?') && reset()}><Trash2 size={16}/> Reset prototype data</button>
    </main>
  )
}

export default function App() {
  const { state, setPage, setRole } = useFocus()
  if (!state.onboarded) return <div className="app-shell"><OnboardingPage/></div>
  const page = state.role === 'partner' ? 'accountability' : state.page
  return (
    <div className="app-shell">
      <FocusHeader role={state.role} onRole={setRole}/>
      {page === 'home' && <HomePage/>}
      {page === 'goals' && <GoalsPage/>}
      {page === 'progress' && <ProgressPage/>}
      {page === 'accountability' && <AccountabilityPage/>}
      {page === 'settings' && <SettingsPage/>}
      <Navigation page={page} onChange={(next) => { setRole(next === 'accountability' ? 'partner' : 'owner'); setPage(next) }}/>
    </div>
  )
}
