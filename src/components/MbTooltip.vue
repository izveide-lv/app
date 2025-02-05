<template>
  <teleport to="body">
    <transition>
      <div v-show="target && visible" v-bind="$attrs" class="tooltip" :class="[ positionOverride || position ]" ref="body" :style="{ transform: `translate(${transform.x}px, ${transform.y}px)` }" v-html="message || lastMessage" />
    </transition>
  </teleport>
</template>

<script>
export default {
  data() {
    return {
      lastMessage: null,
      positionOverride: '',
      remBase: Number.parseInt(window.getComputedStyle(document.documentElement).fontSize, 10),
      transform: {
        x: 0,
        y: 0,
      },
    };
  },
  inheritAttrs: false, // because this technically qualifies as a fragment since it teleports
  methods: {
    update() {
      const rect = this.$refs.body.getBoundingClientRect();
      const targetRect = this.target.getBoundingClientRect();
      const windowRect = { width: window.innerWidth, height: window.innerHeight };
      const margin = 0.5 * this.remBase;

      const leftX = Math.round(targetRect.left - margin - rect.width);
      const leftY = Math.round(targetRect.top + targetRect.height / 2 - rect.height / 2);
      const rightX = Math.round(targetRect.right + margin);
      const rightY = leftY;
      const topX = Math.max(Math.min(Math.round(targetRect.left + targetRect.width / 2 - rect.width / 2), windowRect.width - margin - rect.width), margin);
      const topY = Math.round(targetRect.top - margin - rect.height);
      const bottomX = topX;
      const bottomY = Math.round(targetRect.bottom + margin);

      const leftPossible = leftX >= margin;
      const rightPossible = rightX + rect.width <= windowRect.width - margin;
      const topPossible = topY >= margin;
      const bottomPossible = bottomY + rect.height <= windowRect.height - margin;

      this.positionOverride = '';

      switch (this.position) {
        case 'left':
          if (leftPossible) {
            this.transform.x = leftX;
            this.transform.y = leftY;
          } else if (rightPossible) {
            this.transform.x = rightX;
            this.transform.y = rightY;
            this.positionOverride = 'right';
          } else if (topPossible) {
            this.transform.x = topX;
            this.transform.y = topY;
            this.positionOverride = 'top';
          } else {
            this.transform.x = bottomX;
            this.transform.y = bottomY;
            this.positionOverride = 'bottom';
          }
          return;
        case 'right':
          if (rightPossible) {
            this.transform.x = rightX;
            this.transform.y = rightY;
          } else if (leftPossible) {
            this.transform.x = leftX;
            this.transform.y = leftY;
            this.positionOverride = 'left';
          } else if (topPossible) {
            this.transform.x = topX;
            this.transform.y = topY;
            this.positionOverride = 'top';
          } else {
            this.transform.x = bottomX;
            this.transform.y = bottomY;
            this.positionOverride = 'bottom';
          }
          return;
        case 'top':
          if (topPossible || !bottomPossible) {
            this.transform.x = topX;
            this.transform.y = topY;
          } else {
            this.transform.x = bottomX;
            this.transform.y = bottomY;
            this.positionOverride = 'bottom';
          }
          return;
        case 'bottom':
        default:
          if (bottomPossible || !topPossible) {
            this.transform.x = bottomX;
            this.transform.y = bottomY;
          } else {
            this.transform.x = topX;
            this.transform.y = topY;
            this.positionOverride = 'top';
          }
      }
    },
  },
  props: {
    message: String,
    position: {
      type: String,
      validator: (v) => ['top', 'left', 'right', 'bottom'].includes(v),
    },
    visible: Boolean,
    target: [HTMLElement, SVGSVGElement],
  },
  watch: {
    message(nv, ov) {
      if (!nv) this.lastMessage = ov;
    },
    target(nv) {
      if (nv) this.$nextTick(this.update);
    },
    visible(nv) {
      if (nv) this.$nextTick(this.update);
    },
  },
};
</script>

<style lang="scss" scoped>
  .tooltip {
    position: fixed;
    top: 0;
    left: 0;
    background-color: color-mix(in srgb, var(--bg-tertiary-dark) 80%, transparent);
    padding: 0.5rem 1rem;
    color: var(--text-dark);
    border-radius: var(--radius-m);
    pointer-events: none;
    clip-path: circle(100% at 50% 0%);
    z-index: 999; // needs to be on top of everything
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: calc(100% - 1rem);

    &.left {
      clip-path: circle(141.42135624% at 100% 50%);
    }

    &.right {
      clip-path: circle(141.42135624% at 0% 50%);
    }

    &.top {
      clip-path: circle(100% at 50% 100%);
    }

    &.v-enter-active,
    &.v-leave-active {
      transition: clip-path 200ms ease;

      &.v-enter-from,
      &.v-leave-to {
        clip-path: circle(0% at 50% 0%);

        &.left {
          clip-path: circle(0% at 100% 50%);
        }

        &.right {
          clip-path: circle(0% at 0% 50%);
        }

        &.top {
          clip-path: circle(0% at 50% 100%);
        }
      }
    }
  }
</style>
