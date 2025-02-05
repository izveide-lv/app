<template>
  <MbButton v-bind="$attrs" class="select" :class="{ placeholder: typeof modelValue === 'undefined' || (!allowNull && modelValue === null) }" :dark="dark" :disabled="disabled" icon="chevron-down" :icon-first="false" :loading="loading" ref="button" :rounded="rounded" :tooltip="tooltip" @click="activate">
    {{currentOption}}
  </MbButton>
  <MbPopover center-x class="item-wrapper" :dark="dark" no-content-padding ref="popover" :style="{ width: `${popoverWidth}px` }" :update-on-resize="filterable" :visible="active" :x="position.x" :y="position.y" @close="deactivate" @keydown.arrow-down.arrow-up.prevent @keyup.arrow-down="focus(1)" @keyup.arrow-up="focus(-1)">
    <template v-if="filterable" #header>
      <MbInput v-model="filter" :dark="dark" icon="search" placeholder="Filter Items" ref="filterInput" />
    </template>
    <ul class="items" :class="{ dark }" ref="list" tabindex="-1">
      <li v-for="(option, index) in filteredOptions" :class="{ active: option.value ? option.value === modelValue : option === modelValue, disabled: option.disabled }" :key="option.value" :tabindex="option.disabled ? -1 : 0" @click="selectOption(typeof option.value !== 'undefined' ? option.value : option)" @keydown.space.prevent @keyup.space.enter="selectOption(option.value || option)" @mouseenter="handleMouseenter($event, index)" @mouseleave="handleMouseleave">
        {{option.label || option.value || option}}
      </li>
    </ul>
  </MbPopover>
</template>

<script>
export default {
  beforeUnmount() {
    if (this.filterable) window.removeEventListener('resize', this.setCoordinates, { passive: true });
    window.removeEventListener('scroll', this.deactivate, { capture: true, passive: true });
  },
  computed: {
    currentOption() {
      if (typeof this.modelValue === 'undefined' || (this.modelValue === null && !this.allowNull)) return this.placeholder;
      const activeOption = this.options.find((option) => option.value === this.modelValue);
      if (!activeOption) return this.modelValue;
      return activeOption.label || activeOption.value;
    },
    filteredOptions() {
      if (!this.filter) return this.options;
      return this.options.filter((option) => (option.label && option.label.toLowerCase().includes(this.filter.toLowerCase())) || (String(option.value) && String(option.value).toLowerCase().includes(this.filter.toLowerCase())) || String(option).toLowerCase().includes(this.filter.toLowerCase()));
    },
  },
  data() {
    return {
      active: false,
      currentlySelected: -1,
      filter: '',
      popoverWidth: 0,
      position: {
        x: 0,
        y: 0,
      },
    };
  },
  emits: ['update:modelValue'],
  methods: {
    activate() {
      this.setCoordinates();
      this.active = true;
      window.addEventListener('scroll', this.deactivate, { capture: true, passive: true });
      if (this.filterable) {
        window.addEventListener('resize', this.setCoordinates, { passive: true });
        this.$nextTick(() => this.$refs.filterInput.focus());
      }
    },
    deactivate(e) {
      if (e && (e.target === this.$refs.popover.$refs.el || this.$refs.popover.$refs.el.contains(e.target))) return; // hacky but needed since it’s teleporting
      this.active = false;
      if (this.refocus) this.$refs.button.$el.focus();
      window.removeEventListener('scroll', this.deactivate, { capture: true, passive: true });
      if (this.filterable) window.removeEventListener('resize', this.setCoordinates, { passive: true });
    },
    focus(direction) {
      const elements = this.$refs.list.querySelectorAll('li:not(.disabled)');
      if (elements.length === 0) return;

      if (direction < 0) { // focus previous
        if (this.currentlySelected > 0) this.currentlySelected -= 1;
        else this.currentlySelected = elements.length - 1;
      } else { // focus next
        // eslint-disable-next-line no-lonely-if
        if (this.currentlySelected < elements.length - 1) this.currentlySelected += 1;
        else this.currentlySelected = 0;
      }

      elements[this.currentlySelected].focus();
    },
    handleMouseenter(e, index) {
      if (this.active) {
        if (this.$refs.list.contains(document.activeElement)) this.$refs.list.focus();
        this.currentlySelected = index;
      }
    },
    handleMouseleave() {
      if (this.active) {
        this.currentlySelected = -1;
      }
    },
    selectOption(value) {
      this.$emit('update:modelValue', value);
      this.deactivate();
    },
    setCoordinates() {
      const buttonRect = this.$refs.button.$el.getBoundingClientRect();
      const remBase = Number.parseInt(window.getComputedStyle(document.documentElement).fontSize, 10);
      this.filter = '';
      this.position.x = buttonRect.left + buttonRect.width / 2;
      this.position.y = Math.round(buttonRect.top);
      this.popoverWidth = buttonRect.width + remBase;
    },
  },
  props: {
    allowNull: Boolean,
    dark: Boolean,
    disabled: Boolean,
    filterable: Boolean,
    options: {
      type: Array,
      required: true,
    },
    loading: Boolean,
    modelValue: {},
    placeholder: {
      type: String,
      default: 'Select something…',
    },
    refocus: {
      type: Boolean,
      default: true,
    },
    rounded: Boolean,
    tooltip: [String, Object],
  },
};
</script>

<style lang="scss" scoped>
  @use '../assets/styles/breakpoints' as *;

  .select {
    min-width: rem(192);

    @media #{$mobile} {
      min-width: rem(128);
    }

    &.icon.reversed {
      padding-left: 1rem;
    }

    &.placeholder {
      :deep(.label) {
        color: var(--text-secondary);
      }

      &.dark {
        :deep(.label) {
          color: var(--text-secondary-dark);
        }
      }
    }

    &:deep(.label) {
      margin-right: auto;
      width: auto;
    }
  }

  .item-wrapper {
    .input {
      margin: 0.5rem;
      margin-bottom: 0;
      width: calc(100% - 1rem);
      padding: 0.75rem;

      &.dark {
        background-color: var(--bg-tertiary-dark);
      }
    }

    .items {
      list-style: none;
      user-select: none;
      padding: 0.5rem;
      margin: 0;

      &.dark {
        li {
          &.disabled {
            color: var(--text-tertiary-dark);
          }

          &:hover,
          &:focus {
            background-color: var(--bg-tertiary-dark);
          }
        }
      }

      li {
        padding: 0.75rem 1rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        cursor: pointer;
        border-radius: var(--radius-m);
        transition: background-color 200ms ease;

        &:not(:last-child) {
          margin-bottom: 0.5rem;
        }

        &.active {
          background-color: var(--accent);
          color: var(--text-dark);
        }

        &.disabled {
          pointer-events: none;
          color: var(--text-tertiary);
        }

        &:hover,
        &:focus {
          background-color: var(--bg-secondary);

          &.active {
            background-color: var(--accent-darkened-5);
          }
        }
      }
    }
  }
</style>
