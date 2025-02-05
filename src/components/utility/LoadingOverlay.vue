<template>
  <transition>
    <div v-if="$store.state.application.loading" class="loading-overlay" :class="{ dark }">
      <MbLoader />
    </div>
  </transition>
</template>

<script>
export default {
  props: {
    dark: Boolean,
  },
};
</script>

<style lang="scss" scoped>
  .loading-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 999;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--bg);

    &.dark {
      background-color: var(--bg-dark);
    }

    &.v-enter-active,
    &.v-leave-active {
      transition: opacity 200ms ease;

      &.v-enter-from,
      &.v-leave-to {
        opacity: 0;
      }
    }
  }
</style>
