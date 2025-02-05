<template>
  <transition>
    <div v-show="visible" class="modal-overlay" :class="{dark}" @click="closeTopmostModal" />
  </transition>
</template>

<script>
export default {
  computed: {
    visible() {
      return this.$store.state.application.openModals.length > 0;
    },
  },
  methods: {
    closeTopmostModal() {
      this.$store.commit('closeTopmostModal');
    },
  },
  props: {
    dark: Boolean,
  },
  watch: {
    visible(nv) {
      // lock the scroll of the body
      if (nv) {
        // document.documentElement.style.setProperty('overflow', 'hidden'); // NOTE: disabled since it messes up the scroll position, need to see if we even need it (on iOS probably)
        document.body.style.setProperty('overflow', 'hidden');
      } else {
        // document.documentElement.style.removeProperty('overflow'); // NOTE: disabled since it messes up the scroll position, need to see if we even need it (on iOS probably)
        document.body.style.removeProperty('overflow');
      }
    },
  },
};
</script>

<style lang="scss" scoped>
  .modal-overlay {
    background-color: color-mix(in srgb, var(--bg-dark) 60%, transparent);
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1;

    &.dark {
      background-color: color-mix(in srgb, black 60%, transparent);
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
