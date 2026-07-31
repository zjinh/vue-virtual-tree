export type PropSupport = 'supported' | 'unsupported'
export type PropControl = 'boolean' | 'number' | 'text' | 'scenario' | 'fixed'

export interface PropManifestItem {
  name: string
  type: string
  defaultValue: string
  support: PropSupport
  control: PropControl
  initializationOnly?: boolean
  note?: string
}

export interface MethodManifestItem {
  name: string
  group: 'Query' | 'Selection' | 'Current' | 'Mutation' | 'Navigation'
  signature: string
}

export interface EventManifestItem {
  name: string
  payload: string
}

export const TREE_PROPS: PropManifestItem[] = [
  { name: 'data', type: 'TreeNode[]', defaultValue: '[]', support: 'supported', control: 'scenario', note: 'Controlled by dataset presets.' },
  { name: 'emptyText', type: 'string', defaultValue: '暂无数据', support: 'supported', control: 'text' },
  { name: 'nodeKey', type: 'string', defaultValue: 'not set', support: 'supported', control: 'fixed', initializationOnly: true, note: 'Fixed to id in this workbench.' },
  { name: 'checkStrictly', type: 'boolean', defaultValue: 'false', support: 'supported', control: 'boolean' },
  { name: 'defaultExpandAll', type: 'boolean', defaultValue: 'false', support: 'supported', control: 'boolean', initializationOnly: true },
  { name: 'checkDescendants', type: 'boolean', defaultValue: 'false', support: 'supported', control: 'boolean', initializationOnly: true },
  { name: 'selectChildrenOnly', type: 'boolean', defaultValue: 'false', support: 'supported', control: 'boolean', initializationOnly: true },
  { name: 'itemSize', type: 'number', defaultValue: '26', support: 'supported', control: 'number' },
  { name: 'autoExpandParent', type: 'boolean', defaultValue: 'true', support: 'supported', control: 'boolean', initializationOnly: true },
  { name: 'defaultCheckedKeys', type: 'TreeKey[]', defaultValue: '[]', support: 'supported', control: 'text', initializationOnly: true },
  { name: 'defaultExpandedKeys', type: 'TreeKey[]', defaultValue: '[]', support: 'supported', control: 'text', initializationOnly: true },
  { name: 'currentNodeKey', type: 'TreeKey', defaultValue: 'not set', support: 'supported', control: 'text', initializationOnly: true },
  { name: 'showCheckbox', type: 'boolean', defaultValue: 'false', support: 'supported', control: 'boolean' },
  { name: 'props', type: 'TreeOptionProps', defaultValue: 'label / children / disabled', support: 'supported', control: 'fixed', initializationOnly: true, note: 'Mapped to label, children, disabled and leaf.' },
  { name: 'lazy', type: 'boolean', defaultValue: 'false', support: 'supported', control: 'boolean', initializationOnly: true },
  { name: 'highlightCurrent', type: 'boolean', defaultValue: 'false', support: 'supported', control: 'boolean', note: 'Accepted by the component; current styling follows legacy behavior.' },
  { name: 'load', type: 'LoadFunction', defaultValue: 'not set', support: 'supported', control: 'scenario', initializationOnly: true, note: 'Enabled by the lazy scenario.' },
  { name: 'filterNodeMethod', type: 'FilterFunction', defaultValue: 'not set', support: 'supported', control: 'scenario', note: 'Connected to the filter input.' },
  { name: 'indent', type: 'number', defaultValue: '18', support: 'supported', control: 'number' },
  { name: 'iconClass', type: 'string', defaultValue: 'not set', support: 'supported', control: 'text' },
  { name: 'height', type: 'string | number', defaultValue: '100%', support: 'supported', control: 'number' },
  { name: 'renderContent', type: 'never', defaultValue: 'not set', support: 'unsupported', control: 'fixed', note: 'Deprecated compatibility placeholder. Use the default scoped slot.' },
]

export const TREE_METHODS: MethodManifestItem[] = [
  { name: 'filter', group: 'Query', signature: 'filter(query)' },
  { name: 'scrollToItem', group: 'Navigation', signature: 'scrollToItem(key, 18, false)' },
  { name: 'getNodePath', group: 'Query', signature: 'getNodePath(key)' },
  { name: 'getCheckedNodes', group: 'Selection', signature: 'getCheckedNodes(false, true)' },
  { name: 'getCheckedKeys', group: 'Selection', signature: 'getCheckedKeys(false)' },
  { name: 'getCurrentNode', group: 'Current', signature: 'getCurrentNode()' },
  { name: 'getCurrentKey', group: 'Current', signature: 'getCurrentKey()' },
  { name: 'setCheckedNodes', group: 'Selection', signature: 'setCheckedNodes([target])' },
  { name: 'setCheckedKeys', group: 'Selection', signature: 'setCheckedKeys([key], false)' },
  { name: 'setChecked', group: 'Selection', signature: 'setChecked(key, true, true)' },
  { name: 'setCheckedAll', group: 'Selection', signature: 'setCheckedAll(true)' },
  { name: 'getHalfCheckedNodes', group: 'Selection', signature: 'getHalfCheckedNodes()' },
  { name: 'getHalfCheckedKeys', group: 'Selection', signature: 'getHalfCheckedKeys()' },
  { name: 'getSelectedLeafNodes', group: 'Selection', signature: 'getSelectedLeafNodes()' },
  { name: 'getSelectedLeafKeys', group: 'Selection', signature: 'getSelectedLeafKeys()' },
  { name: 'setCurrentNode', group: 'Current', signature: 'setCurrentNode(target)' },
  { name: 'setCurrentKey', group: 'Current', signature: 'setCurrentKey(key)' },
  { name: 'getNode', group: 'Query', signature: 'getNode(key)' },
  { name: 'remove', group: 'Mutation', signature: 'remove(key)' },
  { name: 'append', group: 'Mutation', signature: 'append(node, parentKey)' },
  { name: 'insertBefore', group: 'Mutation', signature: 'insertBefore(node, refKey)' },
  { name: 'insertAfter', group: 'Mutation', signature: 'insertAfter(node, refKey)' },
  { name: 'updateKeyChildren', group: 'Mutation', signature: 'updateKeyChildren(key, children)' },
]

export const TREE_EVENTS: EventManifestItem[] = [
  { name: 'node-click', payload: 'data, node, instance' },
  { name: 'node-contextmenu', payload: 'event, data, node, instance' },
  { name: 'current-change', payload: 'data, node' },
  { name: 'node-expand', payload: 'data, node, instance' },
  { name: 'node-collapse', payload: 'data, node, instance' },
  { name: 'check-change', payload: 'data, checked, indeterminate' },
  { name: 'check', payload: 'data, checkState' },
]
