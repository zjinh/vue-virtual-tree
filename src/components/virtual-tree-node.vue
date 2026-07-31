<template>
  <div
    v-show="node.visible"
    ref="node"
    class="virtual-tree-node"
    :class="{
      'is-expanded': expanded,
      'is-current': node.isCurrent,
      'is-hidden': !node.visible,
    }"
    tabindex="-1"
    :draggable="tree.draggable"
    @click.stop="handleClick"
    @contextmenu="handleContextMenu($event)"
    @dragstart.stop="handleDragStart"
    @dragover.stop="handleDragOver"
    @dragend.stop="handleDragEnd"
    @drop.stop="handleDrop"
  >
    <slot :node="node" :item="node.data" :selectChange="handleCheckChange">
      <span aria-hidden="true" :style="{'min-width': (node.level - 1) * tree.indent + 'px',}"></span>
      <span
          class="expand-icon"
          :class="[
          {
            'is-leaf': node.isLeaf,
            expanded: !node.isLeaf && expanded,
          },
          tree.iconClass ? tree.iconClass : 'caret-right',
        ]"
          @click.stop="handleExpandIconClick"
      ></span>
      <Checkbox
          v-if="showCheckbox"
          :modelValue="node.checked"
          :indeterminate="node.indeterminate"
          :disabled="!!node.disabled"
          @change="handleCheckChange"
          @click.native.stop
      />
      <span v-if="node.loading" class="loading-icon"></span>
      <span class="name">{{node.label}}</span>
    </slot>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import type { PropType } from 'vue'

import Checkbox from './checkbox.vue'
import type {
  TreeNode,
  TreeNodeData,
  TreeOptionProps,
  TreeStore,
  VueVirtualTreeRenderContent,
} from '../index'
import { getNodeKey } from '../model/util'

interface TreeContext {
  $emit(event: string, ...args: unknown[]): void
  _events?: Record<string, unknown | unknown[]>
  checkOnClickNode?: boolean
  currentNode: unknown
  draggable?: boolean
  expandOnClickNode?: boolean
  iconClass?: string
  indent: number
  isTree?: boolean
  nodeKey?: string
  props?: TreeOptionProps<TreeNodeData>
  store: TreeStore<TreeNodeData>
  tree?: TreeContext
}

interface TreeParentCandidate {
  $parent?: TreeParentCandidate | null
  isTree?: boolean
  tree?: TreeContext
}

type CheckChangeValue = boolean | Event | null | undefined

export default defineComponent({
  name: 'virtualTreeNode',
  componentName: 'virtualTreeNode',
  components: {
    Checkbox,
  },
  props: {
    itemSize: {
      type: Number,
      default: 26,
    },
    node: {
      type: Object as PropType<TreeNode<TreeNodeData>>,
      required: true,
    },
    renderContent: Function as PropType<VueVirtualTreeRenderContent<TreeNodeData>>,
    showCheckbox: {
      type: Boolean,
      default: false,
    },
    selectChildrenOnly: {
      type: Boolean,
      default: false,
    },
    haveSlot:{
      type: Boolean,
    }
  },
  data() {
    return {
      tree: null as unknown as TreeContext,
      expanded: false,
      childNodeRendered: false,
      oldChecked: null as boolean | null,
      oldIndeterminate: null as boolean | null,
    }
  },
  watch: {
    'node.indeterminate'(value: boolean) {
      this.handleSelectChange(this.node.checked, value)
    },

    'node.checked'(value: boolean) {
      this.handleSelectChange(value, this.node.indeterminate)
    },

    'node.expanded'(value: boolean) {
      this.$nextTick(() => (this.expanded = value))
      if (value) {
        this.childNodeRendered = true
      }
    },
  },
  created() {
    this.init(this.$parent as unknown as TreeParentCandidate)
  },
  methods: {
    init(parent: TreeParentCandidate | null): void {
      let current = parent
      let tree: TreeContext | null = null

      while (current) {
        if (current.isTree) {
          tree = current as unknown as TreeContext
          break
        }
        if (current.tree) {
          tree = current.tree
          break
        }
        current = current.$parent ?? null
      }

      if (!tree) {
        throw new Error("Can not find node's tree.")
      }
      this.tree = tree

      const props = tree.props || {}
      const childrenKey = typeof props.children === 'string' ? props.children : 'children'

      this.$watch(`node.data.${childrenKey}`, () => {
        this.node.updateChildren()
      })

      if (this.node.expanded) {
        this.expanded = true
        this.childNodeRendered = true
      }
    },

    getNodeKey(node: TreeNode<TreeNodeData>) {
      return getNodeKey(this.tree.nodeKey as never, node.data)
    },

    handleDragStart(event: DragEvent): void {
      if (!this.tree.draggable) return;
      this.tree.$emit('tree-node-drag-start', event, this)
    },

    handleDragOver(event: DragEvent): void {
      if (!this.tree.draggable) return;
      this.tree.$emit('tree-node-drag-over', event, this)
      event.preventDefault()
    },

    handleDragEnd(event: DragEvent): void {
      if (!this.tree.draggable) return;
      this.tree.$emit('tree-node-drag-end', event, this)
    },

    handleDrop(event: DragEvent): void {
      event.preventDefault()
    },

    handleSelectChange(checked: boolean, indeterminate: boolean): void {
      const node = this.node
      if (
          this.oldChecked !== checked ||
          this.oldIndeterminate !== indeterminate
      ) {
        this.tree.$emit(
            'check-change',
            node.data,
            checked,
            indeterminate,
        )
      }
      this.oldChecked = checked
      this.oldIndeterminate = indeterminate
    },

    handleClick(): void {
      const node = this.node
      const store = this.tree.store

      store.setCurrentNode(node)
      this.tree.$emit(
          'current-change',
          store.currentNode ? store.currentNode.data : null,
          store.currentNode,
      )
      this.tree.currentNode = this
      if (this.tree.expandOnClickNode) {
        this.handleExpandIconClick()
      }
      if (this.tree.checkOnClickNode && !node.disabled) {
        this.handleCheckChange(!node.checked)
      }

      this.tree.$emit('node-click', node.data, node, this)
    },

    handleContextMenu(event: MouseEvent): void {
      const node = this.node
      const contextMenuListeners = this.tree._events?.['node-contextmenu']

      if (
          Array.isArray(contextMenuListeners) &&
          contextMenuListeners.length > 0
      ) {
        event.stopPropagation()
        event.preventDefault()
      }
      this.tree.$emit('node-contextmenu', event, node.data, node, this)
    },

    handleExpandIconClick(): void {
      const node = this.node

      if (node.isLeaf) return;
      if (this.expanded) {
        this.tree.$emit('node-collapse', node.data, node, this)
        node.collapse()
      } else {
        node.expand()
        this.$emit('node-expand', node.data, node, this)
      }
    },

    handleCheckChange(
      value: CheckChangeValue,
      eventOrChecked?: CheckChangeValue,
    ): void {
      const candidate = eventOrChecked ?? value
      if (typeof candidate === 'boolean') {
        this.$emit('check-change', this.node, candidate)
        return
      }
      if (candidate instanceof Event && candidate.target instanceof HTMLInputElement) {
        this.$emit('check-change', this.node, candidate.target.checked)
      }
    },
  },
})
</script>

<style lang="less" scoped>
.virtual-tree-node{
  width: 100%;
  position: relative;
  cursor: default;
  white-space: nowrap;
  outline: none;
  display: flex;
  align-items: center;
  .expand-icon{
    cursor: pointer;
    color: #C0C4CC;
    font-size: 12px;
    transform: rotate(0deg);
    transition: transform 0.3s ease-in-out;
    &.no-transition{
      transition:none;
    }
    &.expanded {
      transform: rotate(90deg);
    }
  }
  .caret-right:before {
    content: ">";
  }
  .loading-icon {
    margin-right: 8px;
    font-size: 14px;
    color: #C0C4CC;
  }
}
</style>
