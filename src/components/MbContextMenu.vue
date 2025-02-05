<template>
  <MbPopover class="context-menu" :dark="dark" :from-right="fromRight" no-content-padding :steal-focus="stealFocus" :visible="show" :x="x" :y="y" @close="close" @keydown.arrow-down.arrow-up.prevent @keyup.arrow-down="focus(1)" @keyup.arrow-up="focus(-1)">
    <ul class="wrapper" ref="list" tabindex="-1">
      <li v-for="(option, index) in options" :class="[option.type, {dark, disabled: option.disabled, icon: withIcons && !option.icon}]" :key="index" :tabindex="option.disabled ? -1 : 0" @click="handleAction(option.action)" @keydown.space.prevent @keyup.space.enter="handleAction(option.action)" @mouseenter="handleMouseenter($event, index)" @mouseleave="handleMouseleave">
        <MbIcon v-if="option.icon" :icon="option.icon" no-transition />
        <span :class="{ hinted: option.shortcut }">{{option.label}}</span>
        <span v-if="option.shortcut" class="hint">
          <template v-for="(key, index) in option.shortcut" :key="index">
            <kbd>{{key}}</kbd>{{ index !== option.shortcut.length - 1 ? '+' : '' }}
          </template>
        </span>
      </li>
    </ul>
  </MbPopover>
</template>

<script>
export default {
  beforeUnmount() {
    if (this.show) {
      window.removeEventListener('contextmenu', this.close);
      window.removeEventListener('scroll', this.close, { capture: true });
    }
  },
  computed: {
    withIcons() {
      return this.options.some((option) => option.icon);
    },
  },
  data() {
    return {
      currentlySelected: -1,
    };
  },
  emits: ['close'],
  methods: {
    close(e) {
      if (e) e.preventDefault();
      this.$emit('close');
      if (this.target) this.target.focus();
    },
    focus(direction) {
      const elements = this.$refs.list.querySelectorAll('li:not(.disabled)');
      if (elements.length === 0) return;

      if (direction < 0) { // focus previous
        if (this.currentlySelected > 0) this.currentlySelected -= 1;
        else this.currentlySelected = elements.length - 1;
      } else if (direction === 0) {
        this.currentlySelected = 0;
      } else { // focus next
        // eslint-disable-next-line no-lonely-if
        if (this.currentlySelected < elements.length - 1) this.currentlySelected += 1;
        else this.currentlySelected = 0;
      }

      elements[this.currentlySelected].focus();
    },
    handleAction(action) {
      if (typeof action === 'function') action();
      this.close();
    },
    handleMouseenter(e, index) {
      if (this.show) {
        e.currentTarget.focus();
        this.currentlySelected = index;
      }
    },
    handleMouseleave(e) {
      if (this.show && document.activeElement) {
        document.activeElement.blur();
        e.currentTarget.parentElement.focus();
        this.currentlySelected = -1;
      }
    },
  },
  props: {
    dark: Boolean,
    fromRight: Boolean,
    options: Array,
    show: Boolean,
    stealFocus: {
      type: Boolean,
      default: true,
    },
    target: HTMLElement,
    x: Number,
    y: Number,
  },
  watch: {
    show(nv) {
      if (nv) {
        window.setTimeout(() => { // so it doesn’t immediately close again
          window.addEventListener('contextmenu', this.close);
          window.addEventListener('scroll', this.close, { capture: true });
        }, 0);
      } else {
        window.removeEventListener('contextmenu', this.close);
        window.removeEventListener('scroll', this.close, { capture: true });
      }
    },
  },
};
</script>

<style lang="scss" scoped>
  .context-menu {
    .wrapper {
      list-style: none;
      padding: 0.5rem;
      margin: 0;
      user-select: none;

      li {
        display: flex;
        align-items: center;
        width: 100%;
        padding: 0.75rem 1rem;
        cursor: pointer;
        border-radius: var(--radius-m);
        white-space: nowrap;
        transition: background-color 200ms ease;

        &.icon {
          padding-left: 3.75rem;
        }

        &.negative {
          color: var(--negative-saturated);
        }

        &.positive {
          color: var(--positive-saturated);
        }

        &.warning {
          color: var(--warning-saturated);
        }

        &.disabled {
          pointer-events: none;
          color: var(--text-tertiary);

          span.hint kbd {
            opacity: 0.38;
          }
        }

        &.dark {
          &:hover,
          &:focus {
            background-color: var(--bg-tertiary-dark);
          }

          &.disabled {
            color: var(--text-tertiary-dark);
          }
        }

        &:not(:last-child) {
          margin-bottom: 0.5rem;
        }

        &:hover,
        &:focus {
          background-color: var(--bg-secondary);
        }

        .icon {
          margin-right: 0.75rem;
          flex-shrink: 0;
        }

        span {
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;

          &.hinted {
            margin-right: 1rem;
          }

          &.hint {
            margin-left: auto;
          }
        }
      }
    }
  }
</style>
