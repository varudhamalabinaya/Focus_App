import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { initialState } from './data'
import { setTemporaryAccess, syncBlockingRules } from './extensionApi'
import { loadFocusState, persistFocusState } from './storage'
import type { Commitment, Decision, FocusState, Goal, NavPage, Role, TaskStatus } from './types'

interface FocusActions {
  state: FocusState
  setPage: (page: NavPage) => void
  setRole: (role: Role) => void
  setActiveGoal: (goalId: string) => void
  saveGoal: (goal: Goal) => void
  addGoal: (goal: Goal) => void
  completeTask: (taskId: string) => void
  submitEvidence: (taskId: string, note: string, imageName: string) => void
  decideEvidence: (id: string, decision: Exclude<Decision, 'pending'>, reason?: string) => void
  requestAccess: (site: string, reason: string, duration: number) => void
  decideAccess: (id: string, decision: Exclude<Decision, 'pending'>) => void
  toggleRule: (id: string) => void
  toggleNotifications: () => void
  saveCommitment: (commitment: Commitment, finishOnboarding?: boolean) => void
  reset: () => void
}

const FocusContext = createContext<FocusActions | null>(null)

function incrementVerified(state: FocusState): FocusState {
  return {
    ...state,
    progress: {
      ...state.progress,
      verifiedTasks: Math.min(state.progress.totalTasks, state.progress.verifiedTasks + 1),
    },
  }
}

export function FocusProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FocusState>(loadFocusState)

  useEffect(() => {
    persistFocusState(state)
  }, [state])

  useEffect(() => {
    void syncBlockingRules(state.commitment.blockedSites.filter((rule) => rule.enabled).map((rule) => rule.site))
  }, [state.commitment.blockedSites])

  const actions = useMemo<FocusActions>(() => ({
    state,
    setPage: (page) => setState((current) => ({ ...current, page })),
    setRole: (role) => setState((current) => ({ ...current, role })),
    setActiveGoal: (activeGoalId) => setState((current) => ({ ...current, activeGoalId })),
    saveGoal: (goal) => setState((current) => ({
      ...current,
      goals: current.goals.map((item) => item.id === goal.id ? goal : item),
    })),
    addGoal: (goal) => setState((current) => ({
      ...current,
      goals: [...current.goals, goal],
      activeGoalId: goal.id,
      commitment: { ...current.commitment, goalIds: [...current.commitment.goalIds, goal.id] },
    })),
    completeTask: (taskId) => setState((current) => {
      const task = current.commitment.tasks.find((item) => item.id === taskId)
      if (!task || task.status !== 'open') return current
      const nextStatus: TaskStatus = task.evidenceRequired ? 'completed' : 'verified'
      const next: FocusState = {
        ...current,
        commitment: {
          ...current.commitment,
          tasks: current.commitment.tasks.map((item) => item.id === taskId ? { ...item, status: nextStatus } : item),
        },
      } as FocusState
      return task.evidenceRequired ? next : incrementVerified(next)
    }),
    submitEvidence: (taskId, note, imageName) => setState((current) => {
      const task = current.commitment.tasks.find((item) => item.id === taskId)
      if (!task || task.attempt > 5 || !['completed', 'rejected'].includes(task.status)) return current
      const submission = {
        id: `ev-${Date.now()}`,
        taskId,
        taskTitle: task.title,
        submittedAt: 'Just now',
        note,
        imageName,
        status: 'pending' as const,
        attempt: task.attempt,
      }
      return {
        ...current,
        commitment: {
          ...current.commitment,
          tasks: current.commitment.tasks.map((item) => item.id === taskId ? { ...item, status: 'waiting' } : item),
        },
        evidence: [submission, ...current.evidence],
      }
    }),
    decideEvidence: (id, decision, reason) => setState((current) => {
      const evidence = current.evidence.find((item) => item.id === id)
      if (!evidence || evidence.status !== 'pending' || (decision === 'rejected' && !reason?.trim())) return current
      const next: FocusState = {
        ...current,
        evidence: current.evidence.map((item) => item.id === id ? { ...item, status: decision, rejectionReason: reason } : item),
        commitment: {
          ...current.commitment,
          tasks: current.commitment.tasks.map((task) => task.id === evidence.taskId
            ? { ...task, status: (decision === 'approved' ? 'verified' : 'rejected') as TaskStatus, attempt: decision === 'rejected' ? Math.min(5, task.attempt + 1) : task.attempt }
            : task),
        },
        notifications: [{
          id: `note-${Date.now()}`,
          kind: 'evidence' as const,
          message: decision === 'approved' ? `Abinaya verified ${evidence.taskTitle}.` : `Abinaya returned ${evidence.taskTitle}: ${reason}`,
          createdAt: 'Just now',
          read: false,
        }, ...current.notifications],
      }
      return decision === 'approved' ? incrementVerified(next) : next
    }),
    requestAccess: (site, reason, duration) => setState((current) => ({
      ...current,
      accessRequests: [{
        id: `ar-${Date.now()}`,
        site,
        reason,
        duration,
        requestedAt: 'Just now',
        status: 'pending',
      }, ...current.accessRequests],
    })),
    decideAccess: (id, decision) => setState((current) => {
      const request = current.accessRequests.find((item) => item.id === id)
      if (request && decision === 'approved') void setTemporaryAccess(request.site, request.duration)
      return { ...current, accessRequests: current.accessRequests.map((item) => item.id === id ? { ...item, status: decision } : item) }
    }),
    toggleRule: (id) => setState((current) => ({
      ...current,
      commitment: {
        ...current.commitment,
        blockedSites: current.commitment.blockedSites.map((rule) => rule.id === id ? { ...rule, enabled: !rule.enabled } : rule),
      },
    })),
    toggleNotifications: () => setState((current) => ({ ...current, notificationsEnabled: !current.notificationsEnabled })),
    saveCommitment: (commitment, finishOnboarding = false) => setState((current) => ({
      ...current,
      commitment,
      onboarded: finishOnboarding ? true : current.onboarded,
    })),
    reset: () => setState(structuredClone(initialState)),
  }), [state])

  return <FocusContext.Provider value={actions}>{children}</FocusContext.Provider>
}

export function useFocus() {
  const context = useContext(FocusContext)
  if (!context) throw new Error('useFocus must be used inside FocusProvider')
  return context
}
