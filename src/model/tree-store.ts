import Node from './node'
import {
  getNodeKey,
  type FilterFunction,
  type LoadFunction,
  type TreeDataKey,
  type TreeKey,
  type TreeNodeData,
  type TreeOptionProps,
} from './util'

export interface TreeStoreOptions<T extends TreeNodeData> {
  data: T[]
  key?: TreeDataKey<T> | null
  props?: TreeOptionProps<T> | null
  lazy?: boolean | null
  load?: LoadFunction<T> | null
  currentNodeKey?: TreeKey | null
  checkStrictly?: boolean | null
  checkDescendants?: boolean | null
  defaultCheckedKeys?: TreeKey[] | null
  defaultExpandedKeys?: TreeKey[] | null
  autoExpandParent?: boolean | null
  defaultExpandAll?: boolean | null
  filterNodeMethod?: FilterFunction<T> | null
  selectChildrenOnly?: boolean | null
  renderAfterExpand?: boolean | null
  expandOnClickNode?: boolean | null
  checkOnClickNode?: boolean | null
  accordion?: boolean | null
  indent?: number | null
}

export type TreeNodeReference<T extends TreeNodeData> = TreeKey | T | Node<T>

export default class TreeStore<T extends TreeNodeData = TreeNodeData> {
  currentNode: Node<T> | null = null
  currentNodeKey: TreeKey | null | undefined = null
  data: T[] | null
  key?: TreeDataKey<T> | null
  props?: TreeOptionProps<T> | null
  lazy?: boolean | null
  load?: LoadFunction<T> | null
  checkStrictly?: boolean | null
  checkDescendants?: boolean | null
  defaultCheckedKeys?: TreeKey[] | null
  defaultExpandedKeys?: TreeKey[] | null
  autoExpandParent?: boolean | null
  defaultExpandAll?: boolean | null
  filterNodeMethod?: FilterFunction<T> | null
  selectChildrenOnly?: boolean | null
  renderAfterExpand?: boolean | null
  expandOnClickNode?: boolean | null
  checkOnClickNode?: boolean | null
  accordion?: boolean | null
  indent?: number | null
  nodesMap: Partial<Record<TreeKey, Node<T>>> = {}
  root: Node<T> | null

  constructor(options: TreeStoreOptions<T>) {
    this.data = options.data
    Object.assign(this, options)

    this.nodesMap = {}

    this.root = new Node({
      data: this.data,
      store: this,
    });

    if (this.lazy && this.load) {
      const loadFn = this.load;
      const root = this.root
      loadFn(root, (data) => {
        root.doCreateChildren(data);
        this._initDefaultCheckedNodes();
      });
    } else {
      this._initDefaultCheckedNodes();
    }
  }

  filter<Value>(value: Value): void {
    const filterNodeMethod = this.filterNodeMethod as FilterFunction<T, Value> | null | undefined;
    if (!filterNodeMethod || !this.root) return
    const lazy = this.lazy;
    const traverse = (node: Node<T>, isRoot = false): void => {
      const childNodes = node.childNodes;

      childNodes.forEach((child) => {
        child.visible = filterNodeMethod.call(
          child,
          value,
          child.data,
          child,
        );

        traverse(child);
      });

      if (!node.visible && childNodes.length) {
        let allHidden = true;
        allHidden = !childNodes.some((child) => child.visible);

        node.visible = allHidden === false;
      }
      if (!value) return;

      if (!isRoot && node.visible && !node.isLeaf && !lazy) node.expand();
    };

    traverse(this.root, true);
    if (this.root.childNodes.length > 0) {
      this.root.visible = this.root.childNodes.some((child) => child.visible)
    }
  }

  setData(newVal: T[]): void {
    if (!this.root) return
    const instanceChanged = newVal !== (this.root.data as unknown as T[]);
    if (instanceChanged) {
      this.root.setData(newVal);
      this._initDefaultCheckedNodes();
    } else {
      this.root.updateChildren();
    }
  }

  getNode(data: TreeNodeReference<T>): Node<T> | null {
    if (data instanceof Node) return data;
    const key =
      typeof data !== "object" ? data : getNodeKey(this.key, data);
    return key === undefined ? null : (this.nodesMap[key] || null);
  }

  insertBefore(data: T, refData: TreeNodeReference<T>): void {
    const refNode = this.getNode(refData);
    refNode!.parent!.insertBefore({ data }, refNode!);
  }

  insertAfter(data: T, refData: TreeNodeReference<T>): void {
    const refNode = this.getNode(refData);
    refNode!.parent!.insertAfter({ data }, refNode!);
  }

  remove(data: TreeNodeReference<T>): void {
    const node = this.getNode(data);

    if (node && node.parent) {
      if (node === this.currentNode) {
        this.currentNode = null;
      }
      node.parent.removeChild(node);
    }
  }

  append(data: T, parentData?: TreeNodeReference<T> | null): void {
    const parentNode = parentData ? this.getNode(parentData) : this.root;

    if (parentNode) {
      parentNode.insertChild({ data });
    }
  }

  _initDefaultCheckedNodes(): void {
    const defaultCheckedKeys = this.defaultCheckedKeys || [];
    const nodesMap = this.nodesMap;

    defaultCheckedKeys.forEach((checkedKey) => {
      const node = nodesMap[checkedKey];

      if (node) {
        node.setChecked(true, !this.checkStrictly);
      }
    });
  }

  _initDefaultCheckedNode(node: Node<T>): void {
    const defaultCheckedKeys = this.defaultCheckedKeys || [];

    const nodeKey = node.key
    if (
      nodeKey !== null &&
      nodeKey !== undefined &&
      defaultCheckedKeys.indexOf(nodeKey) !== -1
    ) {
      node.setChecked(true, !this.checkStrictly);
    }
  }

  setDefaultCheckedKey(newVal: TreeKey[]): void {
    if (newVal !== this.defaultCheckedKeys) {
      this.defaultCheckedKeys = newVal;
      this._initDefaultCheckedNodes();
    }
  }

  registerNode(node: Node<T>): void {
    const key = this.key;
    if (!key || !node || !node.data) return;

    const nodeKey = node.key;
    if (nodeKey !== undefined && nodeKey !== null) this.nodesMap[nodeKey] = node;
  }

  deregisterNode(node: Node<T>): void {
    const key = this.key;
    if (!key || !node || !node.data) return;

    // 性能优化：使用迭代而不是递归，避免调用栈过深
    const nodesToRemove = [node];

    while (nodesToRemove.length > 0) {
      const currentNode = nodesToRemove.pop();
      if (!currentNode) continue

      // 添加子节点到待处理队列
      if (currentNode.childNodes && currentNode.childNodes.length > 0) {
        nodesToRemove.push(...currentNode.childNodes);
      }

      // 删除节点映射
      const currentNodeKey = currentNode.key
      if (currentNodeKey !== undefined && currentNodeKey !== null) {
        delete this.nodesMap[currentNodeKey];
      }
    }
  }

  getCheckedNodes(leafOnly = false, includeHalfChecked = false): T[] {
    const checkedNodes: T[] = [];
    const traverse = (node: Node<T>): void => {
      const childNodes = node.childNodes;

      childNodes.forEach((child) => {
        // In selectChildrenOnly mode, only consider leaf nodes or indeterminate parent nodes
        const store = node.store;
        if (
          (child.checked ||
            (includeHalfChecked && child.indeterminate)) &&
          (!leafOnly || (leafOnly && child.isLeaf)) &&
          // In selectChildrenOnly mode, only return leaf nodes unless parent is fully checked
          (!store.selectChildrenOnly || child.isLeaf || (child.checked && !child.indeterminate))
        ) {
          checkedNodes.push(child.data);
        }

        traverse(child);
      });
    };

    if (this.root) traverse(this.root);

    return checkedNodes;
  }

  getCheckedKeys(leafOnly = false): Array<TreeKey | undefined> {
    return this.getCheckedNodes(leafOnly).map(
      (data) => this.key ? data[this.key] as TreeKey | undefined : undefined,
    );
  }

  getHalfCheckedNodes(): T[] {
    const nodes: T[] = [];
    const traverse = (node: Node<T>): void => {
      const childNodes = node.childNodes;

      childNodes.forEach((child) => {
        if (child.indeterminate) {
          nodes.push(child.data);
        }

        traverse(child);
      });
    };

    if (this.root) traverse(this.root);

    return nodes;
  }

  getHalfCheckedKeys(): Array<TreeKey | undefined> {
    return this.getHalfCheckedNodes().map((data) =>
      this.key ? data[this.key] as TreeKey | undefined : undefined,
    );
  }

  _getAllNodes(): Node<T>[] {
    const allNodes: Node<T>[] = [];
    const nodesMap = this.nodesMap;
    for (let nodeKey in nodesMap) {
      // eslint-disable-next-line no-prototype-builtins
      if (nodesMap.hasOwnProperty(nodeKey)) {
        const node = nodesMap[nodeKey]
        if (node) allNodes.push(node);
      }
    }

    return allNodes;
  }

  updateChildren(key: TreeKey, data: T[]): void {
    const node = this.nodesMap[key];
    if (!node) return;

    // 性能优化：批量清理子节点，避免逐个调用remove
    this._batchRemoveChildren(node);

    // 批量添加新的子节点
    for (let i = 0, j = data.length; i < j; i++) {
      const child = data[i];
      this.append(child, node.data);
    }
  }

  // 新增：批量清理子节点的优化方法
  _batchRemoveChildren(parentNode: Node<T>): void {
    const childNodes = parentNode.childNodes;
    if (!childNodes || childNodes.length === 0) return;

    // 批量注销所有子孙节点，避免递归调用
    const nodesToDeregister: Node<T>[] = [];
    const collectNodes = (node: Node<T>): void => {
      nodesToDeregister.push(node);
      if (node.childNodes) {
        node.childNodes.forEach(collectNodes);
      }
    };

    // 收集所有需要注销的节点
    childNodes.forEach(collectNodes);

    // 批量注销节点
    nodesToDeregister.forEach(node => {
      const nodeKey = node.key
      if (nodeKey !== undefined && nodeKey !== null) {
        delete this.nodesMap[nodeKey];
      }
      // 清理当前节点引用
      if (node === this.currentNode) {
        this.currentNode = null;
      }
    });

    // 清理父节点的children数据
    const children = parentNode.getChildren();
    if (children) {
      children.length = 0; // 清空数组
    }

    // 清空childNodes数组
    parentNode.childNodes.length = 0;

    // 更新父节点的叶子状态
    parentNode.updateLeafState();
  }

  _setCheckedKeys(
    key: TreeDataKey<T>,
    leafOnly = false,
    checkedKeys: Partial<Record<TreeKey, true>>,
  ): void {
    const allNodes = this._getAllNodes().sort((a, b) => b.level - a.level);
    const cache: Partial<Record<TreeKey, true>> = Object.create(null);
    const keys = Object.keys(checkedKeys);
    allNodes.forEach((node) => node.setChecked(false, false));
    for (let i = 0, j = allNodes.length; i < j; i++) {
      const node = allNodes[i];
      const nodeKey = (node.data[key] as TreeKey).toString();
      let checked = keys.indexOf(nodeKey) > -1;
      if (!checked) {
        if (node.checked && !cache[nodeKey]) {
          node.setChecked(false, false);
        }
        continue;
      }

      let parent = node.parent;
      while (parent && parent.level > 0) {
        cache[parent.data[key] as TreeKey] = true;
        parent = parent.parent;
      }

      if (node.isLeaf || this.checkStrictly) {
        node.setChecked(true, false);
        continue;
      }
      node.setChecked(true, true);

      if (leafOnly) {
        node.setChecked(false, false);
        const traverse = (node: Node<T>): void => {
          const childNodes = node.childNodes;
          childNodes.forEach((child) => {
            if (!child.isLeaf) {
              child.setChecked(false, false);
            }
            traverse(child);
          });
        };
        traverse(node);
      }
    }
  }

  setCheckedNodes(array: T[], leafOnly = false): void {
    const key = this.key as TreeDataKey<T>;
    const checkedKeys: Partial<Record<TreeKey, true>> = {};
    array.forEach((item) => {
      checkedKeys[item[key] as TreeKey] = true;
    });

    this._setCheckedKeys(key, leafOnly, checkedKeys);
  }

  setCheckedKeys(keys: TreeKey[], leafOnly = false): void {
    this.defaultCheckedKeys = keys;
    const key = this.key as TreeDataKey<T>;
    const checkedKeys: Partial<Record<TreeKey, true>> = {};
    keys.forEach((key) => {
      checkedKeys[key] = true;
    });

    this._setCheckedKeys(key, leafOnly, checkedKeys);
  }

  setDefaultExpandedKeys(keys: TreeKey[] | null | undefined): void {
    keys = keys || [];
    this.defaultExpandedKeys = keys;

    keys.forEach((key) => {
      const node = this.getNode(key);
      if (node) node.expand(null, this.autoExpandParent === true);
    });
  }

  setChecked(data: TreeNodeReference<T>, checked: boolean, deep = false): void {
    const node = this.getNode(data);

    if (node) {
      node.setChecked(!!checked, deep);
    }
  }

  setCheckedAll(checked = true): void {
    const allNodes = this._getAllNodes();

    for (const node of allNodes) {
      node.indeterminate = false;
      node.checked = checked;
    }
  }

  getCurrentNode(): Node<T> | null {
    return this.currentNode;
  }

  setCurrentNode(currentNode: Node<T>): void {
    const prevCurrentNode = this.currentNode;
    if (prevCurrentNode) {
      prevCurrentNode.isCurrent = false;
    }
    this.currentNode = currentNode;
    this.currentNode.isCurrent = true;
  }

  setUserCurrentNode(node: T): void {
    const key = node[this.key as TreeDataKey<T>] as TreeKey;
    const currNode = this.nodesMap[key];
    this.setCurrentNode(currNode!);
  }

  setCurrentNodeKey(key: TreeKey | null | undefined): void {
    if (key === null || key === undefined) {
      this.currentNode && (this.currentNode.isCurrent = false);
      this.currentNode = null;
      return;
    }
    const node = this.getNode(key);
    if (node) {
      this.setCurrentNode(node);
    }
  }

  // Helper method for selectChildrenOnly mode to get only leaf nodes
  getSelectedLeafNodes(): T[] {
    if (!this.selectChildrenOnly) {
      return this.getCheckedNodes(true);
    }

    const leafNodes: T[] = [];
    const traverse = (node: Node<T>): void => {
      const childNodes = node.childNodes;

      childNodes.forEach((child) => {
        if (child.checked && child.isLeaf) {
          leafNodes.push(child.data);
        }
        traverse(child);
      });
    };

    if (this.root) traverse(this.root);
    return leafNodes;
  }

  // Helper method for selectChildrenOnly mode to get only leaf keys
  getSelectedLeafKeys(): Array<TreeKey | undefined> {
    return this.getSelectedLeafNodes().map(
      (data) => this.key ? data[this.key] as TreeKey | undefined : undefined,
    );
  }

  //销毁树存储，清除所有数据和状态
  destroy(): void {
    // 清除当前节点引用
    if (this.currentNode) {
      this.currentNode.isCurrent = false;
      this.currentNode = null;
    }
    this.currentNodeKey = null;

    // 利用现有的deregisterNode方法清理所有节点
    if (this.root) {
      this.deregisterNode(this.root);
      this.root = null;
    }

    // 清空节点映射表
    this.nodesMap = {};
    // 清除所有配置选项和状态
    this.data = null;
    this.lazy = null;
    this.load = null;
    this.filterNodeMethod = null;
    this.key = null;
    this.defaultCheckedKeys = null;
    this.defaultExpandedKeys = null;
    this.checkStrictly = null;
    this.selectChildrenOnly = null;
    this.autoExpandParent = null;

    // 清除其他可能的属性
    if (Object.prototype.hasOwnProperty.call(this, 'props')) this.props = null;
    if (Object.prototype.hasOwnProperty.call(this, 'renderAfterExpand')) this.renderAfterExpand = null;
    if (Object.prototype.hasOwnProperty.call(this, 'checkDescendants')) this.checkDescendants = null;
    if (Object.prototype.hasOwnProperty.call(this, 'defaultExpandAll')) this.defaultExpandAll = null;
    if (Object.prototype.hasOwnProperty.call(this, 'expandOnClickNode')) this.expandOnClickNode = null;
    if (Object.prototype.hasOwnProperty.call(this, 'checkOnClickNode')) this.checkOnClickNode = null;
    if (Object.prototype.hasOwnProperty.call(this, 'accordion')) this.accordion = null;
    if (Object.prototype.hasOwnProperty.call(this, 'indent')) this.indent = null;
  }
}
