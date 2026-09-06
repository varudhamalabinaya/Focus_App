import { describe, expect, it } from 'vitest'
import { BREAK_DURATION_MS, reconcileLifecycle, startFixedBreak } from './lifecycle'
import { defaultState, normalizeState } from './storage'
import type { ExtensionState, FocusSession } from './types'

const MINUTE = 60_000
const START = 1_700_000_000_000

function sessionState(overrides: Partial<ExtensionState> = {}): ExtensionState {
  const activeSession: FocusSession = {
    id: 'session-1',
    sessionName: 'Write the proposal',
    durationMinutes: 45,
    breakIntervalMinutes: 25,
    blockedDomains: ['youtube.com'],
    startedAt: START,
    endsAt: START + 45 * MINUTE,
  }
  return {
    ...structuredClone(defaultState),
    activeSession,
    breakReminderDue: true,
    ...overrides,
  }
}

describe('focus lifecycle', () => {
  it('extends the focus deadline exactly once when a break starts', () => {
    const state = sessionState()
    const started = startFixedBreak(state, START + 25 * MINUTE)
    const duplicate = startFixedBreak(started, START + 25 * MINUTE + 10)

    expect(started.activeSession?.endsAt).toBe(START + 45 * MINUTE + BREAK_DURATION_MS)
    expect(started.activeBreak).toEqual({
      startedAt: START + 25 * MINUTE,
      endsAt: START + 30 * MINUTE,
    })
    expect(duplicate.activeSession?.endsAt).toBe(started.activeSession?.endsAt)
  })

  it('ends a stale break without extending the deadline again', () => {
    const started = startFixedBreak(sessionState(), START + 25 * MINUTE)
    const result = reconcileLifecycle(started, START + 31 * MINUTE)

    expect(result.breakEnded).toBe(true)
    expect(result.state.activeBreak).toBeNull()
    expect(result.state.activeSession?.endsAt).toBe(START + 50 * MINUTE)
    expect(result.state.nextBreakAt).toBeNull()
  })

  it('completes an expired session using its persisted deadline', () => {
    const state = sessionState({ breakReminderDue: false, nextBreakAt: START + 25 * MINUTE })
    const result = reconcileLifecycle(state, START + 2 * 60 * MINUTE)

    expect(result.completed).toBe(true)
    expect(result.state.activeSession).toBeNull()
    expect(result.state.completedSession?.completedAt).toBe(START + 45 * MINUTE)
  })

  it('counts disabled elapsed time without extending an unexpired session', () => {
    const state = sessionState({ breakReminderDue: false, nextBreakAt: START + 25 * MINUTE })
    const result = reconcileLifecycle(state, START + 30 * MINUTE)

    expect(result.completed).toBe(false)
    expect(result.state.activeSession?.endsAt).toBe(START + 45 * MINUTE)
    expect(result.state.activeBreak).toBeNull()
    expect(result.state.breakReminderDue).toBe(true)
  })

  it('drops malformed break data without adding focus time', () => {
    const state = sessionState()
    const normalized = normalizeState({
      ...state,
      activeBreak: { startedAt: START + 25 * MINUTE, endsAt: START + 40 * MINUTE },
    })

    expect(normalized.activeBreak).toBeNull()
    expect(normalized.activeSession?.endsAt).toBe(START + 45 * MINUTE)
  })
})
