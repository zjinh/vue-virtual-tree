class TestResizeObserver implements ResizeObserver {
  disconnect(): void {}

  observe(): void {}

  unobserve(): void {}
}

Object.defineProperty(globalThis, 'ResizeObserver', {
  configurable: true,
  value: TestResizeObserver,
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
