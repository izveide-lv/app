<template>
  <div class="scroller" :class="[direction]" @mousedown.prevent="startDrag">
    <div class="scroll-area" ref="scrollArea" @scroll.passive="toggleScrollShadows">
      <slot />
    </div>
    <div class="shadow start" :class="{ visible: shadow.start }" />
    <div class="shadow end" :class="{ visible: shadow.end }" />
  </div>
</template>

<script>
export default {
  beforeUnmount() {
    this.$store.commit('observers/removeResizeListener', this.$refs.scrollArea);
    this.observer.disconnect();
  },
  data() {
    return {
      drag: {
        active: false,
        lastSpeed: 0,
        preventClick: false,
        start: 0,
      },
      observer: null,
      shadow: {
        start: false,
        end: false,
      },
    };
  },
  methods: {
    carryMomentum(speed) {
      if (this.drag.active || Math.abs(speed) < 0.5 || !speed) return;
      this.$refs.scrollArea.scrollLeft -= speed;
      window.requestAnimationFrame(() => this.carryMomentum(speed * 0.92));
    },
    preventClick(e) {
      e.stopPropagation();
      window.removeEventListener('click', this.preventClick, { capture: true });
    },
    startDrag(e) {
      if (this.direction !== 'horizontal' || e.button === 2) return;
      if (e.button === 0) this.drag.preventClick = true;
      this.drag.start = e.clientX;
      window.addEventListener('mousemove', this.updateDrag);
      window.addEventListener('mouseup', this.stopDrag);
    },
    stopDrag() {
      this.drag.active = false;
      window.removeEventListener('mousemove', this.updateDrag);
      window.removeEventListener('mouseup', this.stopDrag);
      this.carryMomentum(this.drag.lastSpeed);
      this.drag.lastSpeed = 0;
    },
    toggleScrollShadows() {
      if (this.direction === 'horizontal') {
        const hasHorizontalScrollbar = this.$refs.scrollArea.clientWidth < this.$refs.scrollArea.scrollWidth;

        const scrolledFromLeft = this.$refs.scrollArea.offsetWidth + this.$refs.scrollArea.scrollLeft;

        // Round using ceil to make sure it always disappears, even when the devicePixelRatio is off due to Chrome rounding
        const scrolledToRight = Math.ceil(scrolledFromLeft) >= Math.ceil(this.$refs.scrollArea.scrollWidth);
        const scrolledToLeft = this.$refs.scrollArea.scrollLeft === 0;

        this.shadow.end = hasHorizontalScrollbar && !scrolledToRight;
        this.shadow.start = hasHorizontalScrollbar && !scrolledToLeft;
      } else {
        const hasVerticalScrollbar = this.$refs.scrollArea.clientHeight < this.$refs.scrollArea.scrollHeight;

        const scrolledFromTop = this.$refs.scrollArea.offsetHeight + this.$refs.scrollArea.scrollTop;

        // Round using ceil to make sure it always disappears, even when the devicePixelRatio is off due to Chrome rounding
        const scrolledToBottom = Math.ceil(scrolledFromTop) >= Math.ceil(this.$refs.scrollArea.scrollHeight);
        const scrolledToTop = this.$refs.scrollArea.scrollTop === 0;

        this.shadow.end = hasVerticalScrollbar && !scrolledToBottom;
        this.shadow.start = hasVerticalScrollbar && !scrolledToTop;
      }
    },
    updateDrag(e) {
      if (!this.drag.active && Math.abs(e.clientX - this.drag.start) > 10) {
        this.drag.active = true;
        if (this.drag.preventClick) {
          window.addEventListener('click', this.preventClick, { capture: true });
          this.drag.preventClick = false; // we’re done, we can reset
        }
      }
      if (!this.drag.active) return;
      this.$refs.scrollArea.scrollLeft -= e.movementX;
      this.drag.lastSpeed = e.movementX;
    },
  },
  mounted() {
    this.toggleScrollShadows();
    this.$store.commit('observers/addResizeListener', { el: this.$refs.scrollArea, cb: this.toggleScrollShadows });

    if ('MutationObserver' in window) {
      this.observer = new MutationObserver(this.toggleScrollShadows);
      this.observer.observe(this.$refs.scrollArea, { childList: true, subtree: true });
    } else console.warn('Mutation Observers are not supported in this browser / context');
  },
  props: {
    direction: {
      type: String,
      default: 'horizontal',
      validator: (v) => ['horizontal', 'vertical'].includes(v),
    },
  },
};
</script>

<style lang="scss" scoped>
  .scroller {
    position: relative;
    overflow: hidden;

    &.horizontal {
      .scroll-area {
        overflow-x: auto;
        overflow-y: hidden;
      }
    }

    &.vertical {
      .scroll-area {
        overflow-x: hidden;
        overflow-y: auto;
      }

      .shadow {
        left: 0;
        right: 0;

        &.start {
          top: 0;
          bottom: auto;
          border-top: 2px dashed var(--accent-secondary);
        }

        &.end {
          bottom: 0;
          top: auto;
          border-bottom: 2px dashed var(--accent-secondary);
        }
      }
    }

    .scroll-area {
      max-height: inherit;
      max-width: inherit;
      scrollbar-width: none;
      -ms-overflow-style: none;

      &::-webkit-scrollbar {
        display: none;
      }
    }

    .shadow {
      position: absolute;
      top: 0;
      bottom: 0;
      pointer-events: none;
      opacity: 0;
      transition: opacity 200ms ease;

      &.visible {
        opacity: 1;
      }

      &.start {
        left: 0;
        border-left: 2px dashed var(--accent-secondary);
      }

      &.end {
        right: 0;
        border-right: 2px dashed var(--accent-secondary);
      }
    }
  }
</style>
