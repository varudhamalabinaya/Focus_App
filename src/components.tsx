import {
  ArrowRight, Ban, BarChart3, Check, CheckCircle2, ChevronRight, CircleUserRound,
  Clock3, FileImage, Flag, Home, ListChecks, LockKeyhole, RotateCcw, Settings,
  ShieldCheck, Target, UserRoundCheck, X,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import type { EvidenceSubmission, NavPage, Role, Task } from './types'

export function FocusHeader({ role, onRole }: { role: Role; onRole: (role: Role) => void }) {
  return (
    <header className="focus-header">
      <div className="brand"><span className="brand-mark">F</span><span>Focus</span></div>
      <div className="role-switch" aria-label="Demo role">
        <button title="A — My Focus" aria-label="A — My Focus" className={role === 'owner' ? 'active' : ''} onClick={() => onRole('owner')}><b>A</b><span>My Focus</span></button>
        <button title="B — Accountability" aria-label="B — Accountability" className={role === 'partner' ? 'active' : ''} onClick={() => onRole('partner')}><b>B</b><span>Accountability</span></button>
      </div>
    </header>
  )
}

export function Navigation({ page, onChange }: { page: NavPage; onChange: (page: NavPage) => void }) {
  const items: Array<[NavPage, typeof Home, string]> = [
    ['home', Home, 'Home'], ['goals', Target, 'Goals'], ['progress', BarChart3, 'Progress'],
    ['accountability', UserRoundCheck, 'Accountability'], ['settings', Settings, 'Settings'],
  ]
  return (
    <nav className="navigation" aria-label="Primary navigation">
      {items.map(([id, Icon, label]) => (
        <button key={id} className={page === id ? 'active' : ''} onClick={() => onChange(id)}>
          <Icon size={18} strokeWidth={1.8}/><span>{label}</span>
        </button>
      ))}
    </nav>
  )
}

export function SectionHeading({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return <div className="section-heading"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2>{title}</h2></div>{action}</div>
}

export function ProgressSummary({ name, day, duration, taskCount, verifiedTasks, totalTasks, streak, partnerName }: { name: string; day: number; duration: number; taskCount: number; verifiedTasks: number; totalTasks: number; streak: number; partnerName: string }) {
  const percentage = Math.round((verifiedTasks / totalTasks) * 100)
  return (
    <section className="ledger" aria-label="Commitment progress">
      <div className="ledger-top">
        <div><p className="eyebrow">Current commitment</p><h1>{name}</h1></div>
        <div className="day-stamp"><span>DAY</span><strong>{String(day).padStart(2, '0')}</strong><small>OF {duration}</small></div>
      </div>
      <div className="rule"/>
      <div className="ledger-stats">
        <div><span>Progress</span><strong>{percentage}%</strong></div>
        <div><span>Verified streak</span><strong>{streak} days</strong></div>
        <div><span>Today</span><strong>1 of {taskCount}</strong></div>
      </div>
      <div className="progress-track"><span style={{ width: `${percentage}%` }}/></div>
      <p className="ledger-note"><ShieldCheck size={15}/> {partnerName} verifies evidence for this commitment.</p>
    </section>
  )
}

const taskIcons = { open: Clock3, completed: Check, waiting: FileImage, verified: CheckCircle2, rejected: RotateCcw }
const taskLabels = { open: 'Due today', completed: 'Completed · add evidence', waiting: 'Waiting for Abinaya', verified: 'Verified', rejected: 'Needs resubmission' }

export function TaskItem({ task, onSelect }: { task: Task; onSelect: (task: Task) => void }) {
  const Icon = taskIcons[task.status]
  return (
    <button className={`task-item ${task.status}`} onClick={() => onSelect(task)}>
      <span className="task-state"><Icon size={18}/></span>
      <span className="task-copy"><strong>{task.title}</strong><small>{task.schedule} · {taskLabels[task.status]}</small></span>
      <ChevronRight size={18}/>
    </button>
  )
}

export function PartnerStatus({ name = 'Abinaya' }: { name?: string }) {
  return (
    <div className="partner-status">
      <span className="avatar">A</span>
      <span><small>Accountability partner</small><strong>{name}</strong></span>
      <span className="status-dot">Connected</span>
    </div>
  )
}

export function StatusPill({ status }: { status: 'pending' | 'approved' | 'rejected' }) {
  return <span className={`status-pill ${status}`}>{status === 'approved' ? <Check size={12}/> : status === 'rejected' ? <X size={12}/> : <Clock3 size={12}/>} {status}</span>
}

export function EvidenceReviewCard({ item, onDecision }: { item: EvidenceSubmission; onDecision?: (decision: 'approved' | 'rejected', reason?: string) => void }) {
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  return (
    <article className="review-card">
      <div className="review-meta"><StatusPill status={item.status}/><span>Attempt {item.attempt} of 5</span></div>
      <h3>{item.taskTitle}</h3>
      <p className="review-note">{item.note}</p>
      <div className="evidence-thumb"><FileImage size={26}/><span><strong>{item.imageName}</strong><small>{item.submittedAt}</small></span></div>
      {item.rejectionReason && <p className="rejection-reason"><Ban size={15}/><span><strong>Why it was returned</strong>{item.rejectionReason}</span></p>}
      {item.status === 'pending' && onDecision && (
        rejecting ? <div className="rejection-form">
          <label className="field"><span>Reason for returning evidence</span><textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Tell Gowtham exactly what is missing."/></label>
          <div className="approval-actions"><button className="secondary" onClick={() => { setRejecting(false); setReason('') }}>Cancel</button><button className="secondary danger" disabled={!reason.trim()} onClick={() => onDecision('rejected', reason.trim())}><X size={16}/> {item.attempt >= 5 ? 'Final return' : 'Return with reason'}</button></div>
        </div> : <div className="approval-actions">
          <button className="secondary danger" onClick={() => setRejecting(true)}><X size={16}/> Return</button>
          <button className="primary" onClick={() => onDecision('approved')}><Check size={16}/> Verify</button>
        </div>
      )}
    </article>
  )
}

export function EmptyState({ icon: Icon = ListChecks, title, body }: { icon?: typeof ListChecks; title: string; body: string }) {
  return <div className="empty-state"><Icon size={27}/><h3>{title}</h3><p>{body}</p></div>
}

export function BlockingIntervention({ onRequest }: { onRequest: () => void }) {
  return (
    <section className="intervention">
      <span className="intervention-icon"><LockKeyhole size={28}/></span>
      <p className="eyebrow">Commitment Protection</p>
      <h1>A pause before<br/>you continue.</h1>
      <p>You chose to protect this time for deep work. YouTube is blocked while your commitment is active.</p>
      <button className="primary wide" onClick={onRequest}>Request temporary access <ArrowRight size={17}/></button>
      <small>Gowtham · Day 6 of 14</small>
    </section>
  )
}

export const Icons = { CircleUserRound, Flag }
