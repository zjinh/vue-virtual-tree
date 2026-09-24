import { describe, expect, it } from 'vitest'
import { JSDOM } from 'jsdom'
import { readFileSync } from 'node:fs'

const source = () => readFileSync(new URL('../../examples/shared/locale.js', import.meta.url), 'utf8')
const setup = (language: string, stored?: string, blocked = false) => {
  const dom = new JSDOM('', { url: 'https://example.com/', runScripts: 'outside-only' })
  Object.defineProperty(dom.window.navigator, 'language', { value: language })
  if (stored) dom.window.localStorage.setItem('vue-virtual-tree:locale', stored)
  if (blocked) Object.defineProperty(dom.window, 'localStorage', { get() { throw new Error('denied') } })
  dom.window.eval(source().replace('export const demoLocale', 'const demoLocale'))
  return dom
}

describe('demo language preference', () => {
  it('uses a saved language before the browser language and persists changes', () => {
    const dom = setup('zh-CN', 'en')
    try {
      const locale = dom.window.TreeDemoLocale
      expect(locale.read()).toBe('en')
      locale.save('zh')
      expect(locale.read()).toBe('zh')
      expect(dom.window.localStorage.getItem('vue-virtual-tree:locale')).toBe('zh')
    } finally { dom.window.close() }
  })
  it('ignores invalid preferences and handles unavailable storage', () => {
    for (const [language, saved, blocked, expected] of [
      ['zh-TW', 'invalid', false, 'zh'], ['fr-FR', undefined, false, 'en'],
      ['zh-CN', undefined, true, 'zh'],
    ] as const) {
      const dom = setup(language, saved, blocked)
      try {
        expect(dom.window.TreeDemoLocale.read()).toBe(expected)
        expect(() => dom.window.TreeDemoLocale.save('en')).not.toThrow()
      } finally { dom.window.close() }
    }
  })
})
