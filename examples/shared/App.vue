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
            :id="propRowId(prop.name)"
            class="prop-row"
            :class="{ 'is-unsupported': prop.support === 'unsupported' }"
            :aria-labelledby="propLabelId(prop.name)"
            :aria-describedby="propDescriptionId(prop.name)"
          >
            <div class="prop-meta">
              <code :id="propLabelId(prop.name)">{{ prop.name }}</code>
              <span v-if="prop.initializationOnly" class="tag">remount</span>
              <span v-if="prop.support === 'unsupported'" class="tag tag-danger">unsupported</span>
            </div>
            <div class="prop-control">
              <label v-if="prop.control === 'boolean'" class="switch-control">
                <input
                  :id="propControlId(prop.name)"
                  type="checkbox"
                  :checked="Boolean(draftOptions[prop.name])"
                  :aria-labelledby="propLabelId(prop.name)"
                  :aria-describedby="propDescriptionId(prop.name)"
                  @change="setDraftBoolean(prop.name, $event)"
                >
                <span>{{ draftOptions[prop.name] ? 'true' : 'false' }}</span>
              </label>
              <input
                v-else-if="prop.control === 'number'"
                :id="propControlId(prop.name)"
                class="compact-input"
                type="number"
                :min="numberOptionMin(prop.name)"
                :max="numberOptionMax(prop.name)"
                :value="draftOptions[prop.name]"
                :aria-labelledby="propLabelId(prop.name)"
                :aria-describedby="propDescriptionId(prop.name)"
                @input="setDraftNumber(prop.name, $event)"
              >
              <input
                v-else-if="prop.control === 'text'"
                :id="propControlId(prop.name)"
                class="compact-input"
                type="text"
                :value="draftOptions[prop.name]"
                :aria-labelledby="propLabelId(prop.name)"
                :aria-describedby="propDescriptionId(prop.name)"
                @input="setDraftText(prop.name, $event)"
              >
              <span v-else class="fixed-value">{{ displayPropValue(prop.name) }}</span>
            </div>
            <p :id="propDescriptionId(prop.name)" class="prop-detail">
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
                class="button button-muted compact-button content-mode-button"
                type="button"
                :aria-pressed="customSlotEnabled ? 'true' : 'false'"
                :disabled="busy"
                @click="toggleNodeContentMode"
              >
                {{ customSlotEnabled ? 'Scoped slot content' : 'Built-in node content' }}
              </button>
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
            <div v-if="customSlotEnabled" class="custom-node-content">
              <vue-virtual-tree
                :key="`custom-${treeVersion}`"
                ref="tree"
                v-bind="treeBindings"
                @node-click="onNodeClick"
                @node-contextmenu="onNodeContextmenu"
                @current-change="onCurrentChange"
                @node-expand="onNodeExpand"
                @node-collapse="onNodeCollapse"
                @check-change="onCheckChange"
                @check="onCheck"
              >
                <template v-slot="{ node, item, selectChange }">
                  <div
                    class="demo-tree-node"
                    :class="{ 'is-current': appliedOptions.highlightCurrent && node.isCurrent }"
                  >
                    <span class="node-indent" :style="{ width: `${Math.max(0, node.level - 1) * appliedOptions.indent}px` }"></span>
                    <input
                      v-if="appliedOptions.showCheckbox"
                      class="node-checkbox"
                      type="checkbox"
                      :checked="node.checked"
                      :disabled="Boolean(node.disabled)"
                      :aria-label="`Select ${item.label}`"
                      @click.stop
                      @change.stop="applySlotSelection(selectChange, $event)"
                    >
                    <span class="node-label">{{ item.label }}</span>
                    <code class="node-key">{{ item.id }}</code>
                    <span v-if="node.loading" class="node-state">loading</span>
                  </div>
                </template>
              </vue-virtual-tree>
            </div>
            <div v-else class="default-node-content">
              <vue-virtual-tree
                :key="`default-${treeVersion}`"
                ref="tree"
                v-bind="treeBindings"
                @node-click="onNodeClick"
                @node-contextmenu="onNodeContextmenu"
                @current-change="onCurrentChange"
                @node-expand="onNodeExpand"
                @node-collapse="onNodeCollapse"
                @check-change="onCheckChange"
                @check="onCheck"
              ></vue-virtual-tree>
            </div>
          </div>
          <p class="slot-note">
            <template v-if="customSlotEnabled">
              Scoped slot mode renders every visible row and its checkbox calls
              <code>selectChange(checked)</code>. Switch to built-in content to test expand events and iconClass.
            </template>
            <template v-else>
              Built-in node content uses the component's expand control, so node-expand and node-collapse
              are emitted by the real component path. Current iconClass: <code>{{ appliedOptions.iconClass || 'not set' }}</code>.
            </template>
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
            <button class="button button-muted" type="button" :disabled="busy" @click="measureTreeMethod('scrollToItem')">Measure scrollToItem completion</button>
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
import type { VueVirtualTreeInstance } from '@zjinh/vue-virtual-tree'

import { TREE_EVENTS, TREE_METHODS, TREE_PROPS } from './api-manifest'
import type { MethodManifestItem } from './api-manifest'
import {
  calculateVirtualizationRatio,
  readBrowserMemory,
  SCROLL_POSITIONING_COMPLETION_DELAY_MS,
  summarizeFrameSample,
} from './benchmark'
import type { FrameSummary } from './benchmark'
import {
  BENCHMARK_PRESETS,
  countTreeNodes,
  createLazyChildren,
  createLazyDemoData,
  generateTreeData,
} from './data'
import type { DemoTreeNode } from './data'
import { METHOD_ACTIONS } from './method-actions'
import type { MethodActionContext } from './method-actions'

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

interface NumberOptionRule {
  fallback: number
  max: number
  min: number
}

const NUMBER_OPTION_RULES: Record<'height' | 'indent' | 'itemSize', NumberOptionRule> = {
  height: { fallback: 420, min: 220, max: 2_000 },
  indent: { fallback: 16, min: 0, max: 100 },
  itemSize: { fallback: 28, min: 1, max: 200 },
}

const LOG_ARRAY_SAMPLE_LIMIT = 5
const LOG_OBJECT_KEY_LIMIT = 20
const LOG_STRING_LIMIT = 240

const normalizeNumberOption = (
  name: keyof typeof NUMBER_OPTION_RULES,
  value: string | number | boolean,
): number => {
  const rule = NUMBER_OPTION_RULES[name]
  const numericValue = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numericValue)) return rule.fallback
  return Math.max(rule.min, Math.min(rule.max, numericValue))
}

const summarizeLogValue = (
  value: unknown,
  seen = new WeakSet<object>(),
  depth = 0,
): unknown => {
  if (typeof value === 'string') {
    return value.length > LOG_STRING_LIMIT
      ? `${value.slice(0, LOG_STRING_LIMIT)}...`
      : value
  }
  if (value === null || typeof value !== 'object') return value
  if (value instanceof Event) return { eventType: value.type }
  if (seen.has(value)) return '[Circular]'
  seen.add(value)
  if (depth >= 4) return '[Max depth]'

  if (Array.isArray(value)) {
    return {
      total: value.length,
      sample: value
        .slice(0, LOG_ARRAY_SAMPLE_LIMIT)
        .map((candidate) => summarizeLogValue(candidate, seen, depth + 1)),
    }
  }

  const record = value as Record<string, unknown>
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
    return {
      id: summarizeLogValue(record.id, seen, depth + 1),
      label: summarizeLogValue(record.label, seen, depth + 1),
      children: Array.isArray(record.children) ? record.children.length : 0,
    }
  }

  const keys = Object.keys(record)
  const sample = Object.fromEntries(
    keys.slice(0, LOG_ARRAY_SAMPLE_LIMIT).map((key) => [
      key,
      summarizeLogValue(record[key], seen, depth + 1),
    ]),
  )
  if (keys.length > LOG_OBJECT_KEY_LIMIT) {
    return { total: keys.length, sample }
  }
  return Object.fromEntries(
    keys.map((key) => [key, summarizeLogValue(record[key], seen, depth + 1)]),
  )
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
  iconClass: 'workbench-caret',
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
      workGeneration: 0,
      pendingTimeouts: new Map<number, () => void>(),
      pendingAnimationFrames: new Map<number, (timestamp: number | null) => void>(),
      customSlotEnabled: false,
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
    treeBindings(): Record<string, unknown> {
      return {
        data: this.treeData,
        emptyText: this.appliedOptions.emptyText,
        nodeKey: 'id',
        checkStrictly: this.appliedOptions.checkStrictly,
        defaultExpandAll: this.appliedOptions.defaultExpandAll,
        checkDescendants: this.appliedOptions.checkDescendants,
        selectChildrenOnly: this.appliedOptions.selectChildrenOnly,
        itemSize: this.appliedOptions.itemSize,
        autoExpandParent: this.appliedOptions.autoExpandParent,
        defaultCheckedKeys: this.parseKeyList(this.appliedOptions.defaultCheckedKeys),
        defaultExpandedKeys: this.parseKeyList(this.appliedOptions.defaultExpandedKeys),
        currentNodeKey: this.appliedOptions.currentNodeKey || undefined,
        showCheckbox: this.appliedOptions.showCheckbox,
        props: this.treeOptionProps,
        lazy: this.appliedOptions.lazy,
        highlightCurrent: this.appliedOptions.highlightCurrent,
        load: this.loadLazyNode,
        filterNodeMethod: this.filterNode,
        indent: this.appliedOptions.indent,
        iconClass: this.appliedOptions.iconClass,
        height: this.appliedOptions.height,
      }
    },
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
  beforeDestroy() {
    this.cleanupAsyncWork()
  },
  beforeUnmount() {
    this.cleanupAsyncWork()
  },
  methods: {
    propRowId(name: string): string {
      return `prop-row-${name}`
    },
    propLabelId(name: string): string {
      return `prop-label-${name}`
    },
    propDescriptionId(name: string): string {
      return `prop-description-${name}`
    },
    propControlId(name: string): string {
      return `prop-control-${name}`
    },
    numberOptionMin(name: string): number | undefined {
      return NUMBER_OPTION_RULES[name as keyof typeof NUMBER_OPTION_RULES]?.min
    },
    numberOptionMax(name: string): number | undefined {
      return NUMBER_OPTION_RULES[name as keyof typeof NUMBER_OPTION_RULES]?.max
    },
    normalizeDraftNumbers(): void {
      for (const name of Object.keys(NUMBER_OPTION_RULES) as Array<keyof typeof NUMBER_OPTION_RULES>) {
        this.draftOptions[name] = normalizeNumberOption(name, this.draftOptions[name])
      }
    },
    cleanupAsyncWork(): void {
      for (const [timerId, settle] of this.pendingTimeouts) {
        window.clearTimeout(timerId)
        settle()
      }
      this.pendingTimeouts.clear()
      for (const [frameId, settle] of this.pendingAnimationFrames) {
        window.cancelAnimationFrame(frameId)
        settle(null)
      }
      this.pendingAnimationFrames.clear()
    },
    beginTreeGeneration(): number {
      this.cleanupAsyncWork()
      this.workGeneration += 1
      return this.workGeneration
    },
    waitForDelay(delayMs: number, generation?: number): Promise<boolean> {
      const activeGeneration = generation ?? this.workGeneration
      if (activeGeneration !== this.workGeneration) return Promise.resolve(false)
      return new Promise((resolve) => {
        const timerId = window.setTimeout(() => {
          this.pendingTimeouts.delete(timerId)
          resolve(activeGeneration === this.workGeneration)
        }, delayMs)
        this.pendingTimeouts.set(timerId, () => resolve(false))
      })
    },
    waitForNextFrame(generation?: number): Promise<number | null> {
      const activeGeneration = generation ?? this.workGeneration
      if (activeGeneration !== this.workGeneration) return Promise.resolve(null)
      return new Promise((resolve) => {
        const frameId = window.requestAnimationFrame((timestamp) => {
          this.pendingAnimationFrames.delete(frameId)
          resolve(activeGeneration === this.workGeneration ? timestamp : null)
        })
        this.pendingAnimationFrames.set(frameId, resolve)
      })
    },
    async waitForStablePaint(generation?: number): Promise<boolean> {
      const activeGeneration = generation ?? this.workGeneration
      await this.$nextTick()
      if (activeGeneration !== this.workGeneration) return false
      if (await this.waitForNextFrame(activeGeneration) === null) return false
      return await this.waitForNextFrame(activeGeneration) !== null
    },
    toggleTheme(): void {
      this.theme = this.theme === 'dark' ? 'light' : 'dark'
    },
    setDraftBoolean(name: string, event: Event): void {
      const input = event.target as HTMLInputElement
      this.draftOptions[name] = input.checked
      if (name === 'lazy') {
        this.draftOptions.defaultExpandAll = !input.checked
      }
      if (name === 'highlightCurrent') {
        this.appliedOptions.highlightCurrent = input.checked
      }
    },
    setDraftNumber(name: string, event: Event): void {
      const input = event.target as HTMLInputElement
      this.draftOptions[name] = input.valueAsNumber
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
    async toggleNodeContentMode(): Promise<void> {
      const generation = this.beginTreeGeneration()
      this.customSlotEnabled = !this.customSlotEnabled
      this.treeVersion += 1
      await this.refreshObservedMetrics(generation)
    },
    applyAndRemount(): void {
      this.normalizeDraftNumbers()
      if (this.draftOptions.lazy) {
        this.draftOptions.defaultExpandAll = false
      }
      const generation = this.beginTreeGeneration()
      this.appliedOptions = { ...this.draftOptions }
      if (this.appliedOptions.lazy) {
        this.treeData = createLazyDemoData()
        this.totalNodes = countTreeNodes(this.treeData)
        this.targetKey = 'lazy-root'
      }
      this.treeVersion += 1
      void this.refreshObservedMetrics(generation)
    },
    resetScenario(): void {
      const generation = this.beginTreeGeneration()
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
      void this.refreshObservedMetrics(generation)
    },
    async loadDataset(total: number): Promise<void> {
      if (this.busy) return
      this.setBusy(`Generating ${this.formatNumber(total)} nodes`)
      const generation = this.beginTreeGeneration()
      try {
        const generationStart = performance.now()
        const data = generateTreeData(total)
        const generationDuration = performance.now() - generationStart
        this.addBenchmark('generate data', generationDuration, `${countTreeNodes(data)} deterministic nodes`)

        this.draftOptions.lazy = false
        this.draftOptions.defaultExpandAll = true
        this.normalizeDraftNumbers()
        this.appliedOptions = { ...this.draftOptions }
        const commitStart = performance.now()
        this.treeData = data
        this.totalNodes = countTreeNodes(data)
        this.targetKey = `node-${Math.min(total, Math.max(1, Math.floor(total * 0.75)))}`
        this.treeVersion += 1
        if (!await this.waitForStablePaint(generation)) return
        const commitDuration = performance.now() - commitStart
        this.addBenchmark('submit → stable paint', commitDuration, `${this.formatCompact(total)} logical nodes`)
        await this.refreshObservedMetrics(generation)
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
      node: { data: DemoTreeNode | DemoTreeNode[]; level: number },
      resolve: (children: DemoTreeNode[]) => void,
    ): void {
      const generation = this.workGeneration
      void this.waitForDelay(180, generation).then(async (isCurrent) => {
        if (!isCurrent || generation !== this.workGeneration) return
        let children: DemoTreeNode[]
        if (node.level === 0) {
          children = createLazyDemoData()
          this.treeData = children
        } else if (Array.isArray(node.data)) {
          children = []
        } else {
          children = createLazyChildren(node.data)
          node.data.children = children
        }
        if (generation !== this.workGeneration) return
        resolve(children)
        this.totalNodes = countTreeNodes(this.treeData)
        if (!await this.waitForStablePaint(generation)) return
        await this.refreshObservedMetrics(generation)
      })
    },
    applySlotSelection(selectChange: (checked: boolean) => void, event: Event): void {
      selectChange((event.target as HTMLInputElement).checked)
    },
    getTree(): VueVirtualTreeInstance<DemoTreeNode> {
      const tree = this.$refs.tree as VueVirtualTreeInstance<DemoTreeNode> | undefined
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
      const tree = this.getTree()
      return {
        tree,
        targetKey: this.targetKey,
        query: this.filterQuery,
        createMutationNode: (label: string) => this.createMutationNode(label),
        get targetNode(): DemoTreeNode {
          const targetNode = tree.getNode(this.targetKey)?.data
          if (!targetNode) throw new Error(`Target ${this.targetKey} is not present in the current data`)
          return targetNode
        },
      }
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
      const generation = this.workGeneration
      try {
        const result = await action.run(this.getActionContext())
        if (name === 'scrollToItem') {
          await this.$nextTick()
          if (!await this.waitForDelay(SCROLL_POSITIONING_COMPLETION_DELAY_MS, generation)) return
          if (await this.waitForNextFrame(generation) === null) return
          if (await this.waitForNextFrame(generation) === null) return
        }
        if (generation !== this.workGeneration) return
        this.totalNodes = countTreeNodes(this.treeData)
        this.recordMethodResult(name, startedAt, result)
        await this.refreshObservedMetrics(generation)
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
      const benchmarkName = name === 'scrollToItem' ? 'scrollToItem completion' : name
      if (lastResult?.name === name) {
        const detail = name === 'scrollToItem' && !lastResult.error
          ? `internal 50 ms positioning completed; return ${lastResult.value}`
          : lastResult.error ? lastResult.value : `return ${lastResult.value}`
        this.addBenchmark(benchmarkName, stableDuration, detail)
      } else {
        this.addBenchmark(benchmarkName, stableDuration, 'No result entry observed')
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
        const serialized = JSON.stringify(summarizeLogValue(value))
        if (serialized.length <= 1_200) return serialized
        return JSON.stringify({
          preview: `${serialized.slice(0, 1_000)}...`,
          truncated: true,
        })
      } catch (error) {
        return `Serialization error: ${error instanceof Error ? error.message : String(error)}`
      }
    },
    addBenchmark(name: string, durationMs: number, detail: string): void {
      this.benchmarkSequence += 1
      this.benchmarks = [{ id: this.benchmarkSequence, name, durationMs, detail }, ...this.benchmarks].slice(0, 20)
      this.measurementTime = new Date().toLocaleString()
    },
    async refreshObservedMetrics(generation?: number): Promise<void> {
      const activeGeneration = generation ?? this.workGeneration
      await this.$nextTick()
      if (activeGeneration !== this.workGeneration) return
      if (await this.waitForNextFrame(activeGeneration) === null) return
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
      const startScrollTop = scroller.scrollTop
      const maxScrollTop = Math.max(0, scroller.scrollHeight - scroller.clientHeight)
      if (maxScrollTop <= 0) return

      this.setBusy('Sampling one virtual-list scroll')
      const generation = this.workGeneration
      const frames: number[] = []
      const sampleStart = performance.now()
      let previous = sampleStart
      while (generation === this.workGeneration) {
        const now = await this.waitForNextFrame(generation)
        if (now === null) return
        frames.push(now - previous)
        previous = now
        const progress = Math.min(1, (now - sampleStart) / 700)
        scroller.scrollTop = startScrollTop + (maxScrollTop - startScrollTop) * progress
        scroller.dispatchEvent(new Event('scroll'))
        if (progress >= 1) break
      }
      if (generation !== this.workGeneration) return

      this.frameSummary = summarizeFrameSample(frames)
      this.addBenchmark(
        'scroll frame sample',
        performance.now() - sampleStart,
        `${frames.length} frames; ${this.frameSummary.longFrames} over 50 ms`,
      )
      await this.refreshObservedMetrics(generation)
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
