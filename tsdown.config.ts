import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: { index: 'src/index.ts' },
  outDir: 'dist',
  format: 'esm',
  platform: 'neutral',
  target: 'es2020',
  clean: true,
  dts: false,
  deps: {
    neverBundle: ['vue'],
    onlyImport: ['vue'],
  },
  css: { fileName: 'style.css' },
})
