<template>
  <div class="input" :class="{ dark, disabled, dirty: error || modelValue || modelValue === 0 || placeholder, error: error || maxLen && modelValue.length > maxLen, icon, warn }" @mousedown.self.prevent @click="focus">
    <MbIcon v-if="icon" :icon="error && !focussed ? warn ? 'warning' : 'error' : icon" @mousedown.prevent />
    <label v-if="displayLabel" :class="{ clearable, right: !label && maxLen, spinners: showSpinner }">{{displayLabel}}</label>
    <input autocomplete="off" :disabled="disabled" :placeholder="placeholder" :name="name" ref="input" :type="type" :value="modelValue" @blur="handleBlur" @focus="handleFocus" @[emissionevent]="handleUpdate">
    <MbButton v-if="showSpinner" :dark="dark" icon="minus" rounded @click="$emit('update:modelValue', addStep(-1))" />
    <MbButton v-if="showSpinner" :dark="dark" icon="plus" rounded @click="$emit('update:modelValue', addStep(+1))" />
    <MbButton v-if="clearable" :dark="dark" icon="clear" rounded @click="$emit('update:modelValue', '')" />
  </div>
</template>

<script>
export default {
  computed: {
    displayLabel() {
      if (this.error) return this.error;
      if (this.maxLen && this.type !== 'number' && (this.error || this.modelValue || this.placeholder)) {
        if (this.label) return `${this.label} (${this.modelValue.length}/${this.maxLen})`;
        return `(${this.modelValue.length}/${this.maxLen})`;
      }
      if (this.label) return this.label;
      return false;
    },
    emissionevent() {
      if (this.modelModifiers.lazy) return 'change';
      return 'input';
    },
    showSpinner() {
      return this.type === 'number' && !this.noSpinner;
    },
  },
  data() {
    return {
      focussed: false,
    };
  },
  emits: ['blur', 'focus', 'update:modelValue'],
  methods: {
    addStep(step) {
      const value = Number(this.modelValue);

      if (Number.isNaN(value)) return step;
      return value + step;
    },
    focus() {
      this.$refs.input.focus();
    },
    handleBlur() {
      this.focussed = false;
      this.$emit('blur');
    },
    handleFocus() {
      this.focussed = true;
      this.$emit('focus');
    },
    handleUpdate(e) {
      if (this.modelModifiers.trim) this.$emit('update:modelValue', e.target.value.trim());
      else if (this.modelModifiers.number) {
        const num = Number.parseFloat(e.target.value);
        if (Number.isNaN(num)) this.$emit('update:modelValue', '');
        else this.$emit('update:modelValue', num);
      } else this.$emit('update:modelValue', e.target.value);
    },
  },
  mounted() {
    if (this.autofocus) this.$refs.input.focus();
  },
  props: {
    autofocus: Boolean,
    clearable: Boolean,
    dark: Boolean,
    disabled: Boolean,
    error: String,
    icon: String,
    label: String,
    maxLen: Number,
    modelModifiers: {
      type: Object,
      default: () => ({}),
    },
    name: {
      type: String,
      default: () => Math.random().toString(36).substring(2, 9),
    },
    noSpinner: Boolean,
    placeholder: String,
    type: {
      type: String,
      default: 'text',
    },
    modelValue: [Number, String],
    warn: Boolean,
  },
};
</script>

<style lang="scss" scoped>
  .input {
    display: inline-flex;
    vertical-align: middle;
    align-items: center;
    background-color: var(--bg-secondary);
    border-radius: var(--radius-m);
    padding: 1rem;
    position: relative;
    width: 16rem;
    max-width: 100%;
    cursor: text;
    margin-top: 1.5rem;
    border: 0.0625rem solid transparent; // exists for the disabled fields
    transition: box-shadow 200ms ease;

    &.dark {
      background-color: var(--bg-secondary-dark);

      &.error.warn {
        > label {
          color: var(--warning-saturated);
        }
      }

      > label {
        color: var(--text-secondary-dark);
      }

      > input {
        caret-color: currentColor;

        &::placeholder {
          color: var(--text-secondary-dark);
        }

        &:-webkit-autofill {
          box-shadow: inset 0 0 0 rem(100) var(--bg-secondary-dark);
        }
      }
    }

    &.icon {
      > label {
        left: 3rem;
        width: calc(100% - 4rem);

        &.clearable {
          width: calc(100% - 4rem - 2.65625rem); // 100% - padding - width of the clear button
        }

        &.spinners {
          width: calc(100% - 4rem - 2.65625rem * 2); // 100% - padding - width of the clear button
        }
      }

      > input {
        width: calc(100% - 2rem); // firefox doesn’t shrink input fields apparently
      }
    }

    &.error {
      color: var(--negative-saturated);
      box-shadow: inset 0 0 0 0.125rem var(--negative);

      &:focus-within {
        color: inherit;
      }

      > label {
        color: var(--negative-saturated);
      }

      &.warn {
        color: inherit;
        box-shadow: inset 0 0 0 0.125rem var(--warning-saturated);

        &:focus-within .icon {
          color: inherit;
        }

        > label {
          color: var(--warning-saturated-darkened-25);
        }

        .icon {
          color: var(--warning-saturated);
        }
      }
    }

    &.disabled {
      pointer-events: none;
      background-color: transparent;
      border-style: dashed;
      border-color: var(--text-tertiary);
      color: var(--text-tertiary);
      box-shadow: none;

      &.dark {
        border-color: var(--text-tertiary-dark);
        color: var(--text-tertiary-dark);
      }

      > label {
        color: inherit;
      }

      > input::placeholder {
        color: inherit;
      }
    }

    &:focus-within {
      box-shadow: inset 0 0 0 2px var(--accent);
    }

    &:focus-within,
    &.dirty {
      label,
      label.spinners,
      label.clearable {
        transform: translate(calc(-1rem + var(--radius-m)), calc(-100% - 1.25rem)) scale(0.75);
        width: calc(125% + 1rem - (2 * var(--radius-m))); // it’s scaled down by 0.75
      }

      &.icon > label {
        width: calc(125% + 1rem - (2 * var(--radius-m)));
        transform: translate(calc(-3rem + var(--radius-m)), calc(-100% - 1.25rem)) scale(0.75);
      }
    }

    > .icon {
      margin-right: 0.5rem;
      flex-shrink: 0;
    }

    > label {
      flex-shrink: 0;
      display: block;
      cursor: text;
      user-select: none;
      color: var(--text-secondary);
      transform-origin: bottom left;
      position: absolute;
      white-space: nowrap;
      width: calc(100% - 2rem);
      overflow: hidden;
      text-overflow: ellipsis;
      transition: transform 200ms ease;
      pointer-events: none;

      &.right {
        text-align: right;
      }

      &.clearable {
        width: calc(100% - 2rem - 2.65625rem); // 100% - padding - width of the clear button
      }

      &.spinners {
        width: calc(100% - 2rem - 2.65625rem * 2); // 100% - padding - width of the spinner buttons
      }
    }

    > input {
      width: 100%;
      font-size: inherit;
      color: inherit;
      border: none;
      background-color: transparent;
      padding: 0;
      height: 1.5rem;
      text-overflow: ellipsis;
      caret-color: var(--accent);
      appearance: textfield;
      -moz-appearance: textfield;

      &::-webkit-outer-spin-button,
      &::-webkit-inner-spin-button,
      &::-webkit-clear-button,
      &::-webkit-search-decoration,
      &::-webkit-search-cancel-button,
      &::-webkit-search-results-button,
      &::-webkit-search-results-decoration {
        -webkit-appearance: none;
        margin: 0;
      }

      &::placeholder {
        color: var(--text-secondary);
        opacity: 1;
        user-select: none;
      }

      &:-webkit-autofill {
        box-shadow: inset 0 0 0 rem(100) var(--bg-secondary);
      }
    }

    > .button.icon.no-label {
      margin: rem(-9) 0;
      margin-left: 0.25rem;
      padding: 0.75rem;

      &:last-child {
        margin-right: rem(-9);
      }
    }
  }
</style>
