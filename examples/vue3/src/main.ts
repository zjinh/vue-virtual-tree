import { createApp } from 'vue'
import VueVirtualTree from '@zjinh/vue-virtual-tree/vue3'
import '@zjinh/vue-virtual-tree/style.css'

import App from '../../shared/App.vue'

createApp(App)
  .component('VueVirtualTree', VueVirtualTree)
  .mount('#app')
