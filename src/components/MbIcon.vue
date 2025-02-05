<template>
  <transition mode="out-in" :name="transition">
    <svg class="icon" viewBox="0 0 24 24" fill="none" :key="icon" xmlns="http://www.w3.org/2000/svg">
      <use :xlink:href="`#icons/${icon}`" />
    </svg>
  </transition>
</template>

<script>
export default {
  computed: {
    transition() {
      if (this.noTransition) return '';
      return 'swirl';
    },
  },
  props: {
    icon: {
      type: String,
      default: 'mattrbld',
    },
    noTransition: Boolean,
  },
};
</script>

<style lang="scss" scoped>
  .icon {
    display: inline-block;
    stroke-width: 2px;
    stroke-linejoin: round;
    stroke-linecap: round;
    width: 1.5rem;
    height: 1.5rem;
    vertical-align: middle;

    &.swirl-enter-active,
    &.swirl-leave-active {
      transition: transform 200ms ease, opacity 200ms ease;

      &.swirl-enter-from,
      &.swirl-leave-to {
        opacity: 0;
      }

      &.swirl-enter-from {
        transform: rotate(-45deg);
      }

      &.swirl-leave-to {
        transform: rotate(45deg);
      }
    }
  }
</style>
