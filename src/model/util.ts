import type Node from './node'

export type TreeKey = string | number
export type TreeNodeData = object
export type TreeDataKey<T extends TreeNodeData> = Extract<keyof T, string>
export type KeysMatching<T extends object, Value> = {
  [Key in keyof T]-?:
    [NonNullable<T[Key]>] extends [never]
      ? never
      : NonNullable<T[Key]> extends Value
        ? Key
        : never
}[keyof T] & string
export type TreeNodeKey<T extends TreeNodeData> = KeysMatching<T, TreeKey>
export type TreeChildrenKey<T extends TreeNodeData> = KeysMatching<T, T[]>
export type TreeBooleanKey<T extends TreeNodeData> = KeysMatching<T, boolean>
export type TreePropertyGetter<
  T extends TreeNodeData,
  Value = unknown,
> = (data: T, node: Node<T>) => Value
export type TreeProperty<
  T extends TreeNodeData,
  Value = unknown,
> = TreeDataKey<T> | TreePropertyGetter<T, Value>

export type TreeOptionProps<T extends TreeNodeData = TreeNodeData> = {
  children?: TreeChildrenKey<T>
  label?: TreeProperty<T>
  disabled?: TreeBooleanKey<T> | TreePropertyGetter<T>
  isLeaf?: TreeBooleanKey<T> | TreePropertyGetter<T, boolean>
} & Partial<Record<string, TreeProperty<T>>>

export type LoadResolve<T extends TreeNodeData> = (data: T[]) => void
export type LoadFunction<T extends TreeNodeData = TreeNodeData> = (
  node: Node<T>,
  resolve: LoadResolve<T>,
) => void
export type FilterFunction<
  T extends TreeNodeData = TreeNodeData,
  Value = unknown,
> = {
  bivarianceHack(value: Value, data: T, node: Node<T>): boolean
}['bivarianceHack']

export const NODE_KEY = '$treeNodeId'

export interface MarkedTreeNodeData {
  [NODE_KEY]?: number
}

export const markNodeData = (
  node: Pick<Node<TreeNodeData>, 'id'>,
  data: TreeNodeData | null | undefined,
): void => {
  const dataRecord = data as MarkedTreeNodeData | null | undefined
  if (!dataRecord || dataRecord[NODE_KEY]) return
  Object.defineProperty(data, NODE_KEY, {
    value: node.id,
    enumerable: false,
    configurable: false,
    writable: false,
  })
}

export const getNodeKey = <T extends TreeNodeData>(
  key: TreeNodeKey<T> | null | undefined,
  data: T,
): TreeKey | undefined => {
  const dataRecord = data as Record<string, unknown>
  if (!key) return dataRecord[NODE_KEY] as number | undefined
  return dataRecord[key] as TreeKey | undefined
}

export const arrayFindIndex = <T>(
  arr: readonly T[],
  pred: (value: T, index: number) => boolean,
): number => {
  for (let i = 0; i !== arr.length; ++i) {
    if (pred(arr[i], i)) {
      return i
    }
  }
  return -1
}

export const objectAssign = <T extends object>(
  target: T,
  ...sources: ReadonlyArray<object | null | undefined>
): T => {
  const targetRecord = target as Record<string, unknown>
  for (const candidate of sources) {
    const source = (candidate || {}) as Record<string, unknown>
    for (const prop in source) {
      if (Object.prototype.hasOwnProperty.call(source, prop)) {
        const value = source[prop]
        if (value !== undefined) {
          targetRecord[prop] = value
        }
      }
    }
  }
  return target
}
