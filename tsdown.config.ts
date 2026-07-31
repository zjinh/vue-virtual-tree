import vue2 from '@vitejs/plugin-vue2'
import { defineConfig } from 'tsdown'
import Vue from 'unplugin-vue/rolldown'
import * as vue2Compiler from 'vue2/compiler-sfc'

type Vue2PluginOptions = NonNullable<Parameters<typeof vue2>[0]>
// Vue 2 compiler types differ from the root Vue 3 compiler types even though
// @vitejs/plugin-vue2 accepts this aliased Vue 2 compiler at runtime.
const vue2CompilerForPlugin = vue2Compiler as unknown as NonNullable<
  Vue2PluginOptions['compiler']
>

const shared = {
  entry: {
    index: 'src/index.ts',
  },
  format: 'esm' as const,
  platform: 'neutral' as const,
  target: 'es2020',
  dts: false,
  deps: {
    neverBundle: ['vue'],
    onlyImport: ['vue'],
  },
  css: {
    fileName: 'style.css',
  },
}

export default defineConfig([
  {
    ...shared,
    outDir: 'dist/vue2',
    clean: true,
    plugins: [vue2({ compiler: vue2CompilerForPlugin })],
  },
  {
    ...shared,
    outDir: 'dist/vue3',
    clean: true,
    plugins: [Vue({ isProduction: true })],
  },
])
