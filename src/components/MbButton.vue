<template>
  <button class="button" :class="[type, { dark, disabled, loading, rounded, icon, reversed: !iconFirst, 'no-label': !label }]" :disabled="disabled || loading" @click="handleClick" @mouseenter="handleTooltip" @focus="handleTooltip">
    <MbIcon v-if="icon" :class="{ invisible: loading }" :icon="icon" />
    <span v-if="label" class="label" :class="{ invisible: loading }">{{ label }}</span>
    <MbInlineLoader v-if="loading" />
  </button>
</template>

<script>
import getSlotTextContent from '../assets/js/getSlotTextContent';

export default {
  computed: {
    label() {
      return this.$slots.default && getSlotTextContent(this.$slots.default());
    },
  },
  emits: ['click'],
  methods: {
    handleClick(e) {
      this.$emit('click', e);
    },
    handleTooltip(e) {
      if (!this.tooltip) return;
      const tooltip = {
        target: e.currentTarget,
      };
      if (typeof this.tooltip === 'string') tooltip.message = this.tooltip;
      else Object.assign(tooltip, this.tooltip);
      this.$store.commit('setTooltip', tooltip);
    },
  },
  props: {
    dark: Boolean,
    disabled: Boolean,
    icon: String,
    iconFirst: {
      type: Boolean,
      default: true,
    },
    loading: Boolean,
    rounded: Boolean,
    tooltip: [String, Object],
    type: {
      type: String,
      validator: (v) => ['negative', 'positive', 'primary', 'warning'].includes(v),
    },
  },
};
</script>

<style lang="scss" scoped>
  .button {
    display: inline-flex;
    padding: 1rem 1.5rem;
    border: 1px solid var(--accent);
    border-radius: var(--radius-m);
    background-color: transparent;
    color: currentColor;
    cursor: pointer;
    user-select: none;
    white-space: nowrap;
    position: relative;
    vertical-align: middle;
    overflow: hidden;
    transition: background-color 200ms ease;

    &:hover,
    &:focus {
      background-color: var(--bg-tertiary);
    }

    &:focus::before {
      opacity: 1;
    }

    &:active {
      transform: translateY(2px);
      background-color: var(--bg-secondary);
    }

    &.dark {
      &:hover,
      &:focus {
        background-color: var(--bg-tertiary-dark);
      }

      &:active {
        background-color: var(--bg-secondary-dark);
      }
    }

    &.icon {
      align-items: center;
      padding-right: 2.5rem;
      padding-left: 1rem;

      &.reversed {
        flex-direction: row-reverse;
        padding-right: 1rem;
        padding-left: 2.5rem;

        .icon {
          margin-left: 1rem;
          margin-right: 0;
        }
      }

      &.no-label {
        padding-right: 1rem;
        padding-left: 1rem;
        border: none;

        .icon {
          margin: -0.1875rem; // needed so the buttons keep the same height even with the icon
        }
      }

      .icon {
        margin-right: 1rem;
        margin-top: -0.1875rem; // needed so the buttons keep the same height even with the icon
        margin-bottom: -0.1875rem;
      }
    }

    &.primary {
      background-color: var(--accent);
      color: var(--text-dark);

      &:hover,
      &:focus {
        background-color: var(--accent-darkened-5);
      }

      &:active {
        background-color: var(--accent-darkened-10);
      }

      &::before {
        border-color: var(--accent-secondary);
      }
    }

    &.rounded {
      border-radius: rem(26); // 26 === Button.height / 2
    }

    &.positive {
      border-color: var(--positive);
      color: var(--positive-saturated);

      &:hover,
      &:focus {
        background-color: color-mix(in srgb, var(--positive) 10%, transparent);
      }

      &:active {
        background-color: color-mix(in srgb, var(--positive) 15%, transparent);
      }

      &::before {
        border-color: var(--positive);
      }
    }

    &.negative {
      border-color: var(--negative);
      color: var(--negative-saturated);

      &:hover,
      &:focus {
        background-color: color-mix(in srgb, var(--negative) 10%, transparent);
      }

      &:active {
        background-color: color-mix(in srgb, var(--negative) 15%, transparent);
      }

      &::before {
        border-color: var(--negative);
      }
    }

    &.warning {
      border-color: var(--warning-saturated);

      &:hover,
      &:focus {
        background-color: color-mix(in srgb, var(--warning) 10%, transparent);
      }

      &:active {
        background-color: color-mix(in srgb, var(--warning) 15%, transparent);
      }

      &::before {
        border-color: var(--warning-saturated);
      }
    }

    &.disabled,
    &.loading {
      pointer-events: none;
      border: 1px dashed var(--text-tertiary);
      color: var(--text-tertiary);

      &.primary {
        background-color: var(--bg-secondary);
      }

      &.dark {
        border-color: var(--text-tertiary-dark);
        color: var(--text-tertiary-dark);

        .inline-loader {
          color: var(--text-dark);
        }

        &.primary {
          background-color: var(--bg-secondary-dark);
        }
      }

      .inline-loader {
        color: var(--text);
      }
    }

    &::before {
      content: '';
      position: absolute;
      top: -1px;
      left: -1px;
      right: -1px;
      bottom: -1px;
      border: 2px solid var(--accent);
      opacity: 0;
      border-radius: inherit;
      transition: opacity 200ms ease;
    }

    .label {
      overflow: hidden;
      text-overflow: ellipsis;
      width: 100%;
    }

    .icon {
      flex-shrink: 0;
    }

    .label,
    .icon {
      transition: opacity 200ms ease;

      &.invisible {
        opacity: 0;
      }
    }

    .inline-loader {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
    }
  }
</style>
