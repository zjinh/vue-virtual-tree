export type Locale = 'zh' | 'en'
declare global {
  interface Window {
    TreeDemoLocale: {
      key: string
      read(): Locale
      save(locale: Locale): void
    }
  }
}

export const demoLocale: Window['TreeDemoLocale']
