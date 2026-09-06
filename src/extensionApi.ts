import { defaultState, extensionMode, loadExtensionState, saveExtensionState } from './storage'
import { nextBreakTime, reconcileLifecycle, startFixedBreak } from './lifecycle'
import type { BackgroundMessage, BackgroundResponse, ExtensionState, FocusSettings } from './types'

type RuntimeChrome = { runtime?: { sendMessage: (message: BackgroundMessage) => Promise<BackgroundResponse> } }
const runtimeChrome = (globalThis as typeof globalThis & { chrome?: RuntimeChrome }).chrome

async function send(message: BackgroundMessage): Promise<ExtensionState> {
  if (extensionMode()) {
    const response = await runtimeChrome!.runtime!.sendMessage(message)
    if (!response.ok) throw new Error(response.error)
    return response.state
  }

  const current = await loadExtensionState()
  if (message.type === 'START_SESSION') {
    const startedAt = Date.now()
    const activeSession = {
      ...message.settings,
      id: crypto.randomUUID(),
      startedAt,
      endsAt: startedAt + message.settings.durationMinutes * 60_000,
    }
    let next: ExtensionState = { ...structuredClone(defaultState), settings: message.settings, activeSession }
    next = { ...next, nextBreakAt: nextBreakTime(next, startedAt) }
    await saveExtensionState(next)
    return next
  }
  if (message.type === 'START_BREAK') {
    const now = Date.now()
    const next = startFixedBreak(reconcileLifecycle(current, now).state, now)
    await saveExtensionState(next)
    return next
  }
  if (message.type === 'RESET_COMPLETION') {
    const next = { ...current, completedSession: null }
    await saveExtensionState(next)
    return next
  }
  const next = reconcileLifecycle(current, Date.now()).state
  await saveExtensionState(next)
  return next
}

export function startSession(settings: FocusSettings) {
  return send({ type: 'START_SESSION', settings })
}

export function startBreak() {
  return send({ type: 'START_BREAK' })
}

export function endBreak() {
  return send({ type: 'END_BREAK' })
}

export function resetCompletion() {
  return send({ type: 'RESET_COMPLETION' })
}

export function recoverState() {
  if (!extensionMode()) return send({ type: 'RECOVER_STATE' })
  const storedStateFallback = new Promise<ExtensionState>((resolve) => {
    setTimeout(() => { void loadExtensionState().then(resolve) }, 1500)
  })
  return Promise.race([send({ type: 'RECOVER_STATE' }), storedStateFallback])
}
