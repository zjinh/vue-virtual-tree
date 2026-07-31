import type { Component } from 'vue'

import TreeComponent from './index.vue'

interface ComponentRegistrar {
  component(name: string, component: Component): unknown
}

export type VueVirtualTreePlugin = Component & {
  name?: string
  install(appOrVue: ComponentRegistrar): void
}

const VueVirtualTree = TreeComponent as VueVirtualTreePlugin

VueVirtualTree.install = (appOrVue) => {
  appOrVue.component(VueVirtualTree.name || 'VueVirtualTree', VueVirtualTree)
}

export { VueVirtualTree }
export default VueVirtualTree
