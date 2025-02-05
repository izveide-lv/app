<template>
  <div class="chip" :class="[color]">
    <transition mode="out-in">
      <MbInlineLoader v-if="loading" />
      <span v-else :key="label">{{label}}</span>
    </transition>
  </div>
</template>

<script>
export default {
  data() {
    return {
    };
  },
  props: {
    color: {
      type: String,
      default: 'accent',
      validator: (v) => ['accent', 'negative', 'positive', 'warning'].includes(v),
    },
    label: String,
    loading: Boolean,
  },
};
</script>

<style lang="scss" scoped>
  .chip {
    padding: 0.5rem 0.75rem;
    border-radius: 1rem;
    background-color: var(--accent);
    color: var(--text-dark);
    white-space: nowrap;
    overflow: hidden;
    font-size: rem(12);
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    vertical-align: middle;
    display: inline-block;
    line-height: 1;
    transition: background-color 200ms ease;

    &.negative {
      background-color: var(--negative-saturated);
    }

    &.positive {
      background-color: var(--positive-saturated);
    }

    &.warning {
      color: var(--text-secondary);
      background-color: var(--warning-saturated);

      &.dark {
        color: var(--text-dark);
      }
    }

    .inline-loader {
      height: rem(12);
    }

    span {
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;

      &.v-enter-active,
      &.v-leave-active {
        transition: transform 200ms ease;

        &.v-enter-from {
          transform: translateY(-1.25rem);
        }

        &.v-leave-to {
          transform: translateY(1.25rem);
        }
      }
    }
  }
</style>
