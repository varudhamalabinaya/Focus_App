declare const chrome: {
  runtime?: {
    id?: string
    sendMessage: (message: unknown) => Promise<unknown>
  }
}

const isExtension = typeof chrome !== 'undefined' && Boolean(chrome.runtime?.id)

export async function setTemporaryAccess(site: string, durationMinutes: number) {
  if (!isExtension) return
  await chrome.runtime?.sendMessage({ type: 'TEMPORARY_ACCESS', site, durationMinutes })
}

export async function syncBlockingRules(enabledSites: string[]) {
  if (!isExtension) return
  await chrome.runtime?.sendMessage({ type: 'SYNC_RULES', enabledSites })
}

export function extensionMode() {
  return isExtension
}
