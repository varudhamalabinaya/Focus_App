import { initialState } from './data'
import type { FocusState, TaskStatus } from './types'

export const STORAGE_KEY = 'focus-prototype-state-v3'
const LEGACY_KEYS = ['focus-prototype-state-v2', 'focus-prototype-state-v1']
const validTaskStatuses: TaskStatus[] = ['open', 'completed', 'waiting', 'verified', 'rejected']

function normalizeState(parsed: Partial<FocusState>): FocusState {
  const base = structuredClone(initialState)
  const goals = Array.isArray(parsed.goals) && parsed.goals.length ? parsed.goals : base.goals
  const activeGoalId = goals.some((goal) => goal.id === parsed.activeGoalId) ? parsed.activeGoalId! : goals[0].id
  const parsedTasks = Array.isArray(parsed.commitment?.tasks) ? parsed.commitment.tasks : base.commitment.tasks
  const commitment = {
    ...base.commitment,
    ...(parsed.commitment ?? {}),
    partnerId: parsed.commitment?.partnerId ?? base.partner.id,
    goalIds: Array.isArray(parsed.commitment?.goalIds) ? parsed.commitment.goalIds : goals.map((goal) => goal.id),
    tasks: parsedTasks.map((task) => ({
      ...task,
      goalId: task.goalId || activeGoalId,
      status: validTaskStatuses.includes(task.status) ? task.status : 'open',
      attempt: Math.min(5, Math.max(1, task.attempt || 1)),
    })),
    blockedSites: Array.isArray(parsed.commitment?.blockedSites) ? parsed.commitment.blockedSites : base.commitment.blockedSites,
  }
  return {
    ...base,
    ...parsed,
    user: { ...base.user, ...(parsed.user ?? {}) },
    partner: { ...base.partner, ...(parsed.partner ?? {}) },
    goals,
    activeGoalId,
    commitment,
    progress: { ...base.progress, ...(parsed.progress ?? {}) },
    evidence: Array.isArray(parsed.evidence) ? parsed.evidence : base.evidence,
    accessRequests: Array.isArray(parsed.accessRequests) ? parsed.accessRequests : base.accessRequests,
    notifications: Array.isArray(parsed.notifications) ? parsed.notifications : base.notifications,
  }
}

export function loadFocusState(): FocusState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) ?? LEGACY_KEYS.map((key) => localStorage.getItem(key)).find(Boolean)
    if (!saved) return structuredClone(initialState)
    const parsed = JSON.parse(saved) as Partial<FocusState>
    return normalizeState(parsed)
  } catch {
    return structuredClone(initialState)
  }
}

export function persistFocusState(state: FocusState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}
