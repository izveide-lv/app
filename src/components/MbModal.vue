<template>
  <teleport to="body">
    <div class="centerer" :style="{ zIndex: modalIndex === -1 ? 999 : modalIndex + 1 }"><!-- This is needed so the modal doesn’t slip under another one while leaving -->
      <transition @after-enter="$emit('after-open')" @after-leave="$emit('after-close')">
        <div v-show="visible" v-bind="$attrs" class="modal" :class="{dark, darkened: nextModal, transition: !swiping, slim, swiping, wiggle }" ref="el" :style="{ opacity, pointerEvents, transform }" tabindex="-1" @focus="handleFocus" @keyup.esc="permanent ? showPermanence({}) : close()" @touchstart="swipeStart" @touchmove="swipeUpdate" @touchend="swipeEnd">
          <header v-if="title">
            <h2 class="h3">{{title}}</h2>
          </header>
          <div class="body" :class="{ padded: paddedBody, 'no-header': !title && paddedBody, 'no-footer': !$slots.actions && paddedBody }" ref="body">
            <slot />
          </div>
          <footer v-if="$slots.actions">
            <slot name="actions" />
          </footer>
        </div>
      </transition>
    </div>
  </teleport>
</template>

<script>
export default {
  beforeUnmount() {
    window.removeEventListener('click', this.showPermanence, { capture: true });
  },
  computed: {
    mobile() {
      return this.$store.state.application.mobile;
    },
    modalIndex() {
      return this.$store.state.application.openModals.indexOf(this.$refs.el);
    },
    nextModal() {
      const { openModals } = this.$store.state.application;
      if (this.modalIndex > -1 && this.modalIndex < openModals.length - 1) return openModals[this.modalIndex + 1];
      return null;
    },
    previousModal() {
      const { openModals } = this.$store.state.application;
      if (this.modalIndex > 0) return openModals[this.modalIndex - 1];
      return null;
    },
    opacity() {
      if (this.visible && this.modalIndex < this.$store.state.application.openModals.length - 2) return 0;
      return null;
    },
  },
  data() {
    return {
      maxSwipeDistance: 0,
      pointerEvents: null,
      previousModalTransform: null,
      startY: 0,
      swiping: false,
      transform: null,
      wiggle: false,
    };
  },
  emits: ['after-close', 'after-open', 'close'],
  inheritAttrs: false,
  methods: {
    close() {
      this.$emit('close');
      if (this.resetFocus && this.focusTarget && typeof this.focusTarget.focus === 'function') this.focusTarget.focus();
    },
    handleFocus(e) {
      this.focusTarget = e.relatedTarget;
    },
    showPermanence(e) {
      if (this.wiggle) return;
      if (!this.$refs.el.contains(e.target) && e.target !== this.$refs.el && this.modalIndex === this.$store.state.application.openModals.length - 1) this.wiggle = true;
      window.setTimeout(() => { this.wiggle = false; }, 350);
    },
    swipeEnd(e) {
      if (!this.swiping) return;
      const finalY = e.changedTouches[0].clientY;
      const distance = finalY - this.startY;
      this.swiping = false;
      if (this.previousModal) {
        this.previousModal.style.removeProperty('transition');
        this.previousModal.style.transform = `translateY(${this.previousModalTransform}px) scale(0.8)`; // restore original transform
      }

      if (distance > this.maxSwipeDistance / 2 || distance > window.innerHeight / 3) {
        this.transform = 'translateY(100%)';
        this.close();
      } else this.transform = null;
    },
    swipeStart(e) {
      if (this.permanent || e.target.closest('[data-drag-handle]')) return; // permanent modals cannot be swiped
      if (this.$refs.body.scrollTop !== 0) return; // we’ll be scrolling
      this.maxSwipeDistance = this.$refs.el.getBoundingClientRect().height;
      this.startY = e.changedTouches[0].clientY;
      this.swiping = true;
      if (this.previousModal) {
        this.previousModal.style.transition = 'none';
        // Based on: https://zellwk.com/blog/css-translate-values-in-javascript/ only works because we translate before we scale
        this.previousModalTransform = Number.parseInt(window.getComputedStyle(this.previousModal).transform.match(/matrix.*\((.+)\)/)[1].split(', ')[5], 10);
      }
    },
    swipeUpdate(e) {
      if (!this.swiping) return;
      const currentY = e.changedTouches[0].clientY;
      const distance = currentY - this.startY;
      if (distance > 0 && e.cancelable) e.preventDefault();
      else if (!e.cancelable) this.swipeEnd({ changedTouches: [{ clientY: this.startY }] }); // if it’s not cancelable, we’re scrolling, so abort
      this.transform = `translateY(${Math.max(distance, 0)}px)`;
      if (this.previousModal) this.previousModal.style.transform = `translateY(${this.previousModalTransform - this.previousModalTransform * (Math.max(distance, 0) / this.maxSwipeDistance)}px) scale(${0.8 + 0.2 * (Math.max(distance, 0) / this.maxSwipeDistance)})`;
    },
    updateOffsets() {
      const nextModalRect = this.nextModal.getBoundingClientRect();
      const ownRect = this.$refs.el.getBoundingClientRect();
      const remBase = Number.parseInt(window.getComputedStyle(document.documentElement).fontSize, 10);
      const margin = 2 * remBase;
      if (this.mobile) {
        const yDelta = (nextModalRect.height - ownRect.height * 0.8); // ownRect has to be scaled to account for later scale-down
        if (yDelta > 0) this.transform = `translateY(-${yDelta + margin}px) scale(0.8)`;
        else this.transform = 'scale(0.8)';
      } else {
        const yDelta = (nextModalRect.height * 1.25 - ownRect.height * 0.8) / 2; // nextModal is at 0.8 size when entering, ownRect has to be scaled to account for later scale-down
        this.transform = `translateY(${yDelta + margin}px) scale(0.8)`;
      }
      this.pointerEvents = 'none';
    },
  },
  mounted() {
    if (this.visible) { // needs to be during mounted so $refs.el is defined
      this.transform = null;
      this.$store.commit('addOpenModal', { el: this.$refs.el, permanent: this.permanent });

      if (this.permanent) window.addEventListener('click', this.showPermanence, { capture: true });
    }
  },
  props: {
    dark: Boolean,
    paddedBody: {
      type: Boolean,
      default: true,
    },
    permanent: Boolean,
    resetFocus: {
      type: Boolean,
      default: true,
    },
    slim: Boolean,
    title: String,
    visible: Boolean,
  },
  watch: {
    modalIndex(nv) {
      if (nv < 0 && this.visible) this.close();
    },
    nextModal(nv) {
      if (!nv) {
        this.transform = null;
        this.pointerEvents = null;
        this.$nextTick(() => this.$refs.el.focus());
      } else this.$nextTick(this.updateOffsets);
    },
    permanent(nv) {
      this.$store.commit('setModalPermanence', { el: this.$refs.el, value: nv });

      if (this.visible) {
        if (nv) window.addEventListener('click', this.showPermanence, { capture: true });
        else window.removeEventListener('click', this.showPermanence, { capture: true });
      }
    },
    visible(nv) {
      if (nv) {
        this.transform = null;
        this.$store.commit('addOpenModal', { el: this.$refs.el, permanent: this.permanent });
        if (this.permanent) window.addEventListener('click', this.showPermanence, { capture: true });
        this.$nextTick(() => {
          this.$refs.body.scrollTop = 0;
          this.$refs.el.focus();
        });
      } else if (this.modalIndex >= 0) {
        window.removeEventListener('click', this.showPermanence, { capture: true });
        this.$store.commit('closeModal', this.modalIndex);
        if (this.resetFocus && this.focusTarget && typeof this.focusTarget.focus === 'function') this.focusTarget.focus();
      }

      if (!nv) this.transform = null; // needed so that the modal actually closes smoothly
    },
  },
};
</script>

<style lang="scss" scoped>
  @use '../assets/styles/breakpoints' as *;

  .centerer {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    z-index: 1;
  }

  .modal {
    width: 40rem;
    max-width: 100%;
    max-height: 70vh;
    display: flex;
    flex-direction: column;
    background-color: var(--bg);
    border-radius: var(--radius-xl);
    border: 1px solid var(--bg-secondary);
    box-shadow: 0 0.75rem 2rem 0 color-mix(in srgb, var(--bg-dark) 18%, transparent);
    overflow: hidden;
    pointer-events: auto; // needed to revert the pointer-events: none from the parent
    touch-action: pan-y;
    user-select: none;

    &.transition {
      transition: transform 200ms ease, opacity 200ms ease;
    }

    &.slim {
      width: rem(488);
    }

    @media #{$mobile} {
      align-self: flex-end;
      max-height: 90vh;
      border-bottom-left-radius: 0;
      border-bottom-right-radius: 0;
      box-shadow: 0 -0.75rem 2rem 0 color-mix(in srgb, var(--bg-dark) 18%, transparent);
      transform-origin: bottom;

      &.transition {
        transition-duration: 250ms;
      }
    }

    &.darkened {
      background-color: var(--bg-secondary);
      border-bottom-left-radius: var(--radius-xl);
      border-bottom-right-radius: var(--radius-xl);

      > * {
        transition: opacity 200ms ease;
        opacity: 0.3;
      }
    }

    &.dark {
      background-color: var(--bg-dark);
      border-color: var(--bg-secondary-dark);

      &.darkened {
        background-color: color-mix(in srgb, black 20%, var(--bg-dark));
        border-color: var(--bg-dark);
      }
    }

    &.wiggle {
      animation: wiggle 350ms ease;

      @keyframes wiggle {
        0% {
          transform: none;
        }

        50% {
          transform: scale(1.1);
        }

        100% {
          transform: none;
        }
      }
    }

    &.v-enter-active,
    &.v-leave-active {
      transition: opacity 150ms ease, transform 150ms cubic-bezier(0.215, 0.61, 0.355, 1) !important;

      @media #{$mobile} {
        transition-duration: 250ms !important;
      }

      &.v-enter-from,
      &.v-leave-to {
        opacity: 0;
        transform: scale(0.8);

        @media #{$mobile} {
          transform: translateY(100%);
          opacity: 1;
        }
      }
    }

    &.v-leave-active {
      transition-timing-function: cubic-bezier(0.645, 0.045, 0.355, 1);
    }

    header {
      flex-shrink: 0;
      text-align: center;
      padding: rem(32);

      @media #{$mobile} {
        padding: 1rem;
      }

      .h3 {
        margin: 0;
      }
    }

    .body {
      overflow-y: auto;
      overflow-x: hidden;
      background-color: inherit;

      &.padded {
        padding: 0 rem(32);

        @media #{$mobile} {
          padding: 0 1rem;
        }
      }

      &.no-header {
        padding-top: rem(32);

        @media #{$mobile} {
          padding-bottom: 1rem;
        }
      }

      &.no-footer {
        padding-bottom: rem(32);

        @media #{$mobile} {
          padding-bottom: 1rem;
        }
      }
    }

    footer {
      flex-shrink: 0;
      padding: rem(32);
      text-align: right;

      &:deep(.button):not(:last-child) {
        margin-right: 1rem;
      }

      @media #{$mobile} {
        padding: 0.5rem;

        &:deep(.button) {
          margin: 0.5rem;

          &:not(:last-child) {
            margin-right: 0.5rem;
          }
        }
      }
    }
  }
</style>
