import { createApp } from 'vue'
import VueVirtualTree from '@zjinh/vue-virtual-tree/vue3'
import '@zjinh/vue-virtual-tree/style.css'

import App from '../../shared/App.vue'

createApp(App)
  .component('VueVirtualTree', VueVirtualTree)
  .mount('#app')

if (window.parent !== window) {
  window.parent.postMessage(
    {
      source: '@zjinh/vue-virtual-tree/demo',
      type: 'ready',
      runtime: 'vue3',
      generation: new URLSearchParams(window.location.search).get('generation'),
    },
    window.location.origin,
  )
}
