import type TreeStore from './tree-store'
import {
  markNodeData,
  objectAssign,
  type TreeChildrenKey,
  type TreeNodeData,
  type TreeProperty,
} from './util'

export interface NodeOptions<T extends TreeNodeData> {
  data: T | T[]
  store: TreeStore<T>
  parent?: Node<T> | null
  checked?: boolean
  indeterminate?: boolean
  expanded?: boolean
  visible?: boolean
  isCurrent?: boolean
}

export type NodeChildOptions<T extends TreeNodeData> = Omit<
  NodeOptions<T>,
  'data' | 'store'
> & { data: T; store?: TreeStore<T> }

type NodeChildDefaults<T extends TreeNodeData> = Partial<
  Pick<Node<T>, 'checked' | 'indeterminate' | 'expanded' | 'visible'>
>

export interface ChildState {
  all: boolean
  none: boolean
  allWithoutDisable: boolean
  half: boolean
}

export const getChildState = <T extends TreeNodeData>(
  node: readonly Node<T>[],
): ChildState => {
  let all = true;
  let none = true;
  let allWithoutDisable = true;
  for (let i = 0, j = node.length; i < j; i++) {
    const n = node[i];
    if (n.checked !== true || n.indeterminate) {
      all = false;
      if (!n.disabled) {
        allWithoutDisable = false;
      }
    }
    if (n.checked !== false || n.indeterminate) {
      none = false;
    }
  }

  return { all, none, allWithoutDisable, half: !all && !none };
};

const reInitChecked = <T extends TreeNodeData>(node: Node<T>): void => {
  if (node.childNodes.length === 0) return;

  const { all, none } = getChildState(node.childNodes);
  if (all) {
    node.checked = true;
    node.indeterminate = false;
  } else if (!none) {
    // 只要有任何子节点被选中，就应该显示半选状态
    node.checked = false;
    node.indeterminate = true;
  } else if (none) {
    node.checked = false;
    node.indeterminate = false;
  }

  const parent = node.parent;
  if (!parent || parent.level === 0) return;

  // When not in checkStrictly mode, propagate upwards
  if (!node.store.checkStrictly) {
    // But in selectChildrenOnly mode, we shouldn't change parent's checked status
    // only update its indeterminate status when needed
    if (node.store.selectChildrenOnly) {
      const { all, none } = getChildState(parent.childNodes);
      if (!all && !none) {
        parent.indeterminate = true;
      } else {
        reInitChecked(parent);
      }
    } else {
      reInitChecked(parent);
    }
  }
}

const getPropertyFromData = <T extends TreeNodeData>(
  node: Node<T>,
  prop: string,
): unknown => {
  const props = node.store.props || {}
  const data = node.data
  const dataRecord = data as Record<string, unknown>
  const config = props[prop] as TreeProperty<T> | undefined

  if (typeof config === "function") {
    return config(data, node)
  } else if (typeof config === "string") {
    return dataRecord[config]
  } else if (typeof config === "undefined") {
    const dataProp = dataRecord[prop]
    return dataProp === undefined ? "" : dataProp
  }
}

let nodeIdSeed = 0;

export default class Node<T extends TreeNodeData = TreeNodeData> {
  id: number
  text: unknown | null = null
  checked = false
  indeterminate = false
  data: T
  expanded = false
  parent: Node<T> | null = null
  visible = true
  isCurrent = false
  type: unknown | null = null
  store: TreeStore<T>
  level = 0
  loaded = false
  childNodes: Node<T>[] = []
  loading = false
  _loadVersion = 0
  isLeafByUser?: boolean
  isLeaf = false

  constructor(options: NodeOptions<T>) {
    this.id = nodeIdSeed++
    this.data = options.data as T
    this.store = options.store
    Object.assign(this, options)

    // internal
    this.level = 0
    this.loaded = false
    this.childNodes = []
    this.loading = false

    if (this.parent) {
      this.level = this.parent.level + 1;
    }

    const store = this.store;
    if (!store) {
      throw new Error("[Node]store is required!");
    }
    store.registerNode(this);

    const props = store.props;
    if (props && typeof props.isLeaf !== "undefined") {
      const isLeaf = getPropertyFromData(this, "isLeaf");
      if (typeof isLeaf === "boolean") {
        this.isLeafByUser = isLeaf;
      }
    }

    if (store.lazy !== true && this.data) {
      this.setData(this.data);

      if (store.defaultExpandAll) {
        this.expanded = true;
      }
    } else if (this.level > 0 && store.lazy && store.defaultExpandAll) {
      this.expand();
    }
    if (!Array.isArray(this.data)) {
      markNodeData(this, this.data);
    }
    if (!this.data) return;
    const defaultExpandedKeys = store.defaultExpandedKeys;
    const key = store.key;
    const nodeKey = this.key
    if (
      key &&
      defaultExpandedKeys &&
      nodeKey !== null &&
      nodeKey !== undefined &&
      defaultExpandedKeys.indexOf(nodeKey) !== -1
    ) {
      this.expand(null, Boolean(store.autoExpandParent));
    }

    if (
      key &&
      store.currentNodeKey !== undefined &&
      this.key === store.currentNodeKey
    ) {
      store.currentNode = this;
      store.currentNode.isCurrent = true;
    }

    if (store.lazy) {
      store._initDefaultCheckedNode(this);
    }

    this.updateLeafState();
  }

  setData(data: T | T[]): void {
    this._loadVersion += 1
    this.loading = false
    const previousData = this.data
    const previousKey = this.key
    for (const child of this.childNodes) {
      this.store.deregisterNode(child)
      child.parent = null
    }
    if (!Array.isArray(data)) {
      markNodeData(this, data);
    }

    this.data = data as T
    this.childNodes = [];
    if (previousKey != null && this.store.nodesMap[previousKey] === this) {
      delete this.store.nodesMap[previousKey]
    }
    this.store.registerNode(this)
    if (previousData !== data) {
      const siblings = this.parent?.getChildren()
      const index = siblings?.indexOf(previousData) ?? -1
      if (siblings && index !== -1) siblings.splice(index, 1, this.data)
      if (this === this.store.root && Array.isArray(data)) this.store.data = data
    }

    let children: T[]
    if (this.level === 0 && this.data instanceof Array) {
      children = this.data;
    } else {
      children = (getPropertyFromData(this, "children") || []) as T[];
    }

    for (let i = 0, j = children.length; i < j; i++) {
      this.insertChild({ data: children[i] });
    }
    this.updateLeafState()
  }

  get label(): unknown {
    return getPropertyFromData(this, "label");
  }

  get key(): string | number | null | undefined {
    const nodeKey = this.store.key;
    if (this.data && nodeKey) {
      return this.data[nodeKey] as string | number | undefined
    }
    return null;
  }

  // get type() {
  //     // const nodeKey = this.store.key;
  //     if (this.data) return this.data.type;
  //     return null;
  // }

  get disabled(): unknown {
    return getPropertyFromData(this, "disabled")
  }

  get nextSibling(): Node<T> | null | undefined {
    const parent = this.parent;
    if (parent) {
      const index = parent.childNodes.indexOf(this);
      if (index > -1) {
        return parent.childNodes[index + 1];
      }
    }
    return null;
  }

  get previousSibling(): Node<T> | null {
    const parent = this.parent;
    if (parent) {
      const index = parent.childNodes.indexOf(this);
      if (index > -1) {
        return index > 0 ? parent.childNodes[index - 1] : null;
      }
    }
    return null;
  }

  contains(target: Node<T>, deep = true): boolean {
    const walk = (parent: Node<T>): boolean => {
      const children = parent.childNodes || [];
      let result = false;
      for (let i = 0, j = children.length; i < j; i++) {
        const child = children[i];
        if (child === target || (deep && walk(child))) {
          result = true;
          break;
        }
      }
      return result;
    };

    return walk(this);
  }

  remove(): void {
    const parent = this.parent;
    if (parent) {
      parent.removeChild(this);
    }
  }

  insertChild(
    child: Node<T> | NodeChildOptions<T>,
    index?: number,
    batch = false,
  ): void {
    if (!child) throw new Error("insertChild error: child is required.");

    if (child instanceof Node) {
      if (child === this || child.contains(this)) {
        throw new Error('insertChild error: cannot insert itself or an ancestor.');
      }
      const previousParent = child.parent
      const previousIndex = previousParent?.childNodes.indexOf(child) ?? -1
      if (previousParent && previousIndex !== -1) {
        previousParent.childNodes.splice(previousIndex, 1)
        const previousData = previousParent.getChildren()
        const dataIndex = previousData?.indexOf(child.data) ?? -1
        if (previousData && dataIndex !== -1) previousData.splice(dataIndex, 1)
        if (previousParent === this && index !== undefined && previousIndex < index) index -= 1
        previousParent.updateLeafState()
      }
      // Moving within one store preserves selection. A different store must
      // release all old registrations before the subtree is adopted below.
      if (child.store !== this.store) child.store.deregisterNode(child)
    }

    if (!batch) {
      const children = this.getChildren(true)!;
      if (children.indexOf(child.data) === -1) {
        if (typeof index === "undefined" || index < 0) {
          children.push(child.data);
        } else {
          children.splice(index, 0, child.data);
        }
      }
    }

    let childNode: Node<T>
    if (!(child instanceof Node)) {
      objectAssign(child, {
        parent: this,
        store: this.store,
      });
      childNode = new Node(child as NodeOptions<T>);
    } else {
      childNode = child
      childNode.parent = this
      const pending = [childNode]
      while (pending.length) {
        const descendant = pending.pop()!
        descendant.store = this.store
        descendant.level = descendant.parent!.level + 1
        descendant.updateLeafState()
        this.store.registerNode(descendant)
        pending.push(...descendant.childNodes)
      }
    }

    childNode.level = this.level + 1;

    if (typeof index === "undefined" || index < 0) {
      this.childNodes.push(childNode);
    } else {
      this.childNodes.splice(index, 0, childNode);
    }

    this.updateLeafState();
  }

  insertBefore(child: Node<T> | NodeChildOptions<T>, ref?: Node<T>): void {
    let index: number | undefined;
    if (ref) {
      index = this.childNodes.indexOf(ref);
    }
    this.insertChild(child, index);
  }

  insertAfter(child: Node<T> | NodeChildOptions<T>, ref?: Node<T>): void {
    let index: number | undefined;
    if (ref) {
      index = this.childNodes.indexOf(ref);
      if (index !== -1) index += 1;
    }
    this.insertChild(child, index);
  }

  removeChild(child: Node<T>): void {
    const index = this.childNodes.indexOf(child);
    if (index === -1) return;
    const children = this.getChildren() || [];
    const dataIndex = children.indexOf(child.data);
    if (dataIndex > -1) {
      children.splice(dataIndex, 1);
    }

    this.store.deregisterNode(child);
    child.parent = null;
    this.childNodes.splice(index, 1);

    this.updateLeafState();
  }

  removeChildByData(data: T): void {
    let targetNode: Node<T> | null = null;

    for (let i = 0; i < this.childNodes.length; i++) {
      if (this.childNodes[i].data === data) {
        targetNode = this.childNodes[i];
        break;
      }
    }

    if (targetNode) {
      this.removeChild(targetNode);
    }
  }

  expand(callback?: (() => void) | null, expandParent = false): void {
    const done = () => {
      if (expandParent) {
        let parent = this.parent;
        while (parent && parent.level > 0) {
          parent.expanded = true;
          parent = parent.parent;
        }
      }
      this.expanded = true;
      if (callback) callback();
    };

    if (this.shouldLoadData()) {
      this.loadData((data) => {
        if (data instanceof Array) {
          if (this.checked) {
            this.setChecked(true, true);
          } else if (!this.store.checkStrictly) {
            reInitChecked(this);
          }
          done();
        }
      });
    } else {
      done();
    }
  }

  doCreateChildren(array: T[], defaultProps: NodeChildDefaults<T> = {}): void {
    array.forEach((item) => {
      this.insertChild(
        objectAssign({ data: item }, defaultProps) as NodeChildOptions<T>,
        undefined,
        true,
      );
    });
  }

  collapse(): void {
    this.expanded = false;
  }

  shouldLoadData(): boolean | import('./util').LoadFunction<T> | null | undefined {
    return this.store.lazy === true && this.store.load && !this.loaded;
  }

  updateLeafState(): void {
    if (
      this.store.lazy === true &&
      this.loaded !== true &&
      typeof this.isLeafByUser !== "undefined"
    ) {
      this.isLeaf = this.isLeafByUser;
      return;
    }
    const childNodes = this.childNodes;
    if (!this.store.lazy ||
      (this.store.lazy === true && this.loaded === true)
    ) {
      this.isLeaf = !childNodes || childNodes.length === 0;
      return;
    }
    this.isLeaf = false;
  }

  setChecked(
    value: boolean | 'half',
    deep = false,
    recursion = false,
    passValue?: boolean,
  ): void {
    this.indeterminate = value === "half";
    this.checked = value === true;

    if (this.store.checkStrictly) return;

    if (!(this.shouldLoadData() && !this.store.checkDescendants)) {
      let { all, allWithoutDisable } = getChildState(this.childNodes);

      if (!this.isLeaf && !all && allWithoutDisable) {
        this.checked = false;
        value = false;
      }

      const handleDescendants = () => {
        if (deep) {
          const childNodes = this.childNodes;
          for (let i = 0, j = childNodes.length; i < j; i++) {
            const child = childNodes[i];
            passValue = passValue || value !== false;
            const isCheck = child.disabled ?
              child.checked :
              passValue;
            child.setChecked(isCheck, deep, true, passValue);
          }
          const { half, all } = getChildState(childNodes);
          if (!all) {
            this.checked = all;
            this.indeterminate = half;
          }
        }
      };

      if (this.shouldLoadData()) {
        // Only work on lazy load data.
        this.loadData(
          () => {
            handleDescendants();
            reInitChecked(this);
          }, {
            checked: value !== false,
          },
        );
        return;
      } else {
        handleDescendants();
      }
    }

    const parent = this.parent;
    if (!parent || parent.level === 0) return;

    // Handle selectChildrenOnly mode
    if (this.store.selectChildrenOnly) {
      // When in selectChildrenOnly mode
      if (!recursion) {
        // If this is a direct action (not from parent/child propagation)
        if (!this.isLeaf) {
          // If this is a parent node
          if (this.indeterminate && value === true) {
            // If parent is in indeterminate state and is being checked,
            // check all children and itself
            this.indeterminate = false;
            this.checked = true;

            const childNodes = this.childNodes;
            for (let i = 0, j = childNodes.length; i < j; i++) {
              const child = childNodes[i];
              if (!child.disabled) {
                child.setChecked(true, true, true);
              }
            }
          } else if (this.checked && value === false) {
            // If parent is checked and is being unchecked,
            // uncheck all children and itself
            this.checked = false;
            this.indeterminate = false;

            const childNodes = this.childNodes;
            for (let i = 0, j = childNodes.length; i < j; i++) {
              const child = childNodes[i];
              if (!child.disabled) {
                child.setChecked(false, true, true);
              }
            }
          } else if (!this.checked && value === true) {
            // If parent is unchecked and is being checked,
            // check all children and itself
            this.checked = true;
            this.indeterminate = false;

            const childNodes = this.childNodes;
            for (let i = 0, j = childNodes.length; i < j; i++) {
              const child = childNodes[i];
              if (!child.disabled) {
                child.setChecked(true, true, true);
              }
            }
          }
        }
      }
      return;
    } else if (!recursion) {
      reInitChecked(parent);
    }
  }

  getChildren(forceInit = false): T[] | null {
    // this is data
    if (Array.isArray(this.data)) return this.data as T[];
    const data = this.data;
    if (!data) return null;

    const props = this.store.props;
    let children: TreeChildrenKey<T> = "children" as TreeChildrenKey<T>;
    if (props) {
      children = props.children || ("children" as TreeChildrenKey<T>);
    }

    const dataRecord = data as Record<string, unknown>
    if (dataRecord[children] === undefined) {
      dataRecord[children] = null;
    }

    if (forceInit && !dataRecord[children]) {
      dataRecord[children] = [];
    }

    return dataRecord[children] as T[] | null;
  }

  updateChildren(): void {
    const newData = this.getChildren() || [];
    const oldNodes = new Map(this.childNodes.map((node) => [node.data, node]))
    if (this.store.lazy) {
      // Loaded children may exist only in childNodes. Preserve their positions
      // (including append/relative inserts) when the raw children array changes.
      newData.forEach((data, index) => {
        if (!oldNodes.has(data)) this.insertChild({ data }, index)
      })
      this.updateLeafState()
      return
    }
    const retainedData = new Set(newData)
    for (const child of this.childNodes) {
      if (!retainedData.has(child.data)) {
        this.store.deregisterNode(child)
        child.parent = null
      }
    }
    this.childNodes = newData.map((data) => oldNodes.get(data) ?? new Node({
      data, parent: this, store: this.store,
    }))
    this.updateLeafState();
  }

  loadData(
    callback?: (children?: T[]) => void,
    defaultProps: NodeChildDefaults<T> = {},
  ): void {
    if (
      this.store.lazy === true &&
      this.store.load &&
      !this.loaded &&
      (!this.loading || Object.keys(defaultProps).length)
    ) {
      this.loading = true;
      const loadVersion = this._loadVersion;

      const resolve = (children: T[]) => {
        if (loadVersion !== this._loadVersion) return;
        this.loaded = true;
        this.loading = false;
        this.childNodes = [];

        this.doCreateChildren(children, defaultProps);

        this.updateLeafState();
        if (callback) {
          callback.call(this, children);
        }
      };

      this.store.load(this, resolve);
    } else {
      if (callback) {
        callback.call(this);
      }
    }
  }
}

export type TreeNode<T extends TreeNodeData = TreeNodeData> = Node<T>
