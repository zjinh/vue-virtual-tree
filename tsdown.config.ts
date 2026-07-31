import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'

import vue2 from '@vitejs/plugin-vue2'
import { defineConfig } from 'tsdown'
import Vue from 'unplugin-vue/rolldown'
import * as vue2Compiler from 'vue2/compiler-sfc'

type Vue2PluginOptions = NonNullable<Parameters<typeof vue2>[0]>
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

const completedBuilds = new Set<string>()
let cleanedPublicFiles = false

function publishContract(target: 'vue2' | 'vue3') {
  return {
    name: `publish-contract:${target}`,
    buildStart() {
      if (cleanedPublicFiles) return

      cleanedPublicFiles = true
      rmSync('dist/index.d.ts', { force: true })
      rmSync('dist/style.css', { force: true })
    },
    closeBundle() {
      completedBuilds.add(target)
      if (completedBuilds.size !== 2) return

      const vue2Css = readFileSync('dist/vue2/style.css', 'utf8')
      const vue3Css = readFileSync('dist/vue3/style.css', 'utf8')

      mkdirSync('dist', { recursive: true })
      copyFileSync('src/public.d.ts', 'dist/index.d.ts')
      writeFileSync('dist/style.css', `${vue2Css}\n${vue3Css}`)
    },
  }
}

export default defineConfig([
  {
    ...shared,
    outDir: 'dist/vue2',
    clean: true,
    plugins: [vue2({ compiler: vue2CompilerForPlugin }), publishContract('vue2')],
  },
  {
    ...shared,
    outDir: 'dist/vue3',
    clean: true,
    plugins: [Vue({ isProduction: true }), publishContract('vue3')],
  },
])
