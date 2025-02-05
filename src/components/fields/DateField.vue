<template>
  <section class="date field" :class="{ dark, error, 'in-split': inSplit }">
    <span>{{label}}:</span>
    <MbDatePicker :class="{ error }" :dark="dark" :format="options.outputFormat" :label="error" :max="validation && validation.max" :min="validation && validation.min" :model-value="safeModelValue" :only="options.only" :removable="options.removable" :show-time="options.showTime" @update:model-value="handleInput" />
  </section>
</template>

<script>
import { isValid } from 'date-fns';

import field from '../../mixins/field';

export default {
  computed: {
    safeModelValue() {
      // sometimes dates may be parsed as Dates by JS-YAML, so we convert it back to outputFormat here to avoid errors
      if (this.modelValue instanceof Date && isValid(this.modelValue)) return this.options.outputFormat === 'iso' ? this.modelValue.toISOString() : this.modelValue.valueOf;
      if (this.modelValue && typeof this.modelValue === 'object') {
        if (this.options.defaultToNow) return this.options.outputFormat === 'iso' ? new Date().toISOString() : Date.now();
        return null;
      }
      return this.modelValue;
    },
  },
  mixins: [field],
};
</script>

<style lang="scss" scoped>
  .date.field {
    display: flex;
    align-items: center;

    &.in-split.dark {
      > .date-picker {
        background-color: var(--bg-tertiary-dark);

        &:hover {
          background-color: var(--bg-tertiary-dark-lightened-5);
        }

        &:active {
          background-color: var(--bg-secondary-dark);
        }
      }
    }

    > span {
      margin-right: auto;
    }

    > .date-picker {
      margin-left: 1rem;

      &.error {
        &:deep(.floating-label) {
          color: var(--negative-saturated);
        }

        &:not(:focus)::before {
          opacity: 1;
          border-color: var(--negative);
        }
      }
    }
  }
</style>
