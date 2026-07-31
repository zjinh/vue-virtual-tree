import "./virtualList.less"
import {
  h,
  version,
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  onActivated,
  onDeactivated,
  onUpdated,
  nextTick,
  watch
} from 'vue'
import type { ComputedRef, Ref, SetupContext } from 'vue'

// 定高虚拟列表不再需要PosData接口
interface ScrollData {
  start: number;
  end: number;
  startOffset: number;
  scrollTop: number;
  direction: string;
}
const _ = {
  debounce(func: Function, wait = 50, immediate = false) {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let result: any = null;
    return function (...args: any) {
      if (timer) {
        clearTimeout(timer);
      }
      if (immediate) {
        let callNow = !timer;
        timer = setTimeout(() => {
          timer = null;
        }, wait);
        if (callNow) {
          result = func(...args);
        }
      } else {
        timer = setTimeout(() => {
          func(...args);
        }, wait);
      }
      return result;
    };
  },
};
const isVue2 = version.startsWith('2');
let scrollTopCache = 0;
let haveScrollWidth = false;
const renderHelper = function (attrs?: { [key: string]: string }, listen?: { [key: string]: Function | Array<Function> }): any {
  if (isVue2) {
    return {
      attrs: attrs,
      on: listen,
    };
  } else {
    let obj: any = attrs;
    for (let key in listen) {
      obj[`on${key.charAt(0).toUpperCase() + key.slice(1)}`] = listen[key];
    }
    return obj;
  }
};
export default {
  name: 'virtualList',
  props: {
    //所有列表数据
    listData: {
      type: Array,
      required: true,
      default: function () {
        return [];
      },
    },
    //预估高度
    itemHeight: {
      type: Number,
      required: true,
    },
    //缓冲区比例
    bufferScale: {
      type: Number,
      default: 4,
    },
    scrollEndDistance: {
      type: Number,
      default: 10,
    },
    //容器高度 100%
    height: {
      type: String,
      default: '100%',
    },
    scrollLockTime: {
      type: Number,
      default: function () {
        return 100;
      },
    },
  },
  setup(props: any, { slots, emit, expose }: SetupContext) {
    // refs
    const virtualList: Ref<HTMLElement | null> = ref(null);
    const phantom: Ref<HTMLElement | null> = ref(null);
    const content: Ref<HTMLElement | null> = ref(null);
    //data
    const screenHeight = ref(0);
    const start = ref(0);
    const end = ref(0);
    const startOffset = ref(0);
    const lockScroll = ref(false);
    const lockTimer: Ref<ReturnType<typeof setTimeout> | null> = ref(null);
    const oldScrollTop = ref(0);
    const preventAutoScroll = ref(false);
    const lastDirection = ref('');
    const ready = ref(false);
    const active = ref(true);
    let resizer: ResizeObserver | null = null;

    // 生命周期钩子
    onMounted(() => {
      nextTick(() => {
        ready.value = true;
        startRender();
        if (!screenHeight.value) {
          let a = setTimeout(() => {
            startRender();
            clearTimeout(a);
          }, 100);
        }
      });

      if (elm.value) {
        resizer = new ResizeObserver(_.debounce(handleResize, 100));
        resizer.observe(elm.value);
      }
    });

    onBeforeUnmount(() => {
      scrollTopCache = 0;

      if (resizer) {
        resizer.disconnect();
        resizer = null;
      }

      if (lockTimer.value) {
        clearTimeout(lockTimer.value);
        lockTimer.value = null;
      }
    });

    onActivated(() => {
      if (content.value && elm.value) {
        elm.value.scrollTop = scrollTopCache;
        // 计算总高度：项目数量 * 单项高度
        let totalHeight = _listData.value.length * props.itemHeight;
        updatePhantomStyle(totalHeight + 'px');
        content.value.style.transform = `translate3d(0,${startOffset.value}px,0)`;
      }
      active.value = true;
    });

    onDeactivated(() => {
      active.value = false;
    });

    onUpdated(() => {
      if (!active.value) {
        return;
      }
      // 数据长度变化时重新渲染
      unlockScroll();
      afterRenderUpdated();
    });

    // computed
    const elm: ComputedRef<HTMLElement> = computed(() => {
      return virtualList.value as HTMLElement;
    });

    const _listData = computed(() => {
      if (!ready.value) return [];
      return props.listData.reduce((acc: any, cur: any, index: number) => {
        // 创建新对象，避免副作用
        cur._index = index;
        acc.push(cur);
        return acc;
      }, []);
    });

    // 计算当前起始项的位置信息
    const anchorPoint = computed(() => {
      if (_listData.value.length === 0) return null;
      return {
        top: start.value * props.itemHeight,
        bottom: (start.value + 1) * props.itemHeight,
      };
    });

    const visibleCount = computed(() => Math.ceil(screenHeight.value / props.itemHeight));

    const aboveCount = computed(() => Math.min(start.value, props.bufferScale * visibleCount.value));

    const belowCount = computed(() => Math.min(props.listData.length - end.value, props.bufferScale * visibleCount.value));

    const renderListData = computed(() => {
      let startIndex = start.value - Math.max(0, aboveCount.value);
      let endIndex = end.value + Math.max(1, belowCount.value);
      return _listData.value.slice(startIndex, endIndex);
    });

    const listHeight = computed(() => ({
      height: props.height,
    }));

    watch(listHeight, () => {
      handleResize();
    });

    // methods
    const startRender = () => {
      getSizeInfo();
      start.value = 0;
      end.value = start.value + visibleCount.value;
      setStartOffset();
    };
    const hasHorizontalScrollbar = (element: HTMLElement) => {
      const style = window.getComputedStyle(element);
      const overflowX = style.overflowX;
      return overflowX === 'scroll' || (overflowX === 'auto' && element.scrollWidth > element.clientWidth);
    };
    const handleResize = () => {
      if (!active.value || !elm.value?.offsetHeight) {
        preventAutoScroll.value = false;
        return;
      }
      let scrollWidthExist = hasHorizontalScrollbar(elm.value);
      if (haveScrollWidth === scrollWidthExist) {
        return;
      }
      haveScrollWidth = scrollWidthExist;
      getSizeInfo();
      nextTick(() => {
        scrollEvent(
          {
            target: elm.value,
          },
          true
        );
      });
    };

    const getSizeInfo = () => {
      if (!elm.value) {
        return;
      }

      try {
        let height = Math.max(elm.value.clientHeight, -1);
        //@ts-ignore
        screenHeight.value = height > 0 ? height : elm.value.parentNode ? elm.value.parentNode.clientHeight : 0;
      } catch (_e) {
        screenHeight.value = 0;
      }
    };
    //数据变更渲染后重新计算
    const afterRenderUpdated = () => {
      let data = props.listData;
      if (!data || !data.length) {
        updatePhantomStyle('0px');
        return;
      }
      // 计算总高度：项目数量 * 单项高度
      let totalHeight = data.length * props.itemHeight;
      updatePhantomStyle(totalHeight + 'px');
      //更新真实偏移量
      setStartOffset();
    };
    //防抖处理，设置滚动状态
    const scrollEnd = _.debounce((event: MouseEvent, data: ScrollData) => {
      if (active.value) {
        emit('scrollEnd', event, data);
      }
    }, 100);

    const scrollingEvent = (event: MouseEvent, data: ScrollData) => {
      oldScrollTop.value = data.scrollTop;
      if (active.value) {
        emit('scrolling', event, data);
      }
    };

    // 定高虚拟列表：直接通过数学计算获取起始索引
    const getStartIndex = (scrollTop = 0) => {
      return Math.max(Math.floor(scrollTop / props.itemHeight), 0);
    };

    const setStartOffset = () => {
      let offset = 0;
      try {
        if (start.value >= 1) {
          // 定高虚拟列表：计算实际渲染起始位置的偏移
          let actualStart = Math.max(0, start.value - aboveCount.value);
          offset = actualStart * props.itemHeight;
        }
      } catch (_e) {
        offset = 0;
      }
      startOffset.value = offset;
      if (content.value) {
        content.value.style.transform = `translate3d(0,${offset}px,0)`;
      }
    };

    const getScrollHeight = () => {
      return phantom.value?.offsetHeight || 0;
    };

    const scrollEvent = (e: any, force = false) => {
      if (!e?.target) return;

      let element = e.target;
      let scrollTop = element.scrollTop;

      if (scrollTopCache !== scrollTop && active.value) {
        emit('scroll', e);
      }

      scrollTopCache = scrollTop;
      let scrollHeight = getScrollHeight();

      if (force || !anchorPoint.value || scrollTop > anchorPoint.value.bottom || scrollTop < anchorPoint.value.top) {
        start.value = getStartIndex(scrollTop);
        end.value = start.value + visibleCount.value;
        setStartOffset();
      }

      //触发外部滚动事件
      let direction = scrollTop - oldScrollTop.value >= 0 ? 'down' : 'up';
      let data: ScrollData = {
        start: start.value,
        end: Math.min(end.value, props.listData.length - 1),
        startOffset: startOffset.value,
        scrollTop,
        direction,
      };

      if (oldScrollTop.value && lastDirection.value && lastDirection.value !== direction) {
        preventAutoScroll.value = true;
        unlockScroll();
      }

      lastDirection.value = direction;
      scrollingEvent(e, data);
      scrollEnd(e, data);

      if (scrollHeight <= element.clientHeight) return;
      if (lockScroll.value) return;

      if (scrollHeight - scrollTop - props.scrollEndDistance <= element.clientHeight && direction === 'down') {
        lockScroll.value = true;
        scrollDownEvent(scrollHeight);
        unlockScroll();
      }
    };

    const scrollDownEvent = _.debounce((scrollHeight: number) => {
      if (scrollHeight === getScrollHeight()) {
        emit('scrollDown');
      }
    }, 100);

    const unlockScroll = () => {
      if (!props.scrollLockTime) {
        lockScroll.value = false;
        preventAutoScroll.value = false;
        return;
      }

      if (lockTimer.value) {
        clearTimeout(lockTimer.value);
        lockTimer.value = null;
      }

      lockTimer.value = setTimeout(() => {
        lockScroll.value = false;
        preventAutoScroll.value = false;
        if (lockTimer.value) {
          clearTimeout(lockTimer.value);
          lockTimer.value = null;
        }
      }, props.scrollLockTime);
    };

    const scrollToIndex = async (index = 0, anim = true, first = true) => {
      if (index < 0 || preventAutoScroll.value) return;

      if (first) {
        await nextTick();
      }

      let listIndex: number;
      let scrollTop = 0;
      let currentScrollHeight = getScrollHeight();

      listIndex = Math.min(index, _listData.value.length - 1);

      try {
        // 定高虚拟列表：直接计算scrollTop位置
        scrollTop = listIndex * props.itemHeight;
        scrollTop = Math.floor(scrollTop);
      } catch (_e) {
        scrollTop = 0;
      }

      if (scrollTop === 0) {
        elm.value.scrollTo({
          left: 0,
          top: scrollTop,
          behavior: anim ? 'smooth' : 'auto',
        });
        return;
      }

      // 只有目标项已经在当前视口内，才 return，否则继续执行滚动
      const currentTop = elm.value.scrollTop;
      const viewBottom = currentTop + elm.value.clientHeight;
      const itemBottom = scrollTop + props.itemHeight;
      if (scrollTop >= currentTop && itemBottom <= viewBottom) {
        return;
      }

      await nextTick();
      const maxScrollTop = getScrollHeight() - virtualList.value!.clientHeight; //到底部的scrollTop最大值
      scrollTop = Math.min(scrollTop, maxScrollTop);
      elm.value.scrollTo({
        left: 0,
        top: scrollTop,
        behavior: anim ? 'smooth' : 'auto',
      });

      scrollEvent(
        {
          target: elm.value,
        },
        true
      );

      if (getScrollHeight() !== currentScrollHeight) {
        await scrollToIndex(index, anim, false);
        return;
      }

      let currentScrollTop = Math.floor(elm.value.scrollTop);
      let diff = Math.abs(currentScrollTop - scrollTop) > props.itemHeight / 2;

      let a = setTimeout(async () => {
        clearTimeout(a);
        if (currentScrollTop !== scrollTop && !lockScroll.value) {
          if (diff) {
            await scrollToIndex(index, anim, false);
          }
        } else if (currentScrollTop === scrollTop) {
          unlockScroll();
        }
      }, 100);
    };

    const updatePhantomStyle = (height: string) => {
      if (phantom.value) {
        phantom.value.style.height = height;
      }
    };

    // 暴露方法
    expose({
      scrollToIndex,
      handleResize,
    });

    // render 函数
    return () =>
      h(
        'section',
        {
          ref: virtualList,
          class: ['virtual-tree'],
          style: listHeight.value,
          ...renderHelper(
            {
              'data-h': props.itemHeight,
            },
            { scroll: scrollEvent }
          ),
        },
        [
          //撑起列表高度
          h('div', {
            ref: phantom,
            class: 'virtual-tree-phantom',
          }),
          //渲染容器
          h(
            'div',
            {
              ref: content,
              class: 'virtual-tree-container',
            },
            renderListData.value.map((item: any) => {
              return slots.default?.({
                item: item,
                index: item._index,
              });
            })
          ),
        ]
      );
  },
};
