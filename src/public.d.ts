import type { DefineComponent } from 'vue'

export interface VueVirtualTreeRegistrar {
  component(name: string, component: unknown): unknown
}

export type VueVirtualTreeComponent = DefineComponent<
  Record<string, unknown>,
  Record<string, unknown>,
  unknown
> & {
  install(appOrVue: VueVirtualTreeRegistrar): void
}

export declare const VueVirtualTree: VueVirtualTreeComponent
export default VueVirtualTree
