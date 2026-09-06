import { matchBlockedDomain, normalizeDomain } from './domains'
import { nextBreakTime, reconcileLifecycle, startFixedBreak } from './lifecycle'
import { defaultState, normalizeState, STORAGE_KEY } from './storage'
import type { BackgroundMessage, BackgroundResponse, ExtensionState, FocusSession, FocusSettings } from './types'

interface Rule {
  id: number
  priority: number
  action: { type: 'redirect'; redirect: { url: string } }
  condition: { urlFilter: string; resourceTypes: ['main_frame'] }
}

declare const chrome: {
  runtime: {
    id: string
    getURL: (path: string) => string
    onInstalled: { addListener: (callback: () => void) => void }
    onStartup: { addListener: (callback: () => void) => void }
    onMessage: { addListener: (callback: (message: BackgroundMessage, sender: unknown, respond: (response: BackgroundResponse) => void) => boolean) => void }
  }
  management: {
    onEnabled: { addListener: (callback: (extensionInfo: { id: string }) => void) => void }
  }
  storage: { local: { get: (key: string) => Promise<Record<string, unknown>>; set: (items: Record<string, unknown>) => Promise<void> } }
  tabs: {
    query: (queryInfo: Record<string, never>) => Promise<Array<{ id?: number; url?: string }>>
    update: (tabId: number, updateProperties: { url: string }) => Promise<unknown>
  }
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
const BREAK_REMINDER_ALARM = 'focus:break-reminder'
const BREAK_END_ALARM = 'focus:break-end'
const LEGACY_RULE_IDS = [101, 102, 103]
let queue = Promise.resolve()

function enqueue<T>(task: () => Promise<T>) {
  const result = queue.then(task, task)
  queue = result.then(() => undefined, () => undefined)
  return result
}

async function readState(): Promise<ExtensionState> {
  const stored = await chrome.storage.local.get(STORAGE_KEY)
  return normalizeState(stored[STORAGE_KEY])
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

async function redirectOpenBlockedTabs(session: FocusSession) {
  const tabs = await chrome.tabs.query({})
  tabs.forEach((tab) => {
    if (typeof tab.id !== 'number' || !tab.url) return
    const domain = matchBlockedDomain(tab.url, session.blockedDomains)
    if (!domain) return
    void chrome.tabs.update(tab.id, {
      url: chrome.runtime.getURL(`blocked.html?site=${encodeURIComponent(domain)}`),
    }).catch(() => undefined)
  })
}

async function clearAlarms() {
  await Promise.all([
    chrome.alarms.clear(END_ALARM),
    chrome.alarms.clear(BREAK_REMINDER_ALARM),
    chrome.alarms.clear(BREAK_END_ALARM),
  ])
}

async function notifyBreak() {
  await chrome.notifications.create('focus-break-reminder', {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icon-128.png'),
    title: 'Your five-minute break is ready',
    message: 'Open Focus to start it. Protected sites stay blocked.',
    priority: 1,
  })
}

async function recover() {
  const previous = await readState()
  const result = reconcileLifecycle(previous, Date.now())
  const state = result.state
  await clearAlarms()

  if (!state.activeSession) {
    await removeFocusRules()
    await writeState(state)
    return state
  }

  await applyRules(state.activeSession)
  await redirectOpenBlockedTabs(state.activeSession)
  chrome.alarms.create(END_ALARM, { when: state.activeSession.endsAt })
  if (state.activeBreak) chrome.alarms.create(BREAK_END_ALARM, { when: state.activeBreak.endsAt })
  else if (state.nextBreakAt) chrome.alarms.create(BREAK_REMINDER_ALARM, { when: state.nextBreakAt })
  await writeState(state)
  if (result.breakBecameDue) await notifyBreak()
  return state
}

async function handleMessage(message: BackgroundMessage): Promise<ExtensionState> {
  const current = await readState()
  if (message.type === 'START_SESSION') {
    if (current.activeSession && current.activeSession.endsAt > Date.now()) throw new Error('A focus session is already active.')
    const settings = validateSettings(message.settings)
    const startedAt = Date.now()
    const session: FocusSession = { ...settings, id: crypto.randomUUID(), startedAt, endsAt: startedAt + settings.durationMinutes * 60_000 }
    let next: ExtensionState = { ...structuredClone(defaultState), settings, activeSession: session }
    next = { ...next, nextBreakAt: nextBreakTime(next, startedAt) }
    await writeState(next)
    return recover()
  }
  if (message.type === 'START_BREAK') {
    const reconciled = await recover()
    const next = startFixedBreak(reconciled, Date.now())
    await writeState(next)
    return recover()
  }
  if (message.type === 'END_BREAK') {
    return recover()
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
chrome.management.onEnabled.addListener((extensionInfo) => {
  if (extensionInfo.id === chrome.runtime.id) void enqueue(recover)
})
chrome.runtime.onMessage.addListener((message, _sender, respond) => {
  void enqueue(() => handleMessage(message))
    .then((state) => respond({ ok: true, state }))
    .catch((error: unknown) => respond({ ok: false, error: error instanceof Error ? error.message : 'Focus could not update the session.' }))
  return true
})
chrome.alarms.onAlarm.addListener((alarm) => {
  if ([END_ALARM, BREAK_REMINDER_ALARM, BREAK_END_ALARM].includes(alarm.name)) void enqueue(recover)
})

void enqueue(recover)
