<template>
  <div class="highlight-box" :class="[color, { dark }]" :data-label="label">
    <slot />
  </div>
</template>

<script>
export default {
  props: {
    color: {
      type: String,
      default: 'accent',
    },
    dark: Boolean,
    label: {
      type: String,
      default: 'Please note',
    },
  },
};
</script>

<style lang="scss" scoped>
  .highlight-box {
    margin-top: 1rem;
    border-radius: var(--radius-l);
    padding: rem(24);
    border: rem(1) solid var(--accent);
    position: relative;
    background-color: var(--bg);

    &.dark {
      background-color: var(--bg-dark);

      &.warning::before {
        color: var(--warning-saturated);
      }
    }

    &.accent {
      border-color: var(--accent);

      &::before {
        color: var(--accent);
      }
    }

    &.negative {
      border-color: var(--negative-saturated);

      &::before {
        color: var(--negative-saturated);
      }
    }

    &.positive {
      border-color: var(--positive-saturated);

      &::before {
        color: var(--positive-saturated);
      }
    }

    &.warning {
      border-color: var(--warning-saturated);

      &::before {
        color: var(--text-secondary);
      }
    }

    &::before {
      content: attr(data-label);
      display: inline-block;
      padding: rem(2) rem(8);
      position: absolute;
      top: rem(-14);
      left: 1rem;
      font-weight: 700;
      background-color: inherit;
    }

    :first-child {
      margin-top: 0;
    }

    :last-child {
      margin-bottom: 0;
    }
  }
</style>
