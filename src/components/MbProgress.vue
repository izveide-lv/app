<template>
  <div class="progress">
    <div class="bar" :class="{ dark }">
      <div class="ink" :class="[inkColor, { indetermined }]" :style="{ transform: `scaleX(${inkScale})` }"/>
    </div>
    <span v-if="label" class="label">{{label}}</span>
  </div>
</template>

<script>
export default {
  computed: {
    inkColor() {
      if (!this.colors || this.colors.length === 0) return '';
      if (this.indetermined || !this.progress) return this.colors[0];
      return this.colors[Math.min(Math.floor(this.colors.length * this.progress), this.colors.length - 1)];
    },
    inkScale() {
      return Math.max(0, Math.min(1, this.progress));
    },
  },
  props: {
    colors: Array,
    dark: Boolean,
    indetermined: Boolean,
    label: String,
    progress: {
      type: Number,
      default: 0,
    },
  },
};
</script>

<style lang="scss" scoped>
  .progress {
    display: inline-flex;
    flex-direction: column;
    width: rem(288);
    user-select: none;

    .bar {
      background-color: var(--bg-secondary);
      height: 0.5rem;
      border-radius: 0.25rem;
      overflow: hidden;

      &.dark {
        background-color: var(--bg-secondary-dark);
      }

      .ink {
        background-color: var(--positive-saturated);
        height: 100%;
        transform-origin: left;
        transition: transform 200ms ease, background-color 200ms ease;

        &.positive {
          background-color: var(--positive-saturated);
        }

        &.negative {
          background-color: var(--negative-saturated);
        }

        &.warning {
          background-color: var(--warning-saturated);
        }

        &.accent {
          background-color: var(--accent);
        }

        &.indetermined {
          // transform-origin: center
          animation: sideToSide 1.2s ease infinite;

          @keyframes sideToSide {
            0% {
              transform: translateX(0) scaleX(0);
            }

            50% {
              transform: translateX(25%) scaleX(0.5);
            }

            100% {
              transform: translateX(25%) scaleX(0);
              transform-origin: right;
            }
          }
        }
      }
    }

    .label {
      margin-top: 0.25rem;
      text-align: right;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
</style>
