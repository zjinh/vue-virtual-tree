import { resolve } from 'path';
import type { UserConfig } from 'vite';
import vue3 from '@vitejs/plugin-vue';
import vue2 from '@vitejs/plugin-vue2';
export default function (config) {
  return {
    build: {
      lib: {
        entry: resolve(__dirname, 'src/index.js'),
        name: 'index',
        fileName: 'index',
        cssFileName: 'index',
        formats: ['es'],
      },
      rollupOptions: {
        input: config.mode.includes('vue')?undefined:resolve(__dirname, '/examples/index.html'),
        external: ['vue', 'vuex', 'vue-router', ],
        output: {
          dir: `dist/${config.mode}`,
          globals: {
            vue: 'Vue',
            vuex: 'Vuex',
          },
        },
      },
    },
    plugins: [
      config.mode.includes('2') ? vue2() : vue3(),
    ],
  } as UserConfig;
}

