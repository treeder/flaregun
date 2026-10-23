import { describe, it, expect } from 'vitest'
import { hostname, hostURL, domainLevels } from '../utils.js'

describe('utils', () => {
  describe('hostname', () => {
    it('extracts hostname from host header', () => {
      const c = { request: { headers: new Headers({ host: 'example.com:8787' }) } }
      expect(hostname(c)).toBe('example.com')
    })

    it('extracts hostname from x-forwarded-host header if present on local/internal host', () => {
      const c = {
        request: {
          headers: new Headers({
            host: 'internal.local',
            'x-forwarded-host': 'myapp.workers.dev',
          }),
        },
      }
      expect(hostname(c)).toBe('myapp.workers.dev')
    })

    it('ignores spoofed x-forwarded-host header on production host or when host header is missing', () => {
      const c = {
        request: {
          headers: new Headers({
            host: 'myapp.workers.dev',
            'x-forwarded-host': 'evil.attacker.com',
          }),
        },
      }
      expect(hostname(c)).toBe('myapp.workers.dev')
      expect(hostURL(c)).toBe('https://myapp.workers.dev')

      const cMissingHost = {
        request: {
          headers: new Headers({
            'x-forwarded-host': 'evil.attacker.com',
          }),
        },
      }
      expect(hostname(cMissingHost)).toBeNull()
    })

    it('preserves bracketed IPv6 localhost with port', () => {
      const c = {
        request: {
          headers: new Headers({
            host: '[::1]:8787',
          }),
        },
      }
      expect(hostname(c)).toBe('[::1]')
      expect(hostURL(c)).toBe('http://[::1]:8787')
    })

    it('does not treat localhost subdomain as http localhost', () => {
      const c = {
        request: {
          headers: new Headers({
            host: 'localhost.attacker.com',
          }),
        },
      }
      expect(hostURL(c)).toBe('https://localhost.attacker.com')
    })
  })

  describe('hostURL', () => {
    it('returns http URL with port for localhost', () => {
      const c = { request: { headers: new Headers({ host: 'localhost:8787' }) } }
      expect(hostURL(c)).toBe('http://localhost:8787')
    })

    it('returns https URL for production host', () => {
      const c = { request: { headers: new Headers({ host: 'example.com' }) } }
      expect(hostURL(c)).toBe('https://example.com')
    })
  })

  describe('domainLevels', () => {
    it('returns 3 for *.workers.dev', () => {
      const c = { request: { headers: new Headers({ host: 'my-project.workers.dev' }) } }
      expect(domainLevels(c)).toBe(3)
    })

    it('returns 3 for *.pages.dev', () => {
      const c = { request: { headers: new Headers({ host: 'my-project.pages.dev' }) } }
      expect(domainLevels(c)).toBe(3)
    })

    it('returns 2 for standard custom domains', () => {
      const c = { request: { headers: new Headers({ host: 'app.example.com' }) } }
      expect(domainLevels(c)).toBe(2)
    })

    it('returns 2 for apex custom domains', () => {
      const c = { request: { headers: new Headers({ host: 'example.com' }) } }
      expect(domainLevels(c)).toBe(2)
    })

    it('returns 2 for localhost', () => {
      const c = { request: { headers: new Headers({ host: 'localhost:8787' }) } }
      expect(domainLevels(c)).toBe(2)
    })
  })
})
