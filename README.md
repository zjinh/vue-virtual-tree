[English](./README.md) | [简体中文](./README.zh-CN.md)

# @zjinh/vue-virtual-tree

[![npm version](https://img.shields.io/npm/v/%40zjinh%2Fvue-virtual-tree)](https://www.npmjs.com/package/@zjinh/vue-virtual-tree)

<!-- section:about -->

A fixed-row-height virtual tree for Vue 2.7 and Vue 3. It handles large trees by mounting only the rows inside the viewport, while keeping checkbox selection, current-node state, filtering, lazy loading, mutation methods, and custom row content in one API.

The package is ESM. The default entry targets Vue 3; Vue 2.7 has a separate entry. Import the shared styles from `@zjinh/vue-virtual-tree/style.css`.

<!-- section:compatibility -->
## Compatibility

| Runtime | Supported version | Import |
| --- | --- | --- |
| Vue 2 | Vue 2.7.x only | `@zjinh/vue-virtual-tree/vue2` |
| Vue 3 | Vue 3 >= 3.2 | `@zjinh/vue-virtual-tree` or `@zjinh/vue-virtual-tree/vue3` |

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

Install Vue 2.7.x when using `/vue2`, or Vue 3 >= 3.2 when using the default or `/vue3` entry.

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

The explicit Vue 3 import is also available:

```ts
import VueVirtualTree from '@zjinh/vue-virtual-tree/vue3'
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

Use the Vue 2.7 entry in `main.ts`:

```ts
import Vue from 'vue'
import VueVirtualTree from '@zjinh/vue-virtual-tree/vue2'
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

For local registration, import from `/vue2` and add `components: { VueVirtualTree }`.

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
