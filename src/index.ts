import type { Component } from 'vue'

import TreeComponent from './index.vue'

export interface VueVirtualTreeRegistrar {
  component(name: string, component: Component): unknown
}

export type VueVirtualTreePlugin = Component & {
  name?: string
  install(appOrVue: VueVirtualTreeRegistrar): void
}

const VueVirtualTree: VueVirtualTreePlugin = Object.assign(TreeComponent, {
  install(appOrVue: VueVirtualTreeRegistrar) {
    appOrVue.component(TreeComponent.name || 'VueVirtualTree', TreeComponent)
  },
})

export { VueVirtualTree }
export default VueVirtualTree
