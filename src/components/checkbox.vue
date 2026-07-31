<template>
  <div class="checkbox-wrapper">
    <input
        :id="id"
        class="checkbox"
        type="checkbox"
        :aria-hidden="indeterminate ? 'true' : 'false'"
        :disabled="isDisabled"
        :value="label"
        :name="name"
        :aria-controls="indeterminate ? controls : undefined"
        :checked="model"
        :indeterminate="indeterminate"
        @change="handleChange"
    />
  </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue'
import type { PropType } from 'vue'

interface FormContext {
  disabled?: boolean
}

type CheckboxModel = boolean | unknown[]

export default defineComponent({
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
      return this.disabled || Boolean((this.elForm as FormContext).disabled)
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
  created() {
    if (this.checked) this.addToStore()
  },
})
</script>

<style lang="less" scoped>
.checkbox-wrapper {
  display: inline-block;
  position: relative;
  vertical-align: middle;
  white-space: nowrap;
  cursor: pointer;
  outline: none;
  line-height: 1;
  font-size: 14px;
  user-select: none;
  margin-right: 8px;
  
  .checkbox {
    position: relative;
    display: inline-block;
    width: 14px;
    height: 14px;
    margin: 0;
    vertical-align: middle;
    border: 1px solid #dcdfe6;
    border-radius: 2px;
    background-color: #fff;
    transition: border-color .25s cubic-bezier(.71,-.46,.2,1.46),
                background-color .25s cubic-bezier(.71,-.46,.2,1.46);
    cursor: pointer;
    outline: none;
    
    &:checked {
      background-color: #409eff;
      border-color: #409eff;
      
      &::after {
        box-sizing: content-box;
        content: "";
        border: 1px solid #fff;
        border-left: 0;
        border-top: 0;
        height: 7px;
        left: 4px;
        position: absolute;
        top: 1px;
        transform: rotate(45deg);
        width: 3px;
      }
    }
    
    &:indeterminate {
      background-color: #409eff;
      border-color: #409eff;
      
      &::after {
        content: '';
        position: absolute;
        display: block;
        background-color: #fff;
        height: 2px;
        transform: scale(0.5);
        left: 0;
        right: 0;
        top: 5px;
      }
    }
    
    &:disabled {
      background-color: #f5f7fa;
      border-color: #e4e7ed;
      cursor: not-allowed;
      
      &:checked {
        background-color: #f5f7fa;
        border-color: #e4e7ed;
      }
      
      &:indeterminate {
        background-color: #f5f7fa;
        border-color: #e4e7ed;
      }
    }
  }
}
</style>
