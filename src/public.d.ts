import type { Component } from 'vue'

export interface VueVirtualTreeRegistrar {
  component(name: string, component: Component): unknown
}

export type VueVirtualTreePlugin = Component & {
  name?: string
  install(appOrVue: VueVirtualTreeRegistrar): void
}

export declare const VueVirtualTree: VueVirtualTreePlugin
export default VueVirtualTree
