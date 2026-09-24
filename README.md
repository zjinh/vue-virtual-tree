[English](./README.md) | [简体中文](./README.zh-CN.md)

# @zjinh/vue-virtual-tree

[![npm version](https://img.shields.io/npm/v/%40zjinh%2Fvue-virtual-tree)](https://www.npmjs.com/package/@zjinh/vue-virtual-tree)

<!-- section:about -->

A fixed-row-height virtual tree for Vue 2.7 and Vue 3. It handles large trees by mounting only the rows inside the viewport, while keeping checkbox selection, current-node state, filtering, lazy loading, mutation methods, and custom row content in one API.

The package is ESM. Vue 2.7 and Vue 3 use the same `@zjinh/vue-virtual-tree` entry. Import the shared styles from `@zjinh/vue-virtual-tree/style.css`.

<!-- section:compatibility -->
## Compatibility

| Runtime | Supported version | Import |
| --- | --- | --- |
| Vue 2 | Vue 2.7.x only | `@zjinh/vue-virtual-tree` |
| Vue 3 | Vue 3 >= 3.2 | `@zjinh/vue-virtual-tree` |

Vue 2.6 is not supported. The package exposes one component entry: `@zjinh/vue-virtual-tree`. The `/vue2` and `/vue3` package subpaths have been removed. No `vue-demi` installation or version-switching script is needed.

<!-- section:demos -->
## Online demos

- [Workbench](https://zjinh.github.io/vue-virtual-tree/)
- [Vue 2.7 demo](https://zjinh.github.io/vue-virtual-tree/vue2/)
- [Vue 3 demo](https://zjinh.github.io/vue-virtual-tree/vue3/)

<!-- section:installation -->
## Install

Choose one package manager:

```sh
pnpm add @zjinh/vue-virtual-tree
```

```sh
npm install @zjinh/vue-virtual-tree
```

```sh
yarn add @zjinh/vue-virtual-tree
```

Install Vue 2.7.x or Vue 3 >= 3.2 in your application, then use the root entry in either version.

<!-- section:vue3 -->
## Vue 3 quick start

Register the component in `main.ts`:

```ts
import { createApp } from 'vue'
import VueVirtualTree from '@zjinh/vue-virtual-tree'
import '@zjinh/vue-virtual-tree/style.css'
import App from './App.vue'

createApp(App).use(VueVirtualTree).mount('#app')
```

Then render a tree:

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

For local registration, import the same component and add `components: { VueVirtualTree }`.

<!-- section:vue2 -->
## Vue 2.7 quick start

Use the same root entry in `main.ts`:

```ts
import Vue from 'vue'
import VueVirtualTree from '@zjinh/vue-virtual-tree'
import '@zjinh/vue-virtual-tree/style.css'
import App from './App.vue'

Vue.use(VueVirtualTree)
new Vue({ render: (h) => h(App) }).$mount('#app')
```

The component works with the Vue 2.7 Options API:

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

For local registration, import the same component and add `components: { VueVirtualTree }`.

<!-- section:documentation -->
## More documentation

- [Usage guide](https://github.com/zjinh/vue-virtual-tree/blob/main/docs/guide.md): sizing, large data, checkbox and current state, filtering, lazy loading, slots, and ref methods.
- [API reference](https://github.com/zjinh/vue-virtual-tree/blob/main/docs/api.md): props, methods, events, slot values, exported types, and runtime constraints.

<!-- section:development -->
## Development

```sh
pnpm install --frozen-lockfile
pnpm run dev:vue2
pnpm run dev:vue3
pnpm test
pnpm run build
```

<!-- section:license -->
## License

[MIT](./LICENSE)
