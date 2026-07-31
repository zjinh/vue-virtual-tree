import vue2 from '@vitejs/plugin-vue2'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import * as vue2Compiler from 'vue2/compiler-sfc'

type Vue2PluginOptions = NonNullable<Parameters<typeof vue2>[0]>
const compiler = vue2Compiler as unknown as NonNullable<
  Vue2PluginOptions['compiler']
>

export default defineConfig({
  define: {
    __DEMO_RUNTIME__: JSON.stringify('Vue 2.7'),
    __VUE_RUNTIME__: JSON.stringify('vue2'),
  },
  plugins: [vue2({ compiler })],
  resolve: {
    alias: {
      vue: fileURLToPath(
        new URL('./node_modules/vue2/dist/vue.runtime.esm.js', import.meta.url),
      ),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/component/runtime.test.ts'],
    setupFiles: ['tests/component/setup.ts'],
  },
})
