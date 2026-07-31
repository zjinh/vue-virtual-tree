import {createApp} from 'vue'
import App from './App.vue'

import VueEasyTree from "../src/index.vue";

window.__VUE_PROD_DEVTOOLS__ = false;
window.__VUE_PROD_HYDRATION_MISMATCH_DETAILS__ = false;
let app=createApp(App)
app.component('VueVirtualTree',VueEasyTree)
app.mount('#app')

