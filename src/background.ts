declare const chrome: {
  runtime: {
    onInstalled: { addListener: (callback: () => void) => void }
    onStartup: { addListener: (callback: () => void) => void }
    onMessage: { addListener: (callback: (message: Message) => void) => void }
    getURL: (path: string) => string
  }
  declarativeNetRequest: {
    updateDynamicRules: (update: { removeRuleIds: number[]; addRules: Rule[] }) => Promise<void>
  }
  alarms: {
    create: (name: string, options: { when: number }) => void
    onAlarm: { addListener: (callback: (alarm: { name: string }) => void) => void }
  }
  storage: {
    local: {
      get: (keys: string[]) => Promise<{ activeExceptions?: Record<string, number>; enabledSites?: string[] }>
      set: (items: { activeExceptions?: Record<string, number>; enabledSites?: string[] }) => Promise<void>
    }
  }
}

interface Message { type: 'TEMPORARY_ACCESS' | 'SYNC_RULES'; site?: string; durationMinutes?: number; enabledSites?: string[] }
interface Rule {
  id: number
  priority: number
  action: { type: 'redirect'; redirect: { url: string } }
  condition: { urlFilter: string; resourceTypes: string[] }
}

const siteRules = [
  { id: 101, site: 'YouTube', filter: '||youtube.com' },
  { id: 102, site: 'Instagram', filter: '||instagram.com' },
  { id: 103, site: 'Reddit', filter: '||reddit.com' },
]

function ruleFor(site: typeof siteRules[number]): Rule {
  return {
    id: site.id,
    priority: 1,
    action: { type: 'redirect', redirect: { url: chrome.runtime.getURL(`blocked.html?site=${encodeURIComponent(site.site)}`) } },
    condition: { urlFilter: site.filter, resourceTypes: ['main_frame'] },
  }
}

const allSiteNames = siteRules.map((site) => site.site)
let operationQueue = Promise.resolve()

function enqueue(operation: () => Promise<void>) {
  operationQueue = operationQueue.then(operation, operation)
}

async function syncRules() {
  const stored = await chrome.storage.local.get(['activeExceptions', 'enabledSites'])
  const now = Date.now()
  const activeExceptions = Object.fromEntries(
    Object.entries(stored.activeExceptions ?? {}).filter(([, expiresAt]) => expiresAt > now),
  )
  const enabledSites = stored.enabledSites ?? allSiteNames
  await chrome.storage.local.set({ activeExceptions, enabledSites })
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: siteRules.map((site) => site.id),
    addRules: siteRules
      .filter((site) => enabledSites.includes(site.site) && !activeExceptions[site.site])
      .map(ruleFor),
  })
}

chrome.runtime.onInstalled.addListener(() => { enqueue(syncRules) })
chrome.runtime.onStartup.addListener(() => { enqueue(syncRules) })
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'SYNC_RULES' && message.enabledSites) {
    enqueue(async () => {
      await chrome.storage.local.set({ enabledSites: message.enabledSites })
      await syncRules()
    })
  }
  if (message.type === 'TEMPORARY_ACCESS' && message.site && message.durationMinutes) {
    enqueue(async () => {
      const { activeExceptions = {} } = await chrome.storage.local.get(['activeExceptions'])
      const expiresAt = Date.now() + message.durationMinutes! * 60_000
      const nextExpiry = Math.max(activeExceptions[message.site!] ?? 0, expiresAt)
      await chrome.storage.local.set({ activeExceptions: { ...activeExceptions, [message.site!]: nextExpiry } })
      chrome.alarms.create(`restore:${message.site}:${nextExpiry}`, { when: nextExpiry })
      await syncRules()
    })
  }
})
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name.startsWith('restore:')) enqueue(syncRules)
})
