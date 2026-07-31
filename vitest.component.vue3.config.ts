import Vue from 'unplugin-vue/vite'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  define: {
    __VUE_RUNTIME__: JSON.stringify('vue3'),
  },
  plugins: [Vue({ isProduction: false })],
  test: {
    environment: 'jsdom',
    include: ['tests/component/runtime.test.ts'],
    setupFiles: ['tests/component/setup.ts'],
  },
})
