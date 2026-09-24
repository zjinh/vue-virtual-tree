import Vue from 'unplugin-vue/vite'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  define: {
    __DEMO_RUNTIME__: JSON.stringify('Vue 3'),
    __VUE_RUNTIME__: JSON.stringify('vue3'),
  },
  plugins: [Vue({ isProduction: false })],
  test: {
    environment: 'jsdom',
    include: ['tests/component/**/*.test.ts'],
    setupFiles: ['tests/component/setup.ts'],
  },
})
