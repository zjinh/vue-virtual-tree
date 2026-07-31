import Vue from 'vue'
import VueVirtualTree from '@zjinh/vue-virtual-tree/vue2'
import '@zjinh/vue-virtual-tree/style.css'

import App from '../../shared/App.vue'

Vue.use(VueVirtualTree)

new Vue({
  render: (createElement) => createElement(App),
}).$mount('#app')
