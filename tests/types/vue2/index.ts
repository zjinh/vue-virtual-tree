import Vue from 'vue'
import type { Component } from 'vue'
import VueVirtualTree, {
  VueVirtualTree as NamedVueVirtualTree,
  type VueVirtualTreePlugin,
  type VueVirtualTreeRegistrar,
} from '@zjinh/vue-virtual-tree/vue2'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends
    (<Value>() => Value extends Right ? 1 : 2)
    ? true
    : false
type Assert<Value extends true> = Value
type RegistrarComponentMatches = Assert<
  Equal<Parameters<VueVirtualTreeRegistrar['component']>[1], Component>
>
type InstallRegistrarMatches = Assert<
  Equal<Parameters<VueVirtualTreePlugin['install']>[0], VueVirtualTreeRegistrar>
>
type DefaultExportMatchesPlugin = Assert<Equal<typeof VueVirtualTree, VueVirtualTreePlugin>>

const plugin: VueVirtualTreePlugin = VueVirtualTree
const namedPlugin: typeof VueVirtualTree = NamedVueVirtualTree
const registrar: VueVirtualTreeRegistrar = Vue

plugin.install(registrar)
registrar.component('LocalTree', namedPlugin)
Vue.use(plugin)

export type {
  DefaultExportMatchesPlugin,
  InstallRegistrarMatches,
  RegistrarComponentMatches,
}
