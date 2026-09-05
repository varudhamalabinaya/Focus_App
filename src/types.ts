export interface FocusSettings {
  sessionName: string
  durationMinutes: number
  breakIntervalMinutes: number | null
  blockedDomains: string[]
}

export interface FocusSession extends FocusSettings {
  id: string
  startedAt: number
  endsAt: number
}

export interface CompletedSession {
  id: string
  sessionName: string
  durationMinutes: number
  startedAt: number
  completedAt: number
}

export interface ExtensionState {
  settings: FocusSettings
  activeSession: FocusSession | null
  completedSession: CompletedSession | null
  breakReminderDue: boolean
  nextBreakAt: number | null
}

export type BackgroundMessage =
  | { type: 'START_SESSION'; settings: FocusSettings }
  | { type: 'ACKNOWLEDGE_BREAK' }
  | { type: 'RESET_COMPLETION' }
  | { type: 'RECOVER_STATE' }

export type BackgroundResponse =
  | { ok: true; state: ExtensionState }
  | { ok: false; error: string }
