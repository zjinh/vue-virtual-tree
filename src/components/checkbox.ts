import './checkbox.less'
import { defineComponent } from 'vue'
import type { PropType, VNode } from 'vue'
import { renderCompat } from './render-compat'

interface FormContext {
  disabled?: boolean
}

type CheckboxModel = boolean | unknown[]

export default defineComponent({
  __scopeId: 'data-v-vvt-checkbox',
  _scopeId: 'data-v-vvt-checkbox',
  name: 'Checkbox',
  emits: ['change', 'update:modelValue'],
  inject: {
    elForm: {
      default: () => ({}),
    },
    elFormItem: {
      default: () => ({}),
    },
  },
  componentName: 'Checkbox',
  data() {
    return {
      selfModel: false,
    };
  },
  computed: {
    model: {
      get(): CheckboxModel {
        if (this.modelValue !== undefined) {
          return this.modelValue
        }
        return this.selfModel
      },
      set(value: CheckboxModel) {
        this.$emit('update:modelValue', value)
        if (typeof value === 'boolean') this.selfModel = value
      },
    },
    store(): CheckboxModel | undefined {
      return this.modelValue;
    },
    isDisabled(): boolean {
      return this.disabled || Boolean((this as unknown as { elForm: FormContext }).elForm.disabled)
    },
  },
  props: {
    modelValue: {
      type: [Boolean, Array] as PropType<CheckboxModel>,
      default: undefined,
    },
    label: {
      type: null as unknown as PropType<unknown>,
      default: undefined,
    },
    indeterminate: Boolean,
    disabled: Boolean,
    checked: Boolean,
    name: String,
    id: String,
    controls: String,
    border: Boolean,
    size: String
  },
  methods: {
    addToStore(): void {
      if (Array.isArray(this.model) && this.model.indexOf(this.label) === -1) {
        this.model.push(this.label)
      } else {
        this.model = true
      }
    },
    handleChange(event: Event): void {
      const target = event.target as HTMLInputElement
      this.$emit('change', target.checked, event)
    },
  },
  render(): VNode {
    return renderCompat(this, 'div', { class: 'checkbox-wrapper' }, [
      renderCompat(this, 'input', {
        class: 'checkbox',
        attrs: {
          id: this.id,
          type: 'checkbox',
          'aria-hidden': this.indeterminate ? 'true' : 'false',
          disabled: this.isDisabled,
          name: this.name,
          'aria-controls': this.indeterminate ? this.controls : undefined,
        },
        domProps: {
          value: this.label,
          checked: this.model,
          indeterminate: this.indeterminate,
        },
        on: { change: this.handleChange },
      }),
    ])
  },
  created() {
    if (this.checked) this.addToStore()
  },
})
