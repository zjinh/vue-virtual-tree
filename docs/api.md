[English](./api.md) | [简体中文](./api.zh-CN.md) | [README](../README.md)

# API reference

The default entry and `/vue3` expose the Vue 3 build. Import the Vue 2.7 build from `/vue2`. Both builds use the contracts on this page.

For complete working examples, see the [usage guide](./guide.md).

<!-- section:props -->
## Props

The public component contract contains 21 supported props.

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `data` | `T[]` | not set | Tree data. When omitted, the component uses an empty array internally. |
| `emptyText` | `string` | `暂无数据` | Text shown when no node is visible. |
| `nodeKey` | `TreeNodeKey<T>` | not set | Unique string or number field. It is read when the store initializes and is required by the key-dependent methods noted below. |
| `checkStrictly` | `boolean` | `false` | Stops parent and child checkbox propagation. Runtime changes update the store. |
| `defaultExpandAll` | `boolean` | `false` | Expands nodes during initialization; remount to change this initialization option. |
| `checkDescendants` | `boolean` | `false` | Initialization option controlling descendant checking around lazy loading. |
| `selectChildrenOnly` | `boolean` | `false` | Adds leaf-selection behavior and leaf results to the `check` state. Configure it before mounting. |
| `itemSize` | `number` | `26` | Fixed row height in pixels; it must be greater than zero. |
| `autoExpandParent` | `boolean` | `true` | Initialization option that expands ancestors of default expanded keys. |
| `defaultCheckedKeys` | `TreeKey[]` | not set | Initial checked keys; omitted values are treated as an empty array internally and require `nodeKey`. Replacing this prop after mount checks keys in the new array but does not uncheck removed keys. Use `setCheckedKeys()` to replace the checked set. |
| `defaultExpandedKeys` | `TreeKey[]` | not set | Initial expanded keys; omitted values are treated as an empty array internally and require `nodeKey`. Replacing this prop after mount expands keys in the new array, and their ancestors when `autoExpandParent` is enabled, but does not collapse removed keys. Call `getNode(key)?.collapse()` to close nodes that must no longer be expanded. |
| `currentNodeKey` | `TreeKey` | not set | Initial current key. Requires `nodeKey`; use a method for later changes. |
| `showCheckbox` | `boolean` | `false` | Renders built-in checkboxes when the built-in row content is used. |
| `props` | `TreeOptionProps<T>` | children / label / disabled | Initialization mapping for `children`, `label`, `disabled`, and `isLeaf`; each mapping may be a field name or getter. |
| `lazy` | `boolean` | `false` | Initialization option enabling on-demand child loading. |
| `highlightCurrent` | `boolean` | `false` | Controls the current row style; it does not disable current state. |
| `load` | `LoadFunction<T>` | not set | Initialization-time lazy loader used when `lazy` is true. |
| `filterNodeMethod` | `FilterFunction<T>` | not set | Predicate required before calling `filter()`; remount after replacing the function. |
| `indent` | `number` | `18` | Indentation step in pixels for built-in rows. |
| `iconClass` | `string` | not set | Custom class for the built-in expand icon. |
| `height` | `string \| number` | `100%` | Virtual-list height. Percentage values need a sized parent. Numeric values are pixels. |

`renderContent` remains only as an unsupported compatibility placeholder:

| Prop | Type | Status | Replacement |
| --- | --- | --- | --- |
| `renderContent` | `never` | deprecated and unsupported | Use the default scoped slot. |

No other component props are part of `VueVirtualTreeProps<T>`. In particular, drag, accordion, and click-to-expand options are not public component props.

<!-- section:methods -->
## Methods

All 23 methods are exposed by `VueVirtualTreeInstance<T>`.

1. `filter<Value = unknown>(value: Value): void` applies `filterNodeMethod`. It throws when that prop is absent.
2. `scrollToItem(key: TreeKey, levelStepPadding?: number, animation?: boolean): void` schedules scrolling to a currently flattened visible item. The optional values default to `18` and `false`. Matching requires `nodeKey`; the method returns before its asynchronous positioning finishes. An empty tree or falsy height causes an error.
3. `getNodePath(data: TreeNodeReference<T>): T[]` returns root-to-node raw data, returns `[]` for an unknown reference, and throws when `nodeKey` is absent.
4. `getCheckedNodes(leafOnly?: boolean, includeHalfChecked?: boolean): T[]` returns checked data. Both flags default to `false`.
5. `getCheckedKeys(leafOnly?: boolean): Array<TreeKey | undefined>` maps checked data through `nodeKey`; without a configured key an entry can be `undefined`.
6. `getCurrentNode(): T | null` returns current raw data or `null`.
7. `getCurrentKey(): TreeKey | null` returns the current key or `null` and throws when `nodeKey` is absent.
8. `setCheckedNodes(nodes: T[], leafOnly?: boolean): void` replaces checkbox selection from raw data and requires `nodeKey`.
9. `setCheckedKeys(keys: TreeKey[], leafOnly?: boolean): void` replaces checkbox selection from keys and requires `nodeKey`.
10. `setChecked(data: TreeNodeReference<T>, checked: boolean, deep?: boolean): void` changes one resolved node; an unknown reference is ignored.
11. `setCheckedAll(checked?: boolean): void` requires `nodeKey`; without it the method is a no-op. It changes all registered nodes, and `checked` defaults to `true`.
12. `getHalfCheckedNodes(): T[]` returns indeterminate-node data.
13. `getHalfCheckedKeys(): Array<TreeKey | undefined>` returns indeterminate-node keys.
14. `getSelectedLeafNodes(): T[]` returns selected leaf data. Outside `selectChildrenOnly` mode it is equivalent to checked leaf nodes.
15. `getSelectedLeafKeys(): Array<TreeKey | undefined>` returns selected leaf keys.
16. `setCurrentNode(node: T): void` makes existing raw data current and requires `nodeKey`; pass data already present in the tree.
17. `setCurrentKey(key: TreeKey | null): void` sets an existing key current or clears current state with `null`; it requires `nodeKey`.
18. `getNode(data: TreeNodeReference<T>): Node<T> | null` resolves a key, raw data object, or `Node<T>` and returns `null` when unresolved.
19. `remove(data: TreeNodeReference<T>): void` removes a resolved node; an unknown reference is ignored.
20. `append(data: T, parentNode?: TreeNodeReference<T> | null): void` appends under a resolved parent, or under the virtual root when the parent is omitted.
21. `insertBefore(data: T, refNode: TreeNodeReference<T>): void` inserts next to an existing reference; the reference must resolve.
22. `insertAfter(data: T, refNode: TreeNodeReference<T>): void` inserts next to an existing reference; the reference must resolve.
23. `updateKeyChildren(key: TreeKey, data: T[]): void` replaces the direct children of an existing key, requires `nodeKey`, and ignores an unknown key.

Structural methods also mutate the corresponding `children` array in the supplied raw data objects. `insertBefore()` and `insertAfter()` expect a valid reference and can fail when it cannot be resolved.

<!-- section:events -->
## Events

The public event map contains 7 events.

| Event | Payload | Types | Notes |
| --- | --- | --- | --- |
| `node-click` | `data, node, instance` | `[data: T, node: Node<T>, instance: VueVirtualTreeNodeInstance<T>]` | A row was clicked. |
| `node-expand` | `data, node, instance` | `[data: T, node: Node<T>, instance: VueVirtualTreeNodeInstance<T>]` | The built-in expand control expanded a node. |
| `node-collapse` | `data, node, instance` | `[data: T, node: Node<T>, instance: VueVirtualTreeNodeInstance<T>]` | The built-in expand control collapsed a node. |
| `node-contextmenu` | `event, data, node, instance` | `[event: MouseEvent, data: T, node: Node<T>, instance: VueVirtualTreeNodeInstance<T>]` | The first argument is the native `MouseEvent`. |
| `current-change` | `data, node` | `[data: T \| null, node: Node<T> \| null]` | Both values can be `null` in the public event type. |
| `check-change` | `data, checked, indeterminate` | `[data: T, checked: boolean, indeterminate: boolean]` | A node's checkbox state changed. |
| `check` | `data, state` | `[data: T, state: VueVirtualTreeCheckState<T>]` | `state` is `VueVirtualTreeCheckState<T>`. |

`VueVirtualTreeCheckState<T>` contains `checkedNodes`, `checkedKeys`, `halfCheckedNodes`, and `halfCheckedKeys`. It can also contain `selectedLeafNodes` and `selectedLeafKeys` when `selectChildrenOnly` is enabled.

For consistent context-menu behavior across both Vue builds, call `event.preventDefault()` in the `node-contextmenu` handler when the native menu should be suppressed.

<!-- section:slot -->
## Default slot

The default slot receives `{ node, item, selectChange }` as `VueVirtualTreeDefaultSlotProps<T>`:

| Value | Type | Meaning |
| --- | --- | --- |
| `node` | `Node<T>` | Tree model wrapper and state. |
| `item` | `T` | Raw node data. |
| `selectChange` | `VueVirtualTreeSelectChange` | Sends a checkbox change through the tree. |

Providing the slot replaces the complete built-in row body, including indentation, expansion control, loading state, checkbox, and label.

<!-- section:types -->
## Exported types

The package entry exports the following 32 types and interfaces.

| Type | Purpose |
| --- | --- |
| `TreeKey` | A node key: `string \| number`. |
| `TreeNodeData` | Base constraint for raw node data: `object`. |
| `TreeDataKey<T>` | String keys from a raw node type. |
| `KeysMatching<T, Value>` | String keys whose non-null value matches `Value`. |
| `TreeNodeKey<T>` | Raw-data keys whose value can be a `TreeKey`. |
| `TreeChildrenKey<T>` | Raw-data keys whose value can be a child array. |
| `TreeBooleanKey<T>` | Raw-data keys whose value can be boolean. |
| `TreePropertyGetter<T, Value>` | Getter receiving raw data and its model node. |
| `TreeProperty<T, Value>` | A matching field name or a property getter. |
| `TreeOptionProps<T>` | Field and getter mappings for node properties. |
| `LoadResolve<T>` | Callback that accepts a loaded child array. |
| `LoadFunction<T>` | Lazy loader receiving a node and `LoadResolve<T>`. |
| `FilterFunction<T, Value>` | Filter predicate receiving value, raw data, and model node. |
| `NodeOptions<T>` | Constructor options for a model node. |
| `NodeChildOptions<T>` | Options used to create a child model node. |
| `NodeChildDefaults<T>` | Initial checkbox, expansion, and visibility state for children. |
| `Node<T>` | Public model-node interface. |
| `TreeNode<T>` | Alias of `Node<T>`. |
| `TreeStoreOptions<T>` | Constructor options for the model store. |
| `TreeNodeReference<T>` | A key, raw data object, or `Node<T>`. |
| `VueVirtualTreeProps<T>` | The component's public prop contract. |
| `VueVirtualTreeCheckState<T>` | State passed by the `check` event. |
| `VueVirtualTreeSelectChange` | Slot callback with signature `(checked: boolean) => void`. |
| `VueVirtualTreeDefaultSlotProps<T>` | Default-slot value contract. |
| `VueVirtualTreeNodeInstance<T>` | Component instance wrapper passed by node events. |
| `VueVirtualTreeEventMap<T>` | Map from the 7 event names to argument tuples. |
| `VueVirtualTreeInstance<T>` | Public template-ref method contract. |
| `TreeStore<T>` | Public model-store interface. |
| `NodeConstructor` | Generic constructor contract for the `Node` runtime export. |
| `TreeStoreConstructor` | Generic constructor contract for the `TreeStore` runtime export. |
| `VueVirtualTreeRegistrar` | Minimal app or Vue constructor shape accepted by `install()`. |
| `VueVirtualTreePlugin` | Installable component type used by the default export. |

Runtime exports are:

| Export | Meaning |
| --- | --- |
| `VueVirtualTree` | Named component and plugin export. |
| `default` | The same component and plugin as `VueVirtualTree`. |
| `Node` | Model-node constructor implementing `Node<T>`. |
| `TreeStore` | Model-store constructor implementing `TreeStore<T>`. |

<!-- section:constraints -->
## Runtime notes

- Vue 2 support is limited to Vue 2.7.x. The other build supports Vue 3 >= 3.2. Both expose the same declarations.
- The package is ESM only and targets an ESM-aware, ES2020-capable environment. There is no separate legacy-browser build.
- The component needs `ResizeObserver`.
- Virtualization assumes a fixed-row layout with `itemSize > 0`. Variable-height rows, wrapping content, or a zero-height container can produce incorrect visible ranges.
- Virtualization reduces mounted DOM rows, not the complete model-data cost. Filtering, bulk checking, and other whole-tree operations can still scale with logical node count.
- Key-based methods and stable state need a unique `nodeKey`. `setCheckedAll(checked?: boolean): void` is a no-op without `nodeKey` because nodes are not registered in the key map.
- Lazy loading expects the application loader to call `resolve(T[])`. Retry, cancellation, and server-error behavior belongs to the application.
- `renderContent` is deprecated and unsupported even though a runtime compatibility prop remains. Use the default slot.
