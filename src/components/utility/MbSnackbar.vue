<template>
  <transition-group class="snackbar" duration="350" tag="div">
    <MbToast v-for="toast in toasts" :dark="dark" :key="toast.id" :toast="toast" />
  </transition-group>
</template>

<script>
import MbToast from './MbToast.vue';

export default {
  components: {
    MbToast,
  },
  computed: {
    toasts() {
      if (this.$store.state.application.mobile) return this.$store.state.application.toasts;
      return [...this.$store.state.application.toasts].reverse();
    },
  },
  props: {
    dark: Boolean,
  },
};
</script>

<style lang="scss" scoped>
  @use '../../assets/styles/breakpoints' as *;

  .snackbar {
    position: fixed;
    top: 1rem;
    left: 50%;
    transform: translateX(-50%);
    margin: 0 auto;
    width: 100%;
    max-width: 40rem;
    pointer-events: none;
    z-index: 100; // toasts should overlay everything like popovers

    @media #{$mobile} {
      top: auto;
      bottom: 0;
    }

    .toast {
      &.v-enter-active,
      &.v-leave-active,
      &.v-move {
        transition: opacity 200ms ease, transform 250ms ease;

        &::before {
          transition: transform 200ms ease;
          transition-delay: 150ms;
        }

        &.v-enter-from,
        &.v-leave-to {
          opacity: 0;
          transform: scale(0.8);

          @media #{$mobile} {
            transform: translateY(100%);
          }

          &::before {
            transform: scaleY(0);
          }
        }

        &.v-leave-to {
          @media #{$mobile} {
            transform: translateY(calc(-100% - 1rem)) scale(0.8);
          }
        }
      }

      &.v-leave-active {
        position: absolute;
        translate: 1rem 0;

        @media #{$mobile} {
          transform: translateY(calc(-100% - 1rem));
        }

        &::before {
          transition-delay: 0ms;
        }
      }
    }
  }
</style>
