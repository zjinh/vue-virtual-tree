declare const __DEMO_RUNTIME__: 'Vue 2.7' | 'Vue 3'

declare module '*.vue' {
  import type { Component } from 'vue'

  const component: Component
  export default component
}
