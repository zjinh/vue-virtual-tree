import './virtual-tree-node.less'
import { defineComponent } from 'vue'
import type { PropType, VNode } from 'vue'
import { displayLabel, getDefaultSlot, hasSlotContent, renderCompat, stopEvent } from './render-compat'

import Checkbox from './checkbox'
import type {
  TreeNode,
  TreeNodeData,
  TreeOptionProps,
  TreeStore,
} from '../index'
import { getNodeKey } from '../model/util'

type LegacyRenderContent = (...args: unknown[]) => unknown

export interface TreeContext {
  $emit(event: string, ...args: unknown[]): void
  _events?: Record<string, unknown | unknown[]>
  checkOnClickNode?: boolean
  currentNode: unknown
  draggable?: boolean
  expandOnClickNode?: boolean
  iconClass?: string
  highlightCurrent?: boolean
  indent: number
  isTree?: boolean
  nodeKey?: string
  props?: TreeOptionProps<TreeNodeData>
  store: TreeStore<TreeNodeData>
  tree?: TreeContext
}

export interface TreeParentCandidate {
  $parent?: TreeParentCandidate | null
  isTree?: boolean
  tree?: TreeContext
}

type CheckChangeValue = boolean | Event | null | undefined

export default defineComponent({
  __scopeId: 'data-v-vvt-node',
  _scopeId: 'data-v-vvt-node',
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
    renderContent: Function as PropType<LegacyRenderContent>,
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
  render(): VNode {
    const slot = getDefaultSlot(this)
    const content = slot?.({
      node: this.node, item: this.node.data, selectChange: this.handleCheckChange,
    })
    return renderCompat(this, 'div', {
      ref: 'node',
      class: ['virtual-tree-node', {
        'is-expanded': this.expanded,
        'is-current': this.tree.highlightCurrent && this.node.isCurrent,
        'is-hidden': !this.node.visible,
      }],
      style: { display: this.node.visible ? undefined : 'none' },
      attrs: { tabindex: '-1', draggable: this.tree.draggable },
      on: {
        click: stopEvent(() => this.handleClick()),
        contextmenu: this.handleContextMenu,
        dragstart: stopEvent((event) => this.handleDragStart(event as DragEvent)),
        dragover: stopEvent((event) => this.handleDragOver(event as DragEvent)),
        dragend: stopEvent((event) => this.handleDragEnd(event as DragEvent)),
        drop: stopEvent((event) => this.handleDrop(event as DragEvent)),
      },
    }, hasSlotContent(content) ? content : [
      renderCompat(this, 'span', {
        attrs: { 'aria-hidden': 'true' },
        style: { minWidth: `${(this.node.level - 1) * this.tree.indent}px` },
      }),
      renderCompat(this, 'span', {
        class: ['expand-icon', {
          'is-leaf': this.node.isLeaf,
          expanded: !this.node.isLeaf && this.expanded,
        }, this.tree.iconClass || 'caret-right'],
        on: { click: stopEvent(() => this.handleExpandIconClick()) },
      }),
      this.showCheckbox ? renderCompat(this, Checkbox, {
        props: {
          modelValue: this.node.checked,
          indeterminate: this.node.indeterminate,
          disabled: !!this.node.disabled,
        },
        on: { change: this.handleCheckChange },
        nativeOn: { click: stopEvent() },
      }) : null,
      this.node.loading ? renderCompat(this, 'span', { class: 'loading-icon' }) : null,
      renderCompat(this, 'span', { class: 'name' }, displayLabel(this, this.node.label)),
    ])
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
          Array.isArray(contextMenuListeners) && contextMenuListeners.length > 0
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
