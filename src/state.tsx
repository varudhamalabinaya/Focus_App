import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { recoverState, resetCompletion, startBreak, startSession } from './extensionApi'
import { reconcileLifecycle } from './lifecycle'
import { defaultState, extensionMode, loadExtensionState, saveExtensionState, subscribeToExtensionState } from './storage'
import type { ExtensionState, FocusSettings } from './types'

interface FocusActions {
  state: ExtensionState
  loading: boolean
  error: string
  start: (settings: FocusSettings) => Promise<void>
  takeBreak: () => Promise<void>
  beginAgain: () => Promise<void>
}

const FocusContext = createContext<FocusActions | null>(null)

export function FocusProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ExtensionState>(structuredClone(defaultState))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    const restore = extensionMode()
      ? recoverState().catch(() => loadExtensionState())
      : loadExtensionState()
    void restore.then((loaded) => {
      if (!mounted) return
      setState(loaded)
      setLoading(false)
    })
    const unsubscribe = subscribeToExtensionState(setState)
    return () => { mounted = false; unsubscribe() }
  }, [])

  useEffect(() => {
    if (extensionMode() || !state.activeSession) return
    const timer = window.setInterval(() => {
      const next = reconcileLifecycle(state, Date.now()).state
      if (next !== state) {
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
    takeBreak: async () => {
      setError('')
      try { setState(await startBreak()) }
      catch { setError('Could not start the break. Try again.') }
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
