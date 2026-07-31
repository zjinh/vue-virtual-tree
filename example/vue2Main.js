import Vue from 'vue'
import App from './App.vue'

import VueEasyTree from "../src/index.vue";
Vue.component('VueVirtualTree', VueEasyTree)

new Vue({
    el: '#app',
    render: h => h(App)
})
