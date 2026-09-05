import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { acknowledgeBreak, recoverState, resetCompletion, startSession } from './extensionApi'
import { defaultState, extensionMode, loadExtensionState, saveExtensionState, subscribeToExtensionState } from './storage'
import type { ExtensionState, FocusSettings } from './types'

interface FocusActions {
  state: ExtensionState
  loading: boolean
  error: string
  start: (settings: FocusSettings) => Promise<void>
  acknowledge: () => Promise<void>
  beginAgain: () => Promise<void>
}

const FocusContext = createContext<FocusActions | null>(null)

export function FocusProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ExtensionState>(structuredClone(defaultState))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    void loadExtensionState().then((loaded) => {
      if (!mounted) return
      setState(loaded)
      setLoading(false)
      if (extensionMode()) void recoverState().catch(() => undefined)
    })
    const unsubscribe = subscribeToExtensionState(setState)
    return () => { mounted = false; unsubscribe() }
  }, [])

  useEffect(() => {
    if (extensionMode() || !state.activeSession) return
    const timer = window.setInterval(() => {
      const session = state.activeSession
      if (!session) return
      const now = Date.now()
      if (now >= session.endsAt) {
        const next: ExtensionState = {
          ...state,
          activeSession: null,
          breakReminderDue: false,
          nextBreakAt: null,
          completedSession: {
            id: session.id,
            sessionName: session.sessionName,
            durationMinutes: session.durationMinutes,
            startedAt: session.startedAt,
            completedAt: session.endsAt,
          },
        }
        setState(next)
        void saveExtensionState(next)
      } else if (state.nextBreakAt && now >= state.nextBreakAt) {
        const next = { ...state, breakReminderDue: true, nextBreakAt: null }
        setState(next)
        void saveExtensionState(next)
      }
    }, 1000)
    return () => window.clearInterval(timer)
  }, [state])

  const value = useMemo<FocusActions>(() => ({
    state,
    loading,
    error,
    start: async (settings) => {
      setError('')
      try { setState(await startSession(settings)) }
      catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not start the session.') }
    },
    acknowledge: async () => {
      setError('')
      try { setState(await acknowledgeBreak()) }
      catch { setError('Could not acknowledge the reminder. Try again.') }
    },
    beginAgain: async () => {
      setError('')
      try { setState(await resetCompletion()) }
      catch { setError('Could not reset the completed session.') }
    },
  }), [state, loading, error])

  return <FocusContext.Provider value={value}>{children}</FocusContext.Provider>
}

export function useFocus() {
  const context = useContext(FocusContext)
  if (!context) throw new Error('useFocus must be used inside FocusProvider')
  return context
}
