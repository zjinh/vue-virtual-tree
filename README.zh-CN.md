[English](./README.md) | [简体中文](./README.zh-CN.md)

# @zjinh/vue-virtual-tree

[![npm version](https://img.shields.io/npm/v/%40zjinh%2Fvue-virtual-tree)](https://www.npmjs.com/package/@zjinh/vue-virtual-tree)

<!-- section:about -->

一个同时支持 Vue 2.7 与 Vue 3 的固定行高虚拟树组件。它通过只挂载视口内的行来处理大规模树数据，并提供复选、当前节点、过滤、懒加载、数据修改方法和自定义行内容等常用能力。

包格式为 ESM。Vue 2.7 与 Vue 3 都使用 `@zjinh/vue-virtual-tree` 根入口。公共样式从 `@zjinh/vue-virtual-tree/style.css` 导入。

<!-- section:compatibility -->
## 兼容性

| 运行时 | 支持版本 | 导入入口 |
| --- | --- | --- |
| Vue 2 | 仅 Vue 2.7.x | `@zjinh/vue-virtual-tree` |
| Vue 3 | Vue 3 >= 3.2 | `@zjinh/vue-virtual-tree` |

不支持 Vue 2.6。组件仅提供 `@zjinh/vue-virtual-tree` 一个入口，已移除 `/vue2` 和 `/vue3` 包子路径。无需安装 `vue-demi` 或运行版本切换脚本。

<!-- section:demos -->
## 在线演示

- [Workbench](https://zjinh.github.io/vue-virtual-tree/)
- [Vue 2.7 演示](https://zjinh.github.io/vue-virtual-tree/vue2/)
- [Vue 3 演示](https://zjinh.github.io/vue-virtual-tree/vue3/)

<!-- section:installation -->
## 安装

选择一种包管理器：

```sh
pnpm add @zjinh/vue-virtual-tree
```

```sh
npm install @zjinh/vue-virtual-tree
```

```sh
yarn add @zjinh/vue-virtual-tree
```

在应用中安装 Vue 2.7.x 或 Vue 3 >= 3.2，两个版本均使用根入口。

<!-- section:vue3 -->
## Vue 3 快速开始

在 `main.ts` 中注册组件：

```ts
import { createApp } from 'vue'
import VueVirtualTree from '@zjinh/vue-virtual-tree'
import '@zjinh/vue-virtual-tree/style.css'
import App from './App.vue'

createApp(App).use(VueVirtualTree).mount('#app')
```

然后渲染一棵树：

```vue
<script setup lang="ts">
interface DemoNode {
  id: number
  label: string
  children?: DemoNode[]
}

const data: DemoNode[] = [{
  id: 1,
  label: 'Root',
  children: [
    { id: 2, label: 'First child' },
    { id: 3, label: 'Second child' },
  ],
}]
</script>

<template>
  <VueVirtualTree
    :data="data"
    :height="320"
    node-key="id"
    :default-expanded-keys="[1]"
  ></VueVirtualTree>
</template>
```

如果要局部注册，导入同一组件并添加 `components: { VueVirtualTree }`。

<!-- section:vue2 -->
## Vue 2.7 快速开始

在 `main.ts` 中使用同一个根入口：

```ts
import Vue from 'vue'
import VueVirtualTree from '@zjinh/vue-virtual-tree'
import '@zjinh/vue-virtual-tree/style.css'
import App from './App.vue'

Vue.use(VueVirtualTree)
new Vue({ render: (h) => h(App) }).$mount('#app')
```

组件可以配合 Vue 2.7 Options API 使用：

```vue
<script lang="ts">
interface DemoNode {
  id: number
  label: string
  children?: DemoNode[]
}

export default {
  data(): { data: DemoNode[] } {
    return {
      data: [{
        id: 1,
        label: 'Root',
        children: [{ id: 2, label: 'Child' }],
      }],
    }
  },
}
</script>

<template>
  <VueVirtualTree
    :data="data"
    :height="320"
    node-key="id"
  ></VueVirtualTree>
</template>
```

如果要局部注册，请导入同一个组件并添加 `components: { VueVirtualTree }`。

<!-- section:documentation -->
## 详细文档

- [使用指南](https://github.com/zjinh/vue-virtual-tree/blob/main/docs/guide.zh-CN.md)：尺寸设置、大数据、复选与当前节点、过滤、懒加载、slot 和 ref 方法。
- [API 参考](https://github.com/zjinh/vue-virtual-tree/blob/main/docs/api.zh-CN.md)：props、方法、事件、slot 参数、导出类型和运行限制。

<!-- section:development -->
## 开发

```sh
pnpm install --frozen-lockfile
pnpm run dev:vue2
pnpm run dev:vue3
pnpm test
pnpm run build
```

<!-- section:license -->
## 许可证

[MIT](./LICENSE)
