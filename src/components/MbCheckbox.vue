<template>
  <label class="checkbox" :class="{dark, disabled, 'full-width': label}">
    <input type="checkbox" :checked="modelValue" :disabled="disabled" @keyup.enter="$emit('update:modelValue', !$event.target.checked)" @change="$emit('update:modelValue', $event.target.checked)">
    <div class="visual-checkbox">
      <MbIcon icon="check" />
    </div>
    <span v-if="label">{{label}}</span>
  </label>
</template>

<script>
import getSlotTextContent from '../assets/js/getSlotTextContent';

export default {
  computed: {
    label() {
      return this.$slots.default && getSlotTextContent(this.$slots.default());
    },
  },
  emits: ['update:modelValue'],
  props: {
    dark: Boolean,
    disabled: Boolean,
    modelValue: Boolean,
  },
};
</script>

<style lang="scss" scoped>
  .checkbox {
    position: relative;
    user-select: none;
    cursor: pointer;
    display: inline-flex;

    &.full-width {
      display: flex;
    }

    &.dark {
      &:hover > input:not(:checked) + .visual-checkbox {
        background-color: var(--bg-secondary-dark);
      }

      > input:focus:not(:checked) + .visual-checkbox {
        background-color: var(--bg-secondary-dark);
      }
    }

    &.disabled {
      pointer-events: none;
      color: var(--text-tertiary);

      &.dark {
        color: var(--text-tertiary-dark);

        .visual-checkbox {
          border-color: var(--text-tertiary-dark);
        }

        > input:checked + .visual-checkbox {
          background-color: var(--bg-secondary-dark);
          color: var(--text-tertiary-dark);
        }
      }

      .visual-checkbox {
        border: 1px dashed var(--text-tertiary-dark);
        box-shadow: none;
        padding: calc(0.25rem - 1px);
      }

      > input:checked + .visual-checkbox {
        background-color: var(--bg-secondary);
        color: var(--text-tertiary-dark);
      }
    }

    &:hover {
      .visual-checkbox {
        background-color: var(--bg-secondary);
      }
    }

    > input {
      opacity: 0; // can’t be display: none because of focussing
      width: 1.5rem;
      height: 1.5rem;
      position: absolute;
      pointer-events: none;

      &:focus + .visual-checkbox {
        background-color: var(--bg-secondary);
        box-shadow: inset 0 0 0 2px var(--accent);
      }

      &:checked + .visual-checkbox {
        color: var(--text-dark);
        background-color: var(--accent);

        .icon {
          stroke-dashoffset: 0;
        }
      }

      &:checked:focus + .visual-checkbox {
        box-shadow: inset 0 0 0 2px var(--accent-secondary);
      }
    }

    .visual-checkbox {
      display: inline-block;
      width: 1.5rem;
      height: 1.5rem;
      border-radius: var(--radius-m);
      padding: 0.25rem;
      line-height: 0;
      box-shadow: inset 0 0 0 1px var(--accent);
      transition: box-shadow 200ms ease, background-color 200ms ease;

      .icon {
        width: 1rem;
        height: 1rem;
        stroke-dasharray: 19.79899024963379;
        stroke-dashoffset: 19.79899024963379;
        transition: stroke-dashoffset 100ms ease;
        transition-delay: 100ms;
        stroke-width: 3;
      }
    }

    > span {
      margin-left: 0.5rem;
    }
  }
</style>
