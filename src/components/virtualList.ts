import './virtualList.less'

import {
  computed,
  defineComponent,
  h,
  nextTick,
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  onMounted,
  onUpdated,
  ref,
  version,
  watch,
} from 'vue'
import type { ComputedRef, PropType, Ref } from 'vue'

interface ScrollData {
  start: number
  end: number
  startOffset: number
  scrollTop: number
  direction: 'down' | 'up'
}

interface IndexedListItem {
  index: number
  item: unknown
}

type ScrollEvent = Event | { target: HTMLElement }
type RenderAttributes = Record<string, string | number>
type RenderListeners = Record<string, (event: Event) => void>

const debounce = <Args extends unknown[], Result>(
  callback: (...args: Args) => Result,
  wait = 50,
  immediate = false,
): ((...args: Args) => Result | undefined) => {
  let timer: ReturnType<typeof setTimeout> | null = null
  let result: Result | undefined

  return (...args: Args): Result | undefined => {
    if (timer) clearTimeout(timer)
    if (immediate) {
      const callNow = !timer
      timer = setTimeout(() => {
        timer = null
      }, wait)
      if (callNow) result = callback(...args)
    } else {
      timer = setTimeout(() => {
        callback(...args)
      }, wait)
    }
    return result
  }
}

const isVue2 = version.startsWith('2')
let scrollTopCache = 0
let haveScrollWidth = false

const renderHelper = (
  attrs: RenderAttributes = {},
  listeners: RenderListeners = {},
): Record<string, unknown> => {
  if (isVue2) {
    return {
      attrs,
      on: listeners,
    }
  }

  const result: Record<string, unknown> = { ...attrs }
  for (const [event, listener] of Object.entries(listeners)) {
    result[`on${event.charAt(0).toUpperCase()}${event.slice(1)}`] = listener
  }
  return result
}

export default defineComponent({
  name: 'virtualList',
  props: {
    listData: {
      type: Array as PropType<unknown[]>,
      required: true,
      default: () => [],
    },
    itemHeight: {
      type: Number,
      required: true,
    },
    bufferScale: {
      type: Number,
      default: 4,
    },
    scrollEndDistance: {
      type: Number,
      default: 10,
    },
    height: {
      type: [String, Number] as PropType<string | number>,
      default: '100%',
    },
    scrollLockTime: {
      type: Number,
      default: 100,
    },
  },
  setup(props, { slots, emit, expose }) {
    const virtualList: Ref<HTMLElement | null> = ref(null)
    const phantom: Ref<HTMLElement | null> = ref(null)
    const content: Ref<HTMLElement | null> = ref(null)
    const screenHeight = ref(0)
    const start = ref(0)
    const end = ref(0)
    const startOffset = ref(0)
    const lockScroll = ref(false)
    const lockTimer: Ref<ReturnType<typeof setTimeout> | null> = ref(null)
    const oldScrollTop = ref(0)
    const preventAutoScroll = ref(false)
    const lastDirection = ref<ScrollData['direction'] | ''>('')
    const ready = ref(false)
    const active = ref(true)
    let resizer: ResizeObserver | null = null

    const elm: ComputedRef<HTMLElement | null> = computed(() => virtualList.value)
    const indexedListData = computed<IndexedListItem[]>(() => {
      if (!ready.value) return []
      return props.listData.map((item, index) => ({ index, item }))
    })
    const anchorPoint = computed(() => {
      if (indexedListData.value.length === 0) return null
      return {
        top: start.value * props.itemHeight,
        bottom: (start.value + 1) * props.itemHeight,
      }
    })
    const visibleCount = computed(() =>
      Math.ceil(screenHeight.value / props.itemHeight),
    )
    const aboveCount = computed(() =>
      Math.min(start.value, props.bufferScale * visibleCount.value),
    )
    const belowCount = computed(() =>
      Math.min(
        props.listData.length - end.value,
        props.bufferScale * visibleCount.value,
      ),
    )
    const renderListData = computed(() => {
      const startIndex = start.value - Math.max(0, aboveCount.value)
      const endIndex = end.value + Math.max(1, belowCount.value)
      return indexedListData.value.slice(startIndex, endIndex)
    })
    const listHeight = computed(() => ({ height: props.height }))

    const updatePhantomStyle = (height: string): void => {
      if (phantom.value) phantom.value.style.height = height
    }

    const getScrollHeight = (): number => phantom.value?.offsetHeight ?? 0

    const getSizeInfo = (): void => {
      const element = elm.value
      if (!element) return
      try {
        const height = Math.max(element.clientHeight, -1)
        screenHeight.value = height > 0
          ? height
          : (element.parentElement?.clientHeight ?? 0)
      } catch (_error) {
        screenHeight.value = 0
      }
    }

    const setStartOffset = (): void => {
      let offset = 0
      try {
        if (start.value >= 1) {
          const actualStart = Math.max(0, start.value - aboveCount.value)
          offset = actualStart * props.itemHeight
        }
      } catch (_error) {
        offset = 0
      }
      startOffset.value = offset
      if (content.value) {
        content.value.style.transform = `translate3d(0,${offset}px,0)`
      }
    }

    const getStartIndex = (scrollTop = 0): number =>
      Math.max(Math.floor(scrollTop / props.itemHeight), 0)

    const unlockScroll = (): void => {
      if (!props.scrollLockTime) {
        lockScroll.value = false
        preventAutoScroll.value = false
        return
      }
      if (lockTimer.value) clearTimeout(lockTimer.value)
      lockTimer.value = setTimeout(() => {
        lockScroll.value = false
        preventAutoScroll.value = false
        if (lockTimer.value) clearTimeout(lockTimer.value)
        lockTimer.value = null
      }, props.scrollLockTime)
    }

    const scrollDownEvent = debounce((scrollHeight: number): void => {
      if (scrollHeight === getScrollHeight()) emit('scrollDown')
    }, 100)

    const scrollEnd = debounce((event: ScrollEvent, data: ScrollData): void => {
      if (active.value) emit('scrollEnd', event, data)
    }, 100)

    const scrollingEvent = (event: ScrollEvent, data: ScrollData): void => {
      oldScrollTop.value = data.scrollTop
      if (active.value) emit('scrolling', event, data)
    }

    const scrollEvent = (event: ScrollEvent, force = false): void => {
      const element = event.target instanceof HTMLElement ? event.target : null
      if (!element) return

      const scrollTop = element.scrollTop
      if (scrollTopCache !== scrollTop && active.value) emit('scroll', event)
      scrollTopCache = scrollTop

      const scrollHeight = getScrollHeight()
      if (
        force ||
        !anchorPoint.value ||
        scrollTop > anchorPoint.value.bottom ||
        scrollTop < anchorPoint.value.top
      ) {
        start.value = getStartIndex(scrollTop)
        end.value = start.value + visibleCount.value
        setStartOffset()
      }

      const direction: ScrollData['direction'] =
        scrollTop - oldScrollTop.value >= 0 ? 'down' : 'up'
      const data: ScrollData = {
        start: start.value,
        end: Math.min(end.value, props.listData.length - 1),
        startOffset: startOffset.value,
        scrollTop,
        direction,
      }

      if (
        oldScrollTop.value &&
        lastDirection.value &&
        lastDirection.value !== direction
      ) {
        preventAutoScroll.value = true
        unlockScroll()
      }
      lastDirection.value = direction
      scrollingEvent(event, data)
      scrollEnd(event, data)

      if (scrollHeight <= element.clientHeight || lockScroll.value) return
      if (
        scrollHeight - scrollTop - props.scrollEndDistance <= element.clientHeight &&
        direction === 'down'
      ) {
        lockScroll.value = true
        scrollDownEvent(scrollHeight)
        unlockScroll()
      }
    }

    const startRender = (): void => {
      getSizeInfo()
      start.value = 0
      end.value = visibleCount.value
      setStartOffset()
    }

    const hasHorizontalScrollbar = (element: HTMLElement): boolean => {
      const { overflowX } = window.getComputedStyle(element)
      return overflowX === 'scroll' || (
        overflowX === 'auto' && element.scrollWidth > element.clientWidth
      )
    }

    const handleResize = (): void => {
      const element = elm.value
      if (!active.value || !element?.offsetHeight) {
        preventAutoScroll.value = false
        return
      }
      const scrollWidthExists = hasHorizontalScrollbar(element)
      if (haveScrollWidth === scrollWidthExists) return
      haveScrollWidth = scrollWidthExists
      getSizeInfo()
      void nextTick(() => scrollEvent({ target: element }, true))
    }

    const afterRenderUpdated = (): void => {
      if (props.listData.length === 0) {
        updatePhantomStyle('0px')
        return
      }
      updatePhantomStyle(`${props.listData.length * props.itemHeight}px`)
      setStartOffset()
    }

    const scrollToIndex = async (
      index = 0,
      animation = true,
      first = true,
    ): Promise<void> => {
      if (index < 0 || preventAutoScroll.value) return
      if (first) await nextTick()

      const element = elm.value
      if (!element) return
      const listIndex = Math.min(index, indexedListData.value.length - 1)
      let scrollTop = Math.floor(listIndex * props.itemHeight)
      const currentScrollHeight = getScrollHeight()

      if (scrollTop === 0) {
        element.scrollTo({
          left: 0,
          top: scrollTop,
          behavior: animation ? 'smooth' : 'auto',
        })
        return
      }

      const currentTop = element.scrollTop
      const viewBottom = currentTop + element.clientHeight
      const itemBottom = scrollTop + props.itemHeight
      if (scrollTop >= currentTop && itemBottom <= viewBottom) return

      await nextTick()
      scrollTop = Math.min(
        scrollTop,
        getScrollHeight() - element.clientHeight,
      )
      element.scrollTo({
        left: 0,
        top: scrollTop,
        behavior: animation ? 'smooth' : 'auto',
      })
      scrollEvent({ target: element }, true)

      if (getScrollHeight() !== currentScrollHeight) {
        await scrollToIndex(index, animation, false)
        return
      }

      const currentScrollTop = Math.floor(element.scrollTop)
      const differs = Math.abs(currentScrollTop - scrollTop) > props.itemHeight / 2
      const timer = setTimeout(() => {
        clearTimeout(timer)
        if (currentScrollTop !== scrollTop && !lockScroll.value && differs) {
          void scrollToIndex(index, animation, false)
        } else if (currentScrollTop === scrollTop) {
          unlockScroll()
        }
      }, 100)
    }

    onMounted(() => {
      void nextTick(() => {
        ready.value = true
        startRender()
        if (!screenHeight.value) {
          const timer = setTimeout(() => {
            startRender()
            clearTimeout(timer)
          }, 100)
        }
      })

      const element = elm.value
      if (element) {
        resizer = new ResizeObserver(debounce(() => handleResize(), 100))
        resizer.observe(element)
      }
    })

    onBeforeUnmount(() => {
      scrollTopCache = 0
      resizer?.disconnect()
      resizer = null
      if (lockTimer.value) clearTimeout(lockTimer.value)
      lockTimer.value = null
    })

    onActivated(() => {
      const element = elm.value
      if (content.value && element) {
        element.scrollTop = scrollTopCache
        updatePhantomStyle(`${indexedListData.value.length * props.itemHeight}px`)
        content.value.style.transform = `translate3d(0,${startOffset.value}px,0)`
      }
      active.value = true
    })

    onDeactivated(() => {
      active.value = false
    })

    onUpdated(() => {
      if (!active.value) return
      unlockScroll()
      afterRenderUpdated()
    })

    watch(listHeight, () => handleResize())

    expose({
      scrollToIndex,
      handleResize,
    })

    return () =>
      h(
        'section',
        {
          ref: virtualList,
          class: ['virtual-tree'],
          style: listHeight.value,
          ...renderHelper(
            { 'data-h': props.itemHeight },
            { scroll: (event) => scrollEvent(event) },
          ),
        },
        [
          h('div', {
            ref: phantom,
            class: 'virtual-tree-phantom',
          }),
          h(
            'div',
            {
              ref: content,
              class: 'virtual-tree-container',
            },
            renderListData.value.map((entry) =>
              slots.default?.({
                item: entry.item,
                index: entry.index,
              }),
            ),
          ),
        ],
      )
  },
})
