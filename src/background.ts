import { normalizeDomain } from './domains'
import { defaultState, STORAGE_KEY } from './storage'
import type { BackgroundMessage, BackgroundResponse, ExtensionState, FocusSession, FocusSettings } from './types'

interface Rule {
  id: number
  priority: number
  action: { type: 'redirect'; redirect: { url: string } }
  condition: { urlFilter: string; resourceTypes: ['main_frame'] }
}

declare const chrome: {
  runtime: {
    getURL: (path: string) => string
    onInstalled: { addListener: (callback: () => void) => void }
    onStartup: { addListener: (callback: () => void) => void }
    onMessage: { addListener: (callback: (message: BackgroundMessage, sender: unknown, respond: (response: BackgroundResponse) => void) => boolean) => void }
  }
  storage: { local: { get: (key: string) => Promise<Record<string, unknown>>; set: (items: Record<string, unknown>) => Promise<void> } }
  declarativeNetRequest: {
    getDynamicRules: () => Promise<Rule[]>
    updateDynamicRules: (update: { removeRuleIds: number[]; addRules?: Rule[] }) => Promise<void>
  }
  alarms: {
    create: (name: string, options: { when: number }) => void
    clear: (name: string) => Promise<boolean>
    onAlarm: { addListener: (callback: (alarm: { name: string }) => void) => void }
  }
  notifications: {
    create: (id: string, options: {
      type: 'basic'
      iconUrl: string
      title: string
      message: string
      priority: number
    }) => Promise<string>
  }
}

const RULE_BASE = 42000
const RULE_LIMIT = 43000
const END_ALARM = 'focus:end'
const BREAK_ALARM = 'focus:break'
const LEGACY_RULE_IDS = [101, 102, 103]
let queue = Promise.resolve()

function enqueue<T>(task: () => Promise<T>) {
  const result = queue.then(task, task)
  queue = result.then(() => undefined, () => undefined)
  return result
}

async function readState(): Promise<ExtensionState> {
  const stored = await chrome.storage.local.get(STORAGE_KEY)
  return { ...structuredClone(defaultState), ...((stored[STORAGE_KEY] as Partial<ExtensionState> | undefined) ?? {}) }
}

async function writeState(state: ExtensionState) {
  await chrome.storage.local.set({ [STORAGE_KEY]: state })
}

function validateSettings(settings: FocusSettings) {
  const sessionName = settings.sessionName.trim()
  const domains = settings.blockedDomains.map(normalizeDomain)
  if (sessionName.length < 2 || sessionName.length > 80) throw new Error('Give this session a short, clear name.')
  if (!Number.isInteger(settings.durationMinutes) || settings.durationMinutes < 1 || settings.durationMinutes > 480) throw new Error('Duration must be between 1 and 480 minutes.')
  if (settings.breakIntervalMinutes !== null && (![15, 25, 45, 60].includes(settings.breakIntervalMinutes))) throw new Error('Choose a supported break interval.')
  if (!domains.length) throw new Error('Add at least one website to block.')
  if (domains.length > 50) throw new Error('Focus supports up to 50 blocked websites.')
  if (domains.some((domain) => !domain)) throw new Error('One or more blocked websites is invalid.')
  if (new Set(domains).size !== domains.length) throw new Error('Blocked websites must be unique.')
  return { ...settings, sessionName, blockedDomains: domains as string[] }
}

async function removeFocusRules() {
  const rules = await chrome.declarativeNetRequest.getDynamicRules()
  const removeRuleIds = rules
    .map((rule) => rule.id)
    .filter((id) => (id >= RULE_BASE && id < RULE_LIMIT) || LEGACY_RULE_IDS.includes(id))
  if (removeRuleIds.length) await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds })
}

async function applyRules(session: FocusSession) {
  await removeFocusRules()
  const addRules: Rule[] = session.blockedDomains.map((domain, index) => ({
    id: RULE_BASE + index,
    priority: 1,
    action: { type: 'redirect', redirect: { url: chrome.runtime.getURL(`blocked.html?site=${encodeURIComponent(domain)}`) } },
    condition: { urlFilter: `||${domain}^`, resourceTypes: ['main_frame'] },
  }))
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [], addRules })
}

async function clearAlarms() {
  await Promise.all([chrome.alarms.clear(END_ALARM), chrome.alarms.clear(BREAK_ALARM)])
}

async function notifyBreak() {
  await chrome.notifications.create('focus-break-reminder', {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icon-128.png'),
    title: 'Time for a short break',
    message: 'Step away for a few minutes.',
    priority: 1,
  })
}

function scheduleBreak(session: FocusSession, state: ExtensionState, from = Date.now()) {
  if (!session.breakIntervalMinutes) return { ...state, nextBreakAt: null }
  const nextBreakAt = from + session.breakIntervalMinutes * 60_000
  if (nextBreakAt >= session.endsAt) return { ...state, nextBreakAt: null }
  chrome.alarms.create(BREAK_ALARM, { when: nextBreakAt })
  return { ...state, nextBreakAt }
}

async function completeSession(state: ExtensionState) {
  await removeFocusRules()
  await clearAlarms()
  if (!state.activeSession) return { ...state, breakReminderDue: false, nextBreakAt: null }
  const session = state.activeSession
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
  await writeState(next)
  return next
}

async function recover() {
  let state = await readState()
  if (!state.activeSession) {
    await removeFocusRules()
    await clearAlarms()
    return state
  }
  if (state.activeSession.endsAt <= Date.now()) return completeSession(state)
  await applyRules(state.activeSession)
  await clearAlarms()
  chrome.alarms.create(END_ALARM, { when: state.activeSession.endsAt })
  if (!state.breakReminderDue) {
    if (state.nextBreakAt && state.nextBreakAt <= Date.now()) {
      state = { ...state, breakReminderDue: true, nextBreakAt: null }
      await writeState(state)
      await notifyBreak()
    } else if (state.nextBreakAt && state.nextBreakAt < state.activeSession.endsAt) {
      chrome.alarms.create(BREAK_ALARM, { when: state.nextBreakAt })
    } else {
      state = scheduleBreak(state.activeSession, state)
      await writeState(state)
    }
  }
  return state
}

async function handleMessage(message: BackgroundMessage): Promise<ExtensionState> {
  const current = await readState()
  if (message.type === 'START_SESSION') {
    if (current.activeSession && current.activeSession.endsAt > Date.now()) throw new Error('A focus session is already active.')
    const settings = validateSettings(message.settings)
    const startedAt = Date.now()
    const session: FocusSession = { ...settings, id: crypto.randomUUID(), startedAt, endsAt: startedAt + settings.durationMinutes * 60_000 }
    let next: ExtensionState = { ...defaultState, settings, activeSession: session }
    next = scheduleBreak(session, next, startedAt)
    await applyRules(session)
    chrome.alarms.create(END_ALARM, { when: session.endsAt })
    await writeState(next)
    return next
  }
  if (message.type === 'ACKNOWLEDGE_BREAK' && current.activeSession) {
    await chrome.alarms.clear(BREAK_ALARM)
    const next = scheduleBreak(current.activeSession, { ...current, breakReminderDue: false, nextBreakAt: null })
    await writeState(next)
    return next
  }
  if (message.type === 'RESET_COMPLETION') {
    const next = { ...current, completedSession: null }
    await writeState(next)
    return next
  }
  return recover()
}

chrome.runtime.onInstalled.addListener(() => { void enqueue(recover) })
chrome.runtime.onStartup.addListener(() => { void enqueue(recover) })
chrome.runtime.onMessage.addListener((message, _sender, respond) => {
  void enqueue(() => handleMessage(message))
    .then((state) => respond({ ok: true, state }))
    .catch((error: unknown) => respond({ ok: false, error: error instanceof Error ? error.message : 'Focus could not update the session.' }))
  return true
})
chrome.alarms.onAlarm.addListener((alarm) => {
  void enqueue(async () => {
    const state = await readState()
    if (alarm.name === END_ALARM) await completeSession(state)
    if (alarm.name === BREAK_ALARM && state.activeSession && state.activeSession.endsAt > Date.now()) {
      await writeState({ ...state, breakReminderDue: true, nextBreakAt: null })
      await notifyBreak()
    }
  })
})

void enqueue(recover)
