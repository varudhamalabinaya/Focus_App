import { defaultState, extensionMode, loadExtensionState, saveExtensionState } from './storage'
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
    const proposedBreak = message.settings.breakIntervalMinutes
      ? startedAt + message.settings.breakIntervalMinutes * 60_000
      : null
    const nextBreakAt = proposedBreak && proposedBreak < activeSession.endsAt ? proposedBreak : null
    const next = { ...defaultState, settings: message.settings, activeSession, nextBreakAt }
    await saveExtensionState(next)
    return next
  }
  if (message.type === 'ACKNOWLEDGE_BREAK' && current.activeSession) {
    const interval = current.activeSession.breakIntervalMinutes
    const proposedBreak = interval ? Date.now() + interval * 60_000 : null
    const nextBreakAt = proposedBreak && proposedBreak < current.activeSession.endsAt ? proposedBreak : null
    const next = { ...current, breakReminderDue: false, nextBreakAt }
    await saveExtensionState(next)
    return next
  }
  if (message.type === 'RESET_COMPLETION') {
    const next = { ...current, completedSession: null }
    await saveExtensionState(next)
    return next
  }
  return current
}

export function startSession(settings: FocusSettings) {
  return send({ type: 'START_SESSION', settings })
}

export function acknowledgeBreak() {
  return send({ type: 'ACKNOWLEDGE_BREAK' })
}

export function resetCompletion() {
  return send({ type: 'RESET_COMPLETION' })
}

export function recoverState() {
  return send({ type: 'RECOVER_STATE' })
}
