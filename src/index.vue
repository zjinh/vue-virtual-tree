<template>
  <section v-if="isEmpty" class="virtual-tree__empty-block">
    <span class="virtual-tree__empty-text">{{ emptyText }}</span>
  </section>
  <virtualList
      v-else
      ref="virtualList"
      :height="height"
      :item-height="itemSize"
      :listData="dataList">
    <template v-slot="{ item }">
      <virtualTreeNode
          :node="item"
          :item-size="itemSize"
          :render-content="renderContent"
          :show-checkbox="showCheckbox"
          :select-children-only="selectChildrenOnly"
          @check-change="handleCheckChange"
          @node-expand="handleNodeExpand">
        <template v-slot:default="{node,item,selectChange}">
          <slot :node="node" :item="item" :selectChange="selectChange"></slot>
        </template>
      </virtualTreeNode>
    </template>
  </virtualList>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import type { PropType } from 'vue'

import virtualList from './components/virtualList'
import virtualTreeNode from './components/virtual-tree-node.vue'
import ModelNode from './model/node'
import TreeStore from './model/tree-store'
import type { TreeNodeReference } from './model/tree-store'
import {
  getNodeKey,
  type FilterFunction,
  type LoadFunction,
  type TreeKey,
  type TreeNodeData,
  type TreeOptionProps,
} from './model/util'
import type {
  VueVirtualTreeCheckState,
  VueVirtualTreeNodeInstance,
} from './index'

type LegacyRenderContent = (...args: unknown[]) => unknown

interface VirtualListInstance {
  $el: HTMLElement
  scrollToIndex(index: number, animation?: boolean): Promise<void>
}

export default defineComponent({
  name: 'VueVirtualTree',
  components: {
    virtualList,
    virtualTreeNode,
  },
  emits: [
    'check',
    'check-change',
    'current-change',
    'node-click',
    'node-collapse',
    'node-contextmenu',
    'node-expand',
    'tree-node-drag-end',
    'tree-node-drag-over',
    'tree-node-drag-start',
  ],
  props: {
    data: Array as PropType<TreeNodeData[]>,
    emptyText: {
      type: String,
      default: '暂无数据',
    },
    nodeKey: String,
    checkStrictly: Boolean,
    defaultExpandAll: Boolean,
    checkDescendants: {
      type: Boolean,
      default: false,
    },
    selectChildrenOnly: {
      type: Boolean,
      default: false,
    },
    itemSize: {
      type: Number,
      default: 26,
    },
    autoExpandParent: {
      type: Boolean,
      default: true,
    },
    defaultCheckedKeys: Array as PropType<TreeKey[]>,
    defaultExpandedKeys: Array as PropType<TreeKey[]>,
    currentNodeKey: [String, Number] as PropType<TreeKey>,
    renderContent: Function as PropType<LegacyRenderContent>,
    showCheckbox: {
      type: Boolean,
      default: false,
    },
    props: {
      type: Object as PropType<TreeOptionProps<TreeNodeData>>,
      default: () => ({
        children: 'children',
        label: 'label',
        disabled: 'disabled',
      }) as unknown as TreeOptionProps<TreeNodeData>,
    },
    lazy: {
      type: Boolean,
      default: false,
    },
    highlightCurrent: Boolean,
    load: Function as PropType<LoadFunction<TreeNodeData>>,
    filterNodeMethod: Function as PropType<FilterFunction<TreeNodeData>>,
    indent: {
      type: Number,
      default: 18,
    },
    iconClass: String,
    height: {
      type: [String, Number] as PropType<string | number>,
      default: '100%',
    },
  },
  data() {
    return {
      cleanupDone: false,
      currentNode: null as VueVirtualTreeNodeInstance<TreeNodeData> | null,
      isTree: true,
      root: null as unknown as ModelNode<TreeNodeData>,
      store: null as unknown as TreeStore<TreeNodeData>,
    }
  },
  computed: {
    children: {
      get(): TreeNodeData[] {
        return this.data ?? []
      },
      set(value: TreeNodeData[]) {
        this.store.setData(value)
      },
    },
    isEmpty(): boolean {
      const { childNodes } = this.root
      return childNodes.length === 0 || childNodes.every(({ visible }) => !visible)
    },
    dataList(): ModelNode<TreeNodeData>[] {
      return this.smoothTree(this.root.childNodes)
    },
  },
  watch: {
    defaultCheckedKeys(newValue: TreeKey[] | undefined) {
      this.store.setDefaultCheckedKey(newValue ?? [])
    },
    defaultExpandedKeys(newValue: TreeKey[] | undefined) {
      this.store.defaultExpandedKeys = newValue
      this.store.setDefaultExpandedKeys(newValue)
    },
    data(newValue: TreeNodeData[] | undefined) {
      this.store.setData(newValue ?? [])
    },
    checkStrictly(newValue: boolean) {
      this.store.checkStrictly = newValue
    },
  },
  methods: {
    smoothTree(treeData: ModelNode<TreeNodeData>[]): ModelNode<TreeNodeData>[] {
      return treeData.reduce<ModelNode<TreeNodeData>[]>((smoothNodes, node) => {
        if (node.visible) {
          node.type = this.showCheckbox
            ? `${node.level}-${node.checked}-${node.indeterminate}`
            : `${node.level}-${node.expanded}`
          smoothNodes.push(node)
        }
        if (node.expanded && node.childNodes.length > 0) {
          smoothNodes.push(...this.smoothTree(node.childNodes))
        }
        return smoothNodes
      }, [])
    },
    filter<Value = unknown>(value: Value): void {
      if (!this.filterNodeMethod) {
        throw new Error('[Tree] filterNodeMethod is required when filter')
      }
      this.store.filter(value)
    },
    scrollToItem(key: TreeKey, levelStepPadding = 18, animation = false): void {
      if (!this.height || this.isEmpty) {
        throw new Error('scrollToItem can only be used when using virtual scrolling')
      }

      let index = -1
      let level = 0
      for (let listIndex = 0; listIndex < this.dataList.length; listIndex += 1) {
        const item = this.dataList[listIndex]
        const itemData = item.data as Record<string, unknown>
        if (this.nodeKey && itemData[this.nodeKey] === key) {
          level = item.level
          index = listIndex
          break
        }
      }

      this.$nextTick(() => {
        const list = this.$refs.virtualList as VirtualListInstance | undefined
        if (index < 0 || !list) return
        void list.scrollToIndex(index, animation)
        setTimeout(() => {
          const element = list.$el
          if (element.scrollWidth <= element.clientWidth) return
          const maxScrollLeft = element.scrollWidth - element.clientWidth
          const padding = this.getPaddingLeftPx(level - 2, levelStepPadding)
          element.scrollLeft = Math.max(0, Math.min(padding, maxScrollLeft))
        }, 50)
      })
    },
    getPaddingLeftPx(level: number, levelStepPadding = 18): number {
      const normalizedLevel = Math.max(level, 1)
      return normalizedLevel === 1
        ? levelStepPadding
        : (normalizedLevel - 1) * levelStepPadding
    },
    getNodeKey(node: ModelNode<TreeNodeData>): TreeKey | undefined {
      return getNodeKey(this.nodeKey as never, node.data)
    },
    getNodePath(data: TreeNodeReference<TreeNodeData>): TreeNodeData[] {
      if (!this.nodeKey) throw new Error('[Tree] nodeKey is required in getNodePath')
      const node = this.store.getNode(data)
      if (!node) return []
      const path = [node.data]
      let parent = node.parent
      while (parent && parent !== this.root) {
        path.push(parent.data)
        parent = parent.parent
      }
      return path.reverse()
    },
    getCheckedNodes(leafOnly?: boolean, includeHalfChecked?: boolean): TreeNodeData[] {
      return this.store.getCheckedNodes(leafOnly, includeHalfChecked)
    },
    getCheckedKeys(leafOnly?: boolean): Array<TreeKey | undefined> {
      return this.store.getCheckedKeys(leafOnly)
    },
    getCurrentNode(): TreeNodeData | null {
      return this.store.getCurrentNode()?.data ?? null
    },
    getCurrentKey(): TreeKey | null {
      if (!this.nodeKey) throw new Error('[Tree] nodeKey is required in getCurrentKey')
      const currentNode = this.getCurrentNode()
      return currentNode
        ? (currentNode as Record<string, unknown>)[this.nodeKey] as TreeKey
        : null
    },
    setCheckedNodes(nodes: TreeNodeData[], leafOnly?: boolean): void {
      if (!this.nodeKey) throw new Error('[Tree] nodeKey is required in setCheckedNodes')
      this.store.setCheckedNodes(nodes, leafOnly)
    },
    setCheckedKeys(keys: TreeKey[], leafOnly?: boolean): void {
      if (!this.nodeKey) throw new Error('[Tree] nodeKey is required in setCheckedKeys')
      this.store.setCheckedKeys(keys, leafOnly)
    },
    setChecked(
      data: TreeNodeReference<TreeNodeData>,
      checked: boolean,
      deep?: boolean,
    ): void {
      this.store.setChecked(data, checked, deep)
    },
    setCheckedAll(checked = true): void {
      this.store.setCheckedAll(checked)
    },
    getHalfCheckedNodes(): TreeNodeData[] {
      return this.store.getHalfCheckedNodes()
    },
    getHalfCheckedKeys(): Array<TreeKey | undefined> {
      return this.store.getHalfCheckedKeys()
    },
    getSelectedLeafNodes(): TreeNodeData[] {
      return this.store.getSelectedLeafNodes()
    },
    getSelectedLeafKeys(): Array<TreeKey | undefined> {
      return this.store.getSelectedLeafKeys()
    },
    setCurrentNode(node: TreeNodeData): void {
      if (!this.nodeKey) throw new Error('[Tree] nodeKey is required in setCurrentNode')
      this.store.setUserCurrentNode(node)
    },
    setCurrentKey(key: TreeKey | null): void {
      if (!this.nodeKey) throw new Error('[Tree] nodeKey is required in setCurrentKey')
      this.store.setCurrentNodeKey(key)
    },
    getNode(data: TreeNodeReference<TreeNodeData>): ModelNode<TreeNodeData> | null {
      return this.store.getNode(data)
    },
    remove(data: TreeNodeReference<TreeNodeData>): void {
      this.store.remove(data)
    },
    append(
      data: TreeNodeData,
      parentNode?: TreeNodeReference<TreeNodeData> | null,
    ): void {
      this.store.append(data, parentNode)
    },
    insertBefore(
      data: TreeNodeData,
      refNode: TreeNodeReference<TreeNodeData>,
    ): void {
      this.store.insertBefore(data, refNode)
    },
    insertAfter(
      data: TreeNodeData,
      refNode: TreeNodeReference<TreeNodeData>,
    ): void {
      this.store.insertAfter(data, refNode)
    },
    handleNodeExpand(
      nodeData: TreeNodeData,
      node: ModelNode<TreeNodeData>,
      instance: VueVirtualTreeNodeInstance<TreeNodeData>,
    ): void {
      this.$emit('node-expand', nodeData, node, instance)
    },
    updateKeyChildren(key: TreeKey, data: TreeNodeData[]): void {
      if (!this.nodeKey) throw new Error('[Tree] nodeKey is required in updateKeyChild')
      this.store.updateChildren(key, data)
    },
    handleCheckChange(node: ModelNode<TreeNodeData>, checkValue: boolean): void {
      if (this.selectChildrenOnly) {
        if (node.isLeaf) {
          node.checked = checkValue
          node.indeterminate = false
          this.updateParentStatus(node)
        } else if ((node.indeterminate && checkValue) || (!node.checked && checkValue)) {
          node.checked = true
          node.indeterminate = false
          this.selectAllChildren(node)
          this.updateParentStatus(node)
        } else if (node.checked && !checkValue) {
          node.checked = false
          node.indeterminate = false
          this.deselectAllChildren(node)
          this.updateParentStatus(node)
        }
      } else {
        node.setChecked(checkValue, !this.checkStrictly)
      }

      this.$nextTick(() => {
        const eventData: VueVirtualTreeCheckState<TreeNodeData> = {
          checkedNodes: this.store.getCheckedNodes(),
          checkedKeys: this.store.getCheckedKeys(),
          halfCheckedNodes: this.store.getHalfCheckedNodes(),
          halfCheckedKeys: this.store.getHalfCheckedKeys(),
        }
        if (this.selectChildrenOnly) {
          eventData.selectedLeafNodes = this.store.getSelectedLeafNodes()
          eventData.selectedLeafKeys = this.store.getSelectedLeafKeys()
        }
        this.$emit('check', node.data, eventData)
      })
    },
    updateParentStatus(node: ModelNode<TreeNodeData>): void {
      let parent = node.parent
      while (parent && parent.level > 0) {
        let allChecked = true
        let noneChecked = true
        for (const child of parent.childNodes) {
          if (child.checked) noneChecked = false
          else allChecked = false
          if (child.indeterminate) {
            allChecked = false
            noneChecked = false
            break
          }
        }

        if (this.selectChildrenOnly) {
          parent.checked = false
          parent.indeterminate = !noneChecked
        } else if (allChecked) {
          parent.checked = true
          parent.indeterminate = false
        } else if (noneChecked) {
          parent.checked = false
          parent.indeterminate = false
        } else {
          parent.checked = false
          parent.indeterminate = true
        }
        parent = parent.parent
      }
    },
    selectAllChildren(node: ModelNode<TreeNodeData>): void {
      if (node.disabled) return
      for (const child of node.childNodes) {
        if (child.disabled) continue
        child.checked = true
        child.indeterminate = false
        if (!child.isLeaf) this.selectAllChildren(child)
      }
    },
    deselectAllChildren(node: ModelNode<TreeNodeData>): void {
      if (node.disabled) return
      for (const child of node.childNodes) {
        if (child.disabled) continue
        child.checked = false
        child.indeterminate = false
        if (!child.isLeaf) this.deselectAllChildren(child)
      }
    },
    cleanupTree(): void {
      if (this.cleanupDone) return
      this.cleanupDone = true
      this.root.remove()
      this.store.destroy()
    },
  },
  beforeDestroy() {
    this.cleanupTree()
  },
  beforeUnmount() {
    this.cleanupTree()
  },
  created() {
    this.store = new TreeStore<TreeNodeData>({
      key: this.nodeKey as never,
      data: this.data ?? [],
      lazy: this.lazy,
      props: this.props,
      load: this.load,
      currentNodeKey: this.currentNodeKey,
      checkStrictly: this.checkStrictly,
      checkDescendants: this.checkDescendants,
      defaultCheckedKeys: this.defaultCheckedKeys,
      defaultExpandedKeys: this.defaultExpandedKeys,
      autoExpandParent: this.autoExpandParent,
      defaultExpandAll: this.defaultExpandAll,
      filterNodeMethod: this.filterNodeMethod,
      selectChildrenOnly: this.selectChildrenOnly,
    })
    this.root = this.store.root as ModelNode<TreeNodeData>
  },
})
</script>
