<template>
  <div class="icon-picker" :class="{ dark }" tabindex="0" @click="activate" @keydown.space.prevent @keyup.space.enter="activate">
    <MbIcon :icon="modelValue || 'mattrbld'" />
    <span class="label" :class="{ placeholder: !modelValue }">{{modelValue || placeholder}}</span>
    <MbButton v-if="removable" v-show="modelValue" :dark="dark" icon="cross" ref="removeButton" rounded tooltip="Clear path" @click="$emit('update:modelValue', null)" />
    <MbPopover center-x class="picker-popover" :dark="dark" no-content-padding ref="popover" :visible="showPicker" :x="popover.x" :y="popover.y" @after-close="iconFilter = ''" @close="deactivate">
      <div class="content-wrapper">
        <header>
          <MbInput v-model="iconFilter" :dark="dark" icon="search" placeholder="Filter icons…" />
        </header>
        <MbScroller direction="vertical">
          <ul>
            <li v-for="icon in filteredIcons" :class="{ active: icon === modelValue, dark }" :key="icon" tabindex="0" @click="pickIcon(icon)" @keydown.space.prevent @keyup.space.enter="pickIcon(icon)">
              <MbIcon :icon="icon" />
              <span>{{icon}}</span>
            </li>
          </ul>
        </MbScroller>
      </div>
      <template #footer>
        <MbButton :dark="dark" @click="deactivate">Cancel</MbButton>
      </template>
    </MbPopover>
  </div>
</template>

<script>
import { pathBasename } from '../fs';

function generateIconsList() {
  // using ?url here to avoid a warning during build (since the icons are also imported by the SvgSprite), adding import: 'default' inflates the bundle
  return Object.keys(import.meta.glob('@/assets/icons/**.svg', { query: '?url' })).map((path) => pathBasename(path).replace(/^(.*)\.\w+$/, '$1'));
}

export default {
  availableIcons: generateIconsList(),
  computed: {
    filteredIcons() {
      if (!this.iconFilter) return this.$options.availableIcons;
      return this.$options.availableIcons.filter((icon) => icon.includes(this.iconFilter.toLowerCase()));
    },
  },
  data() {
    return {
      iconFilter: '',
      popover: {
        x: 0,
        y: 0,
      },
      showPicker: false,
    };
  },
  emits: ['update:modelValue'],
  methods: {
    activate(e) {
      if (e && this.removable && (e.target === this.$refs.removeButton.$el || this.$refs.removeButton.$el.contains(e.target))) return;
      const rect = this.$el.getBoundingClientRect();
      const remBase = Number.parseInt(window.getComputedStyle(document.documentElement).fontSize, 10);
      this.listWidth = Math.max(20, rect.width / remBase);
      this.popover.x = rect.left + rect.width / 2;
      this.popover.y = rect.bottom + 0.5 * remBase;
      window.addEventListener('scroll', this.deactivate, { capture: true, passive: true });
      this.showPicker = true;
    },
    deactivate(e) {
      if (e && e.type === 'scroll' && this.$refs.popover.$refs.el.contains(e.target)) return;
      window.removeEventListener('scroll', this.deactivate, { capture: true, passive: true });
      this.showPicker = false;
      this.$el.focus();
    },
    pickIcon(icon) {
      this.$emit('update:modelValue', icon);
      this.deactivate();
    },
  },
  props: {
    dark: Boolean,
    modelValue: String,
    placeholder: {
      type: String,
      default: 'Pick an icon…',
    },
    removable: Boolean,
  },
};
</script>

<style lang="scss" scoped>
  @use '../assets/styles/breakpoints' as *;

  .icon-picker {
    position: relative;
    border: none;
    background-color: var(--bg-secondary);
    color: inherit;
    border-radius: var(--radius-m);
    padding: 1rem;
    padding-right: 1.5rem;
    display: inline-flex;
    align-items: center;
    cursor: pointer;
    transition: background-color 200ms ease;
    user-select: none;
    text-align: left;
    white-space: nowrap;
    max-width: 100%;
    overflow: hidden;

    &:hover {
      background-color: var(--bg-tertiary);
    }

    &:focus {
      background-color: var(--bg-secondary);

      &::before {
        opacity: 1;
      }
    }

    &:active {
      transform: translateY(2px);
    }

    &.dark {
      background-color: var(--bg-secondary-dark);

      &:hover {
        background-color: var(--bg-tertiary-dark);
      }

      &:focus {
        background-color: var(--bg-secondary-dark);
      }

      .label.placeholder {
        color: var(--text-secondary-dark);
      }
    }

    &::before {
      content: '';
      position: absolute;
      top: 0px;
      left: 0px;
      right: 0px;
      bottom: 0px;
      box-shadow: inset 0 0 0 0.125rem var(--accent);
      opacity: 0;
      border-radius: inherit;
      transition: opacity 200ms ease;
    }

    .label {
      margin-left: 0.75rem;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-right: auto;

      &.placeholder {
        color: var(--text-secondary);
      }
    }

    .icon {
      flex-shrink: 0;
    }

    .button.icon {
      margin: -0.5rem;
      margin-left: 0.5rem;
      margin-right: -1rem;
      padding: rem(8.5);
    }
  }

  .picker-popover {
    .content-wrapper {
      background-color: inherit;

      header {
        padding: 0.5rem;

        .input {
          width: 100%;

          &.dark {
            background-color: var(--bg-tertiary-dark);
          }
        }
      }

      ul {
        user-select: none;
        max-height: 30rem;
        margin: 0;
        padding: 0.5rem;
        padding-top: 0;
        list-style: none;

        background-color: inherit;
        display: flex;
        flex-wrap: wrap;
        max-width: rem(3 * (88 + 16) + 16);

        &::after {
          content: '';
          display: block;
          height: 0.5rem;
          width: 100%;
        }

        li {
          margin: 0.5rem;
          padding: 0.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          background-color: var(--bg-secondary);
          border-radius: var(--radius-m);
          width: rem(88);
          overflow: hidden;
          cursor: pointer;
          transition: background-color 200ms ease;
          position: relative;

          &:hover {
            background-color: var(--bg-tertiary);
          }

          &:focus::before {
            opacity: 1;
          }

          &:active {
            transform: translateY(0.125rem);
            background-color: var(--bg);
          }

          &.dark {
            background-color: var(--bg-tertiary-dark);
            box-shadow: inset 0 0 0 0.0625rem var(--bg-tertiary-dark-lightened-3);

            &:hover {
              background-color: var(--bg-tertiary-dark-lightened-5);
            }

            &:active {
              background-color: var(--bg-secondary-dark);
            }

            span {
              color: var(--text-secondary-dark);
            }
          }

          &.active {
            background-color: var(--accent);
            color: var(--text-dark);

            &:hover,
            &:focus {
              background-color: var(--accent-darkened-5);
            }

            span {
              color: var(--text-secondary-dark);
            }
          }

          &::before {
            content: '';
            position: absolute;
            top: 0px;
            left: 0px;
            right: 0px;
            bottom: 0px;
            box-shadow: inset 0 0 0 0.125rem var(--accent);
            opacity: 0;
            border-radius: inherit;
            transition: opacity 200ms ease;
          }

          .icon {
            display: block;
            margin-bottom: 0.5rem;
            margin-top: 0.5rem;
          }

          span {
            font-size: 0.875rem;
            color: var(--text-secondary);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            max-width: 100%;
          }
        }
      }
    }
  }
</style>
