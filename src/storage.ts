import type { ExtensionState, FocusSettings } from './types'

export const STORAGE_KEY = 'focus-extension-state-v1'

export const defaultSettings: FocusSettings = {
  sessionName: 'Deep work session',
  durationMinutes: 45,
  breakIntervalMinutes: 25,
  blockedDomains: ['youtube.com', 'instagram.com', 'reddit.com'],
}

export const defaultState: ExtensionState = {
  settings: defaultSettings,
  activeSession: null,
  completedSession: null,
  breakReminderDue: false,
  nextBreakAt: null,
}

type ChromeStorage = {
  runtime?: { id?: string }
  storage?: {
    local: { get: (key: string) => Promise<Record<string, unknown>>; set: (items: Record<string, unknown>) => Promise<void> }
    onChanged: { addListener: (listener: (changes: Record<string, { newValue?: unknown }>, area: string) => void) => void; removeListener: (listener: (changes: Record<string, { newValue?: unknown }>, area: string) => void) => void }
  }
}

const browserChrome = (globalThis as typeof globalThis & { chrome?: ChromeStorage }).chrome

export function extensionMode() {
  return Boolean(browserChrome?.runtime?.id && browserChrome.storage)
}

function normalizeState(value: unknown): ExtensionState {
  if (!value || typeof value !== 'object') return structuredClone(defaultState)
  const parsed = value as Partial<ExtensionState>
  return {
    ...structuredClone(defaultState),
    ...parsed,
    settings: { ...defaultSettings, ...(parsed.settings ?? {}) },
  }
}

export async function loadExtensionState(): Promise<ExtensionState> {
  if (extensionMode()) {
    const stored = await browserChrome!.storage!.local.get(STORAGE_KEY)
    return normalizeState(stored[STORAGE_KEY])
  }
  try {
    return normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null'))
  } catch {
    return structuredClone(defaultState)
  }
}

export async function saveExtensionState(state: ExtensionState) {
  if (extensionMode()) {
    await browserChrome!.storage!.local.set({ [STORAGE_KEY]: state })
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    window.dispatchEvent(new CustomEvent(STORAGE_KEY, { detail: state }))
  }
}

export function subscribeToExtensionState(listener: (state: ExtensionState) => void) {
  if (extensionMode()) {
    const handleChange = (changes: Record<string, { newValue?: unknown }>, area: string) => {
      if (area === 'local' && changes[STORAGE_KEY]) listener(normalizeState(changes[STORAGE_KEY].newValue))
    }
    browserChrome!.storage!.onChanged.addListener(handleChange)
    return () => browserChrome!.storage!.onChanged.removeListener(handleChange)
  }
  const handleLocal = (event: Event) => listener(normalizeState((event as CustomEvent).detail))
  window.addEventListener(STORAGE_KEY, handleLocal)
  return () => window.removeEventListener(STORAGE_KEY, handleLocal)
}
