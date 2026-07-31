<template>
  <div class="app-shell" :data-theme="theme">
    <header class="app-header">
      <div class="brand-line">
        <span class="brand-mark" aria-hidden="true">VT</span>
        <div>
          <p class="eyebrow">@zjinh/vue-virtual-tree</p>
          <h1>API workbench</h1>
        </div>
        <span class="runtime-badge">{{ runtimeName }}</span>
      </div>
      <div class="header-actions">
        <span class="runtime-context">{{ nodeScaleLabel }} · {{ browserLabel }}</span>
        <button class="button button-muted" type="button" @click="toggleTheme">
          {{ theme === 'dark' ? 'Use light theme' : 'Use dark theme' }}
        </button>
      </div>
    </header>

    <main class="workbench-grid">
      <aside class="panel props-panel" aria-labelledby="props-heading">
        <div class="panel-heading sticky-heading">
          <div>
            <p class="section-kicker">Contract</p>
            <h2 id="props-heading">Props <span class="count">21 + 1</span></h2>
          </div>
          <button
            class="button button-primary"
            type="button"
            :disabled="busy"
            @click="applyAndRemount"
          >
            Apply / Remount
          </button>
        </div>
        <p class="panel-note">
          Initialization-only values are applied by remounting the real component.
        </p>

        <div class="prop-list">
          <div
            v-for="prop in treeProps"
            :key="prop.name"
            class="prop-row"
            :class="{ 'is-unsupported': prop.support === 'unsupported' }"
          >
            <div class="prop-meta">
              <code>{{ prop.name }}</code>
              <span v-if="prop.initializationOnly" class="tag">remount</span>
              <span v-if="prop.support === 'unsupported'" class="tag tag-danger">unsupported</span>
            </div>
            <div class="prop-control">
              <label v-if="prop.control === 'boolean'" class="switch-control">
                <input
                  type="checkbox"
                  :checked="Boolean(draftOptions[prop.name])"
                  @change="setDraftBoolean(prop.name, $event)"
                >
                <span>{{ draftOptions[prop.name] ? 'true' : 'false' }}</span>
              </label>
              <input
                v-else-if="prop.control === 'number'"
                class="compact-input"
                type="number"
                :min="prop.name === 'height' ? 220 : 0"
                :value="draftOptions[prop.name]"
                @input="setDraftNumber(prop.name, $event)"
              >
              <input
                v-else-if="prop.control === 'text'"
                class="compact-input"
                type="text"
                :value="draftOptions[prop.name]"
                @input="setDraftText(prop.name, $event)"
              >
              <span v-else class="fixed-value">{{ displayPropValue(prop.name) }}</span>
            </div>
            <p class="prop-detail">
              {{ prop.type }} · default {{ prop.defaultValue }}<span v-if="prop.note"> · {{ prop.note }}</span>
            </p>
          </div>
        </div>
      </aside>

      <section class="center-column" aria-label="Tree and performance experiments">
        <section class="panel tree-panel" aria-labelledby="tree-heading">
          <div class="panel-heading tree-heading">
            <div>
              <p class="section-kicker">Live component</p>
              <h2 id="tree-heading">Virtual tree</h2>
            </div>
            <div class="dataset-actions" aria-label="Dataset presets">
              <button
                v-for="preset in presets"
                :key="preset"
                class="button button-muted compact-button"
                type="button"
                :disabled="busy"
                @click="loadDataset(preset)"
              >
                {{ formatCompact(preset) }}
              </button>
            </div>
          </div>

          <div class="tree-toolbar">
            <label class="field-group grow-field">
              <span>Filter</span>
              <input v-model="filterQuery" type="search" placeholder="Filter labels">
            </label>
            <label class="field-group target-field">
              <span>Target key</span>
              <input v-model="targetKey" type="text">
            </label>
            <button class="button button-primary toolbar-button" type="button" :disabled="busy" @click="runNamedMethod('filter')">
              Run filter
            </button>
            <button class="button button-muted toolbar-button" type="button" :disabled="busy" @click="resetScenario">
              Reset
            </button>
          </div>

          <div class="tree-frame" :style="{ height: `${appliedOptions.height}px` }" :aria-busy="busy ? 'true' : 'false'">
            <div v-if="busy" class="busy-bar" role="status">{{ busyLabel }}</div>
            <vue-virtual-tree
              :key="treeVersion"
              ref="tree"
              :data="treeData"
              :empty-text="appliedOptions.emptyText"
              node-key="id"
              :check-strictly="appliedOptions.checkStrictly"
              :default-expand-all="appliedOptions.defaultExpandAll"
              :check-descendants="appliedOptions.checkDescendants"
              :select-children-only="appliedOptions.selectChildrenOnly"
              :item-size="appliedOptions.itemSize"
              :auto-expand-parent="appliedOptions.autoExpandParent"
              :default-checked-keys="parseKeyList(appliedOptions.defaultCheckedKeys)"
              :default-expanded-keys="parseKeyList(appliedOptions.defaultExpandedKeys)"
              :current-node-key="appliedOptions.currentNodeKey || undefined"
              :show-checkbox="appliedOptions.showCheckbox"
              :props="treeOptionProps"
              :lazy="appliedOptions.lazy"
              :highlight-current="appliedOptions.highlightCurrent"
              :load="loadLazyNode"
              :filter-node-method="filterNode"
              :indent="appliedOptions.indent"
              :icon-class="appliedOptions.iconClass"
              :height="appliedOptions.height"
              @node-click="onNodeClick"
              @node-contextmenu="onNodeContextmenu"
              @current-change="onCurrentChange"
              @node-expand="onNodeExpand"
              @node-collapse="onNodeCollapse"
              @check-change="onCheckChange"
              @check="onCheck"
            >
              <template v-slot="{ node, item, selectChange }">
                <div class="demo-tree-node" :class="{ 'is-current': node.isCurrent }">
                  <span class="node-indent" :style="{ width: `${Math.max(0, node.level - 1) * appliedOptions.indent}px` }"></span>
                  <button
                    class="node-expand-button"
                    type="button"
                    :disabled="node.isLeaf"
                    :aria-label="node.isLeaf ? `Leaf node ${item.label}` : (node.expanded ? `Collapse ${item.label}` : `Expand ${item.label}`)"
                    :aria-expanded="node.isLeaf ? undefined : node.expanded"
                    @click.stop="toggleSlotNode(node)"
                  >
                    {{ node.isLeaf ? '·' : (node.expanded ? '−' : '+') }}
                  </button>
                  <input
                    v-if="appliedOptions.showCheckbox"
                    class="node-checkbox"
                    type="checkbox"
                    :checked="node.checked"
                    :disabled="Boolean(node.disabled)"
                    :aria-label="`Select ${item.label}`"
                    @change.stop="applySlotSelection(selectChange, $event)"
                  >
                  <span class="node-label">{{ item.label }}</span>
                  <code class="node-key">{{ item.id }}</code>
                  <span v-if="node.loading" class="node-state">loading</span>
                </div>
              </template>
            </vue-virtual-tree>
          </div>
          <p class="slot-note">
            The default scoped slot renders every visible row. Its checkbox calls the exposed
            <code>selectChange(checked)</code> function.
          </p>
        </section>

        <section class="panel performance-panel" aria-labelledby="performance-heading">
          <div class="panel-heading">
            <div>
              <p class="section-kicker">Measured in this browser</p>
              <h2 id="performance-heading">Performance laboratory</h2>
            </div>
            <time class="measurement-time">{{ measurementTime || 'Not measured' }}</time>
          </div>

          <dl class="metric-grid">
            <div>
              <dt>Logical nodes</dt>
              <dd>{{ formatNumber(totalNodes) }}</dd>
            </div>
            <div>
              <dt>Rendered DOM rows</dt>
              <dd>{{ formatNumber(renderedNodes) }}</dd>
            </div>
            <div>
              <dt>Virtualized</dt>
              <dd>{{ virtualizationRatio === null ? 'N/A' : `${virtualizationRatio}%` }}</dd>
            </div>
            <div>
              <dt>JS heap</dt>
              <dd>{{ memoryLabel }}</dd>
            </div>
          </dl>

          <div class="benchmark-actions" aria-label="Performance operations">
            <button class="button button-muted" type="button" :disabled="busy" @click="measureTreeMethod('filter')">Measure filter</button>
            <button class="button button-muted" type="button" :disabled="busy" @click="measureTreeMethod('setCheckedAll')">Measure setCheckedAll</button>
            <button class="button button-muted" type="button" :disabled="busy" @click="measureTreeMethod('scrollToItem')">Measure scrollToItem</button>
            <button class="button button-primary" type="button" :disabled="busy" @click="sampleScrollFrames">Sample scroll frames</button>
          </div>

          <div class="benchmark-table-wrap">
            <table class="benchmark-table">
              <thead>
                <tr><th>Operation</th><th>Duration</th><th>Observed result</th></tr>
              </thead>
              <tbody>
                <tr v-if="benchmarks.length === 0"><td colspan="3">Run a dataset or operation to collect local measurements.</td></tr>
                <tr v-for="entry in benchmarks" :key="entry.id">
                  <td>{{ entry.name }}</td>
                  <td><code>{{ formatDuration(entry.durationMs) }}</code></td>
                  <td>{{ entry.detail }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="frame-summary">
            <span>Frames <strong>{{ frameSummary.frameCount }}</strong></span>
            <span>p95 <strong>{{ frameSummary.p95Ms === null ? 'N/A' : formatDuration(frameSummary.p95Ms) }}</strong></span>
            <span>Long frames <strong>{{ frameSummary.longFrames }}</strong></span>
          </div>
          <p class="runtime-footnote">{{ runtimeName }} · {{ browserLabel }} · {{ nodeScaleLabel }} · local high-resolution timer</p>
        </section>
      </section>

      <aside class="inspector-column">
        <section class="panel method-panel" aria-labelledby="methods-heading">
          <div class="panel-heading sticky-heading">
            <div>
              <p class="section-kicker">Real component ref</p>
              <h2 id="methods-heading">Methods <span class="count">23</span></h2>
            </div>
          </div>
          <div class="method-groups">
            <section v-for="group in methodGroups" :key="group.name" class="method-group">
              <h3>{{ group.name }}</h3>
              <button
                v-for="method in group.methods"
                :key="method.name"
                class="method-action"
                type="button"
                :disabled="busy"
                @click="runNamedMethod(method.name)"
              >
                <span><code>{{ method.name }}</code><small>{{ method.signature }}</small></span>
                <span aria-hidden="true">Run</span>
              </button>
            </section>
          </div>
        </section>

        <section class="panel output-panel" aria-labelledby="results-heading">
          <div class="panel-heading">
            <div>
              <p class="section-kicker">Bounded to 40</p>
              <h2 id="results-heading">Method results</h2>
            </div>
            <button class="text-button" type="button" @click="methodResults = []">Clear</button>
          </div>
          <ol class="log-list method-results" aria-live="polite">
            <li v-if="methodResults.length === 0" class="empty-log">No method executed.</li>
            <li v-for="result in methodResults" :key="result.id" :class="{ 'has-error': result.error }">
              <div><code>{{ result.name }}</code><time>{{ result.time }}</time></div>
              <p>{{ result.error ? 'Error' : 'Return' }} · {{ result.value }}</p>
              <small>{{ formatDuration(result.durationMs) }}</small>
            </li>
          </ol>
        </section>

        <section class="panel output-panel" aria-labelledby="events-heading">
          <div class="panel-heading">
            <div>
              <p class="section-kicker">7 listeners · bounded to 80</p>
              <h2 id="events-heading">Event log</h2>
            </div>
            <button class="text-button" type="button" @click="eventLog = []">Clear</button>
          </div>
          <ol class="log-list event-results" aria-live="polite">
            <li v-if="eventLog.length === 0" class="empty-log">Interact with a node to inspect emitted payloads.</li>
            <li v-for="event in eventLog" :key="event.id">
              <div><code>{{ event.name }}</code><time>{{ event.time }}</time></div>
              <p>{{ event.payload }}</p>
            </li>
          </ol>
        </section>
      </aside>
    </main>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { TREE_EVENTS, TREE_METHODS, TREE_PROPS } from './api-manifest'
import type { MethodManifestItem } from './api-manifest'
import {
  calculateVirtualizationRatio,
  nextAnimationFrame,
  readBrowserMemory,
  summarizeFrameSample,
  waitForStablePaint,
} from './benchmark'
import type { FrameSummary } from './benchmark'
import {
  BENCHMARK_PRESETS,
  countTreeNodes,
  createLazyChildren,
  createLazyDemoData,
  findTreeNode,
  generateTreeData,
} from './data'
import type { DemoTreeNode } from './data'
import { METHOD_ACTIONS } from './method-actions'
import type { DemoTreeApi, MethodActionContext } from './method-actions'

interface DemoOptions {
  [key: string]: string | number | boolean
  emptyText: string
  checkStrictly: boolean
  defaultExpandAll: boolean
  checkDescendants: boolean
  selectChildrenOnly: boolean
  itemSize: number
  autoExpandParent: boolean
  defaultCheckedKeys: string
  defaultExpandedKeys: string
  currentNodeKey: string
  showCheckbox: boolean
  lazy: boolean
  highlightCurrent: boolean
  indent: number
  iconClass: string
  height: number
}

interface BenchmarkEntry {
  id: number
  name: string
  durationMs: number
  detail: string
}

interface ResultEntry {
  id: number
  name: string
  durationMs: number
  value: string
  error: boolean
  time: string
}

interface EventEntry {
  id: number
  name: string
  payload: string
  time: string
}

interface MethodGroup {
  name: MethodManifestItem['group']
  methods: MethodManifestItem[]
}

interface SlotNode {
  checked: boolean
  disabled?: unknown
  expanded: boolean
  isCurrent: boolean
  isLeaf: boolean
  level: number
  loading: boolean
  collapse(): void
  expand(): void
}

const initialOptions = (): DemoOptions => ({
  emptyText: 'No matching package nodes',
  checkStrictly: false,
  defaultExpandAll: true,
  checkDescendants: false,
  selectChildrenOnly: false,
  itemSize: 28,
  autoExpandParent: true,
  defaultCheckedKeys: 'node-8,node-9',
  defaultExpandedKeys: 'node-1,node-2,node-3',
  currentNodeKey: 'node-12',
  showCheckbox: true,
  lazy: false,
  highlightCurrent: true,
  indent: 16,
  iconClass: '',
  height: 420,
})

const METHOD_GROUP_ORDER: MethodManifestItem['group'][] = [
  'Navigation',
  'Query',
  'Selection',
  'Current',
  'Mutation',
]

export default defineComponent({
  name: 'ApiWorkbench',
  data() {
    const options = initialOptions()
    const initialData = generateTreeData(1_000)
    const preferredTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'

    return {
      runtimeName: __DEMO_RUNTIME__,
      theme: preferredTheme,
      treeProps: TREE_PROPS,
      treeEvents: TREE_EVENTS,
      presets: BENCHMARK_PRESETS,
      draftOptions: { ...options } as DemoOptions,
      appliedOptions: { ...options } as DemoOptions,
      treeOptionProps: {
        children: 'children',
        label: 'label',
        disabled: 'disabled',
        isLeaf: 'leaf',
      },
      treeData: initialData as DemoTreeNode[],
      totalNodes: countTreeNodes(initialData),
      renderedNodes: 0,
      virtualizationRatio: null as number | null,
      memoryBytes: null as number | null,
      measurementTime: '',
      filterQuery: '',
      targetKey: 'node-250',
      treeVersion: 0,
      mutationSequence: 0,
      busy: false,
      busyLabel: '',
      benchmarks: [] as BenchmarkEntry[],
      benchmarkSequence: 0,
      frameSummary: { frameCount: 0, p95Ms: null, longFrames: 0 } as FrameSummary,
      methodResults: [] as ResultEntry[],
      resultSequence: 0,
      eventLog: [] as EventEntry[],
      eventSequence: 0,
    }
  },
  computed: {
    methodGroups(): MethodGroup[] {
      return METHOD_GROUP_ORDER.map((name) => ({
        name,
        methods: TREE_METHODS.filter((method) => method.group === name),
      }))
    },
    browserLabel(): string {
      const match = navigator.userAgent.match(/(Chrome|Firefox|Version)\/([\d.]+)/)
      if (!match) return navigator.userAgent.split(' ').slice(-1)[0] || 'Unknown browser'
      return `${match[1] === 'Version' ? 'Safari' : match[1]} ${match[2]}`
    },
    nodeScaleLabel(): string {
      return `${this.formatCompact(this.totalNodes)} logical nodes`
    },
    memoryLabel(): string {
      if (this.memoryBytes === null) return 'N/A'
      return `${(this.memoryBytes / 1024 / 1024).toFixed(1)} MiB`
    },
  },
  mounted() {
    void this.refreshObservedMetrics()
  },
  methods: {
    toggleTheme(): void {
      this.theme = this.theme === 'dark' ? 'light' : 'dark'
    },
    setDraftBoolean(name: string, event: Event): void {
      const input = event.target as HTMLInputElement
      this.draftOptions[name] = input.checked
    },
    setDraftNumber(name: string, event: Event): void {
      const input = event.target as HTMLInputElement
      this.draftOptions[name] = Number(input.value)
    },
    setDraftText(name: string, event: Event): void {
      const input = event.target as HTMLInputElement
      this.draftOptions[name] = input.value
    },
    displayPropValue(name: string): string {
      const values: Record<string, string> = {
        data: `${this.formatCompact(this.totalNodes)} generated nodes`,
        nodeKey: 'id',
        props: '{ label, children, disabled, isLeaf }',
        load: 'lazy resolver',
        filterNodeMethod: 'case-insensitive label match',
        renderContent: 'Use default scoped slot',
      }
      return values[name] ?? 'Configured by scenario'
    },
    parseKeyList(value: string | number | boolean): string[] {
      if (typeof value !== 'string') return []
      return value.split(',').map((key) => key.trim()).filter(Boolean)
    },
    applyAndRemount(): void {
      this.appliedOptions = { ...this.draftOptions }
      if (this.appliedOptions.lazy) {
        this.treeData = createLazyDemoData()
        this.totalNodes = countTreeNodes(this.treeData)
        this.targetKey = 'lazy-root'
      }
      this.treeVersion += 1
      void this.refreshObservedMetrics()
    },
    resetScenario(): void {
      const options = initialOptions()
      const data = generateTreeData(1_000)
      this.draftOptions = { ...options }
      this.appliedOptions = { ...options }
      this.treeData = data
      this.totalNodes = countTreeNodes(data)
      this.targetKey = 'node-250'
      this.filterQuery = ''
      this.treeVersion += 1
      this.frameSummary = { frameCount: 0, p95Ms: null, longFrames: 0 }
      void this.refreshObservedMetrics()
    },
    async loadDataset(total: number): Promise<void> {
      if (this.busy) return
      this.setBusy(`Generating ${this.formatNumber(total)} nodes`)
      try {
        const generationStart = performance.now()
        const data = generateTreeData(total)
        const generationDuration = performance.now() - generationStart
        this.addBenchmark('generate data', generationDuration, `${countTreeNodes(data)} deterministic nodes`)

        this.draftOptions.lazy = false
        this.draftOptions.defaultExpandAll = true
        this.appliedOptions = { ...this.draftOptions }
        const commitStart = performance.now()
        this.treeData = data
        this.totalNodes = countTreeNodes(data)
        this.targetKey = `node-${Math.min(total, Math.max(1, Math.floor(total * 0.75)))}`
        this.treeVersion += 1
        await waitForStablePaint(() => this.$nextTick())
        const commitDuration = performance.now() - commitStart
        this.addBenchmark('submit → stable paint', commitDuration, `${this.formatCompact(total)} logical nodes`)
        await this.refreshObservedMetrics()
      } catch (error) {
        this.recordMethodResult('loadDataset', performance.now(), undefined, error)
      } finally {
        this.clearBusy()
      }
    },
    filterNode(value: unknown, data: DemoTreeNode): boolean {
      const query = String(value ?? '').trim().toLowerCase()
      return query.length === 0 || data.label.toLowerCase().includes(query)
    },
    loadLazyNode(
      node: { data: DemoTreeNode; level: number },
      resolve: (children: DemoTreeNode[]) => void,
    ): void {
      window.setTimeout(() => resolve(createLazyChildren({ ...node.data, level: node.level })), 180)
    },
    toggleSlotNode(node: SlotNode): void {
      if (node.isLeaf) return
      if (node.expanded) node.collapse()
      else node.expand()
    },
    applySlotSelection(selectChange: (checked: boolean) => void, event: Event): void {
      selectChange((event.target as HTMLInputElement).checked)
    },
    getTree(): DemoTreeApi {
      const tree = this.$refs.tree as unknown as DemoTreeApi | undefined
      if (!tree) throw new Error('Tree ref is not mounted')
      return tree
    },
    createMutationNode(label: string): DemoTreeNode {
      this.mutationSequence += 1
      return {
        id: `mutation-${this.mutationSequence}`,
        label: `${label} ${this.mutationSequence}`,
        level: 1,
      }
    },
    getActionContext(): MethodActionContext {
      const context = {
        tree: this.getTree(),
        targetKey: this.targetKey,
        query: this.filterQuery,
        createMutationNode: (label: string) => this.createMutationNode(label),
      }
      Object.defineProperty(context, 'targetNode', {
        enumerable: true,
        get: () => {
          const targetNode = findTreeNode(this.treeData, this.targetKey)
          if (!targetNode) throw new Error(`Target ${this.targetKey} is not present in the current data`)
          return targetNode
        },
      })
      return context as MethodActionContext
    },
    async runNamedMethod(name: string): Promise<void> {
      const action = METHOD_ACTIONS[name]
      const startedAt = performance.now()
      if (!action) {
        this.recordMethodResult(name, startedAt, undefined, new Error('No registered action'))
        return
      }
      if (this.busy) return
      if (this.totalNodes >= 50_000) this.setBusy(`Running ${name} on ${this.formatCompact(this.totalNodes)} nodes`)
      try {
        const result = await action.run(this.getActionContext())
        this.recordMethodResult(name, startedAt, result)
        await this.$nextTick()
        await this.refreshObservedMetrics()
      } catch (error) {
        this.recordMethodResult(name, startedAt, undefined, error)
      } finally {
        this.clearBusy()
      }
    },
    async measureTreeMethod(name: string): Promise<void> {
      const startedAt = performance.now()
      await this.runNamedMethod(name)
      const stableDuration = performance.now() - startedAt
      const lastResult = this.methodResults[0]
      if (lastResult?.name === name) {
        this.addBenchmark(name, stableDuration, lastResult.error ? lastResult.value : `return ${lastResult.value}`)
      } else {
        this.addBenchmark(name, stableDuration, 'No result entry observed')
      }
    },
    recordMethodResult(name: string, startedAt: number, value?: unknown, caughtError?: unknown): void {
      this.resultSequence += 1
      const error = caughtError instanceof Error ? caughtError : null
      const entry: ResultEntry = {
        id: this.resultSequence,
        name,
        durationMs: performance.now() - startedAt,
        value: error ? error.message : this.serializeValue(value),
        error: Boolean(error),
        time: new Date().toLocaleTimeString(),
      }
      this.methodResults = [entry, ...this.methodResults].slice(0, 40)
    },
    serializeValue(value: unknown): string {
      if (value === undefined) return 'undefined'
      if (value === null) return 'null'
      try {
        const seen = new WeakSet<object>()
        return JSON.stringify(value, (_key, candidate) => {
          if (candidate && typeof candidate === 'object') {
            const record = candidate as Record<string, unknown>
            if (candidate instanceof Event) {
              return { eventType: candidate.type }
            }
            if ('data' in record && 'level' in record) {
              const data = record.data as Record<string, unknown> | undefined
              return { nodeKey: data?.id ?? null, level: record.level }
            }
            if ('node' in record) {
              const instanceNode = record.node as Record<string, unknown> | undefined
              const data = instanceNode?.data as Record<string, unknown> | undefined
              return { instanceNodeKey: data?.id ?? null }
            }
            if ('id' in record && 'label' in record) {
              const children = Array.isArray(record.children) ? record.children.length : 0
              return { id: record.id, label: record.label, children }
            }
            if (seen.has(candidate)) return '[Circular]'
            seen.add(candidate)
          }
          return candidate
        }).slice(0, 1_200)
      } catch (error) {
        return `Serialization error: ${error instanceof Error ? error.message : String(error)}`
      }
    },
    addBenchmark(name: string, durationMs: number, detail: string): void {
      this.benchmarkSequence += 1
      this.benchmarks = [{ id: this.benchmarkSequence, name, durationMs, detail }, ...this.benchmarks].slice(0, 20)
      this.measurementTime = new Date().toLocaleString()
    },
    async refreshObservedMetrics(): Promise<void> {
      await this.$nextTick()
      await nextAnimationFrame()
      this.renderedNodes = document.querySelectorAll('.tree-frame .virtual-tree-node').length
      this.virtualizationRatio = calculateVirtualizationRatio(this.renderedNodes, this.totalNodes)
      this.memoryBytes = readBrowserMemory()
      this.measurementTime = new Date().toLocaleString()
    },
    async sampleScrollFrames(): Promise<void> {
      if (this.busy) return
      const scroller = document.querySelector<HTMLElement>('.tree-frame .virtual-tree')
      if (!scroller) {
        this.recordMethodResult('scroll frame sample', performance.now(), undefined, new Error('Virtual list scroller not found'))
        return
      }
      this.setBusy('Sampling one virtual-list scroll')
      const frames: number[] = []
      const sampleStart = performance.now()
      let previous = sampleStart
      const startScrollTop = scroller.scrollTop
      const maxScrollTop = Math.max(0, scroller.scrollHeight - scroller.clientHeight)

      await new Promise<void>((resolve) => {
        const step = (now: number): void => {
          frames.push(now - previous)
          previous = now
          const progress = Math.min(1, (now - sampleStart) / 700)
          scroller.scrollTop = startScrollTop + (maxScrollTop - startScrollTop) * progress
          scroller.dispatchEvent(new Event('scroll'))
          if (progress < 1) requestAnimationFrame(step)
          else resolve()
        }
        requestAnimationFrame(step)
      })

      this.frameSummary = summarizeFrameSample(frames)
      this.addBenchmark(
        'scroll frame sample',
        performance.now() - sampleStart,
        `${frames.length} frames; ${this.frameSummary.longFrames} over 50 ms`,
      )
      await this.refreshObservedMetrics()
      this.clearBusy()
    },
    setBusy(label: string): void {
      this.busy = true
      this.busyLabel = label
    },
    clearBusy(): void {
      this.busy = false
      this.busyLabel = ''
    },
    recordEvent(name: string, payload: unknown[]): void {
      this.eventSequence += 1
      const entry: EventEntry = {
        id: this.eventSequence,
        name,
        payload: this.serializeValue(payload),
        time: new Date().toLocaleTimeString(),
      }
      this.eventLog = [entry, ...this.eventLog].slice(0, 80)
    },
    onNodeClick(...payload: unknown[]): void { this.recordEvent('node-click', payload) },
    onNodeContextmenu(...payload: unknown[]): void {
      const event = payload[0]
      if (event instanceof Event) event.preventDefault()
      this.recordEvent('node-contextmenu', payload)
    },
    onCurrentChange(...payload: unknown[]): void { this.recordEvent('current-change', payload) },
    onNodeExpand(...payload: unknown[]): void { this.recordEvent('node-expand', payload) },
    onNodeCollapse(...payload: unknown[]): void { this.recordEvent('node-collapse', payload) },
    onCheckChange(...payload: unknown[]): void { this.recordEvent('check-change', payload) },
    onCheck(...payload: unknown[]): void { this.recordEvent('check', payload) },
    formatCompact(value: number): string {
      return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 0 }).format(value)
    },
    formatNumber(value: number): string {
      return new Intl.NumberFormat('en').format(value)
    },
    formatDuration(value: number): string {
      return `${value.toFixed(value >= 100 ? 0 : 2)} ms`
    },
  },
})
</script>

<style src="./styles.css"></style>
