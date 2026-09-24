import Vue from 'vue'
import VueVirtualTree from '@zjinh/vue-virtual-tree'
import '@zjinh/vue-virtual-tree/style.css'

import App from '../../shared/App.vue'

Vue.use(VueVirtualTree)

new Vue({
  render: (createElement) => createElement(App),
}).$mount('#app')

if (window.parent !== window) {
  window.parent.postMessage(
    {
      source: '@zjinh/vue-virtual-tree/demo',
      type: 'ready',
      runtime: 'vue2',
      generation: new URLSearchParams(window.location.search).get('generation'),
    },
    window.location.origin,
  )
}
