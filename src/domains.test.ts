import { describe, expect, it } from 'vitest'
import { matchBlockedDomain } from './domains'

describe('blocked tab matching', () => {
  const blockedDomains = ['youtube.com', 'reddit.com']

  it('matches exact blocked domains and their subdomains', () => {
    expect(matchBlockedDomain('https://youtube.com/watch?v=123', blockedDomains)).toBe('youtube.com')
    expect(matchBlockedDomain('https://m.youtube.com/shorts/123', blockedDomains)).toBe('youtube.com')
  })

  it('does not match lookalike or non-web URLs', () => {
    expect(matchBlockedDomain('https://notyoutube.com/', blockedDomains)).toBeNull()
    expect(matchBlockedDomain('chrome://extensions/', blockedDomains)).toBeNull()
  })
})
