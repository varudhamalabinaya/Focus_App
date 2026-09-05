const DOMAIN_PATTERN = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i

export function normalizeDomain(value: string): string | null {
  const trimmed = value.trim().toLowerCase()
  if (!trimmed) return null

  try {
    const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    const url = new URL(candidate)
    const hostname = url.hostname.replace(/^www\./, '').replace(/\.$/, '')
    if (!DOMAIN_PATTERN.test(hostname)) return null
    return hostname
  } catch {
    return null
  }
}

export function displayDomain(domain: string) {
  return domain.replace(/^www\./, '')
}
