<template>
  <main class="tab-content" :class="{ split: showSplit }">
    <div class="content-wrapper" :class="{ dark, padded }">
      <slot />
    </div>
    <transition @after-leave="$emit('split-closed')">
      <div v-if="!isMobile" v-show="showSplit" class="content-wrapper right" :class="{ dark, padded }" ref="scrollerRight">
        <div class="close-wrapper">
          <MbButton class="close-button" :dark="dark" icon="cross" rounded @click="$emit('split-close')" />
        </div>
        <slot name="right" />
      </div>
    </transition>
    <MbModal v-if="isMobile" :dark="dark" :padded-body="padded" :visible="showSplit" @after-close="$emit('split-closed')" @close="$emit('split-close')">
      <slot :is-modal="true" name="right" />
      <template #actions>
        <MbButton :dark="dark" @click="$emit('split-close')">Close</MbButton>
      </template>
    </MbModal>
  </main>
</template>

<script>
export default {
  computed: {
    isMobile() {
      return this.$store.state.application.mobile;
    },
  },
  data() {
    return {
      entering: false,
    };
  },
  emits: ['split-close', 'split-closed'],
  methods: {
    scrollSplit(amount = 0) {
      if (!this.$refs.scrollerRight) return;
      this.$refs.scrollerRight.scrollTop = amount;
    },
  },
  props: {
    dark: Boolean,
    padded: {
      type: Boolean,
      default: true,
    },
    showSplit: Boolean,
  },
  watch: {
    showSplit(nv) {
      if (nv && this.$refs.scrollerRight) this.$nextTick(() => { this.$refs.scrollerRight.scrollTop = 0; });
    },
  },
};
</script>

<style lang="scss" scoped>
  @use '../../assets/styles/breakpoints' as *;

  .tab-content {
    overflow-x: hidden;
    position: relative;

    &.split {
      .content-wrapper {
        &:first-child {
          width: 50%;
          transition-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);
          background-color: var(--bg-tertiary);

          @media #{$mobile} {
            width: 100%;
          }

          &.dark {
            background-color: var(--bg-dark);
          }
        }
      }
    }

    .content-wrapper {
      width: 100%;
      height: 100%;
      overflow-x: hidden;
      overflow-y: auto;
      background-color: var(--bg);

      &:first-child {
        transition: background-color 200ms ease, width 200ms cubic-bezier(0.645, 0.045, 0.355, 1);
      }

      &.dark {
        background-color: var(--bg-dark);
      }

      &.padded {
        padding: 0 2rem 8rem 2rem;

        @media #{$tablet} {
          padding: 0 1rem 4rem 1rem;
        }

        &.right .close-wrapper .close-button {
          right: -1rem;
        }
      }

      &.right {
        position: absolute;
        top: 0;
        left: 50%;
        width: 50%;

        &.dark {
          background-color: var(--bg-secondary-dark);
        }

        &.v-enter-active,
        &.v-leave-active {
          transition: transform 200ms cubic-bezier(0.215, 0.61, 0.355, 1);

          &.v-enter-from,
          &.v-leave-to {
            transform: translateX(100%);
          }
        }

        &.v-leave-active {
          transition-timing-function: cubic-bezier(0.645, 0.045, 0.355, 1);
        }

        .close-wrapper  { // HACK: this is needed to get the button positioned absolute **and** sticky
          position: sticky;
          top: 1rem;
          z-index: 1;

          .close-button {
            position: absolute;
            top: 0;
            right: 1rem;
          }
        }
      }
    }
  }
</style>
