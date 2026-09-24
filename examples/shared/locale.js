/* Shared by the standalone demos and the Pages launcher. */
export const demoLocale = (() => {
  const key = 'vue-virtual-tree:locale'
  const valid = value => value === 'zh' || value === 'en'
  return window.TreeDemoLocale = {
    key,
    read() {
      try {
        const saved = window.localStorage.getItem(key)
        if (valid(saved)) return saved
      } catch { /* The demo also works when storage is unavailable. */ }
      return /^zh\b/i.test(window.navigator.language) ? 'zh' : 'en'
    },
    save(locale) {
      if (!valid(locale)) return
      try { window.localStorage.setItem(key, locale) } catch { /* Keep the current page usable. */ }
    },
  }
})();
