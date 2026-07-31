const resizeObservers = new Set<TestResizeObserver>()

class TestResizeObserver implements ResizeObserver {
  readonly #callback: ResizeObserverCallback
  readonly #elements = new Set<Element>()

  constructor(callback: ResizeObserverCallback) {
    this.#callback = callback
    resizeObservers.add(this)
  }

  disconnect(): void {
    this.#elements.clear()
    resizeObservers.delete(this)
  }

  observe(element: Element): void {
    this.#elements.add(element)
  }

  unobserve(element: Element): void {
    this.#elements.delete(element)
  }

  trigger(element?: Element): void {
    const targets = element
      ? this.#elements.has(element) ? [element] : []
      : Array.from(this.#elements)
    if (targets.length === 0) return
    this.#callback(
      targets.map((target) => ({ target }) as ResizeObserverEntry),
      this,
    )
  }
}

Object.defineProperty(globalThis, 'ResizeObserver', {
  configurable: true,
  value: TestResizeObserver,
})

Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  value: (query: string) => ({
    addEventListener() {},
    matches: false,
    media: query,
    removeEventListener() {},
  }),
})

Object.defineProperty(globalThis, 'triggerResizeObservers', {
  configurable: true,
  value(element?: Element) {
    for (const observer of resizeObservers) observer.trigger(element)
  },
})

const pixelSize = (element: HTMLElement, property: 'height' | 'width'): number => {
  const value = Number.parseFloat(element.style[property])
  return Number.isFinite(value) ? value : property === 'height' ? 260 : 640
}

for (const property of ['clientHeight', 'offsetHeight'] as const) {
  Object.defineProperty(HTMLElement.prototype, property, {
    configurable: true,
    get(this: HTMLElement) {
      return pixelSize(this, 'height')
    },
  })
}

for (const property of ['clientWidth', 'offsetWidth', 'scrollWidth'] as const) {
  Object.defineProperty(HTMLElement.prototype, property, {
    configurable: true,
    get(this: HTMLElement) {
      return pixelSize(this, 'width')
    },
  })
}

Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
  configurable: true,
  value(this: HTMLElement, options: ScrollToOptions | number, y?: number) {
    if (typeof options === 'number') {
      this.scrollLeft = options
      this.scrollTop = y ?? 0
      return
    }

    this.scrollLeft = options.left ?? this.scrollLeft
    this.scrollTop = options.top ?? this.scrollTop
  },
})
