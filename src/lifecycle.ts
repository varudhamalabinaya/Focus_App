import type { ExtensionState, FocusBreak } from './types'

export const BREAK_DURATION_MS = 5 * 60_000

export function nextBreakTime(state: ExtensionState, from: number) {
  const session = state.activeSession
  if (!session?.breakIntervalMinutes) return null
  const next = from + session.breakIntervalMinutes * 60_000
  return next < session.endsAt ? next : null
}

export function startFixedBreak(state: ExtensionState, now: number): ExtensionState {
  const session = state.activeSession
  if (!session || session.endsAt <= now) throw new Error('This focus session has already ended.')
  if (state.activeBreak) return state
  if (!state.breakReminderDue) throw new Error('The break is not available yet.')

  const activeBreak: FocusBreak = { startedAt: now, endsAt: now + BREAK_DURATION_MS }
  return {
    ...state,
    activeSession: { ...session, endsAt: session.endsAt + BREAK_DURATION_MS },
    activeBreak,
    breakReminderDue: false,
    nextBreakAt: null,
  }
}

export interface LifecycleResult {
  state: ExtensionState
  completed: boolean
  breakBecameDue: boolean
  breakEnded: boolean
}

export function reconcileLifecycle(input: ExtensionState, now: number): LifecycleResult {
  const session = input.activeSession
  if (!session) {
    return {
      state: { ...input, activeBreak: null, breakReminderDue: false, nextBreakAt: null },
      completed: false,
      breakBecameDue: false,
      breakEnded: false,
    }
  }

  if (session.endsAt <= now) {
    return {
      state: {
        ...input,
        activeSession: null,
        activeBreak: null,
        breakReminderDue: false,
        nextBreakAt: null,
        completedSession: {
          id: session.id,
          sessionName: session.sessionName,
          durationMinutes: session.durationMinutes,
          startedAt: session.startedAt,
          completedAt: session.endsAt,
        },
      },
      completed: true,
      breakBecameDue: false,
      breakEnded: Boolean(input.activeBreak),
    }
  }

  if (input.activeBreak && input.activeBreak.endsAt > now) {
    const state = !input.breakReminderDue && input.nextBreakAt === null
      ? input
      : { ...input, breakReminderDue: false, nextBreakAt: null }
    return {
      state,
      completed: false,
      breakBecameDue: false,
      breakEnded: false,
    }
  }

  const breakEnded = Boolean(input.activeBreak)
  let state: ExtensionState = breakEnded
    ? { ...input, activeBreak: null, breakReminderDue: false, nextBreakAt: nextBreakTime(input, input.activeBreak!.endsAt) }
    : input

  if (state.breakReminderDue) {
    return { state: { ...state, nextBreakAt: null }, completed: false, breakBecameDue: false, breakEnded }
  }

  if (state.nextBreakAt !== null && state.nextBreakAt <= now) {
    state = { ...state, breakReminderDue: true, nextBreakAt: null }
    return { state, completed: false, breakBecameDue: true, breakEnded }
  }

  if (state.nextBreakAt === null) {
    state = { ...state, nextBreakAt: nextBreakTime(state, now) }
  }

  return { state, completed: false, breakBecameDue: false, breakEnded }
}
