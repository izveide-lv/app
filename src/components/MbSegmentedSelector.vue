<template>
  <div class="segmented-selector" :class="{ dark }">
    <transition>
      <div v-show="activeOptionIndex > -1" class="ink" :class="{ disabled: options[activeOptionIndex] && options[activeOptionIndex].disabled }" :style="{ transform: inkTransform, width: `calc((100% - ${0.125 * (options.length - 1)}rem) * ${1 / options.length })` }" />
    </transition>
    <span v-for="(option, index) in options" class="option" :class="{ active: index === activeOptionIndex, disabled: option.disabled }" :key="index" :tabindex="option.disabled ? -1 : 0" @click.left="selectOption(option)" @keydown.space.prevent @keyup.space.enter="selectOption(option)">{{option.label || option.value || option}}</span>
  </div>
</template>

<script>
export default {
  computed: {
    activeOptionIndex() {
      return this.options.findIndex((option) => {
        if (typeof option.value !== 'undefined') return this.modelValue === option.value;
        return this.modelValue === option;
      });
    },
  },
  created() {
    if (this.activeOptionIndex < 0) return;
    this.inkTransform = `translateX(calc(${this.activeOptionIndex * 100}% + ${this.activeOptionIndex * 0.125}rem))`;
  },
  data() {
    return {
      inkTransform: null,
    };
  },
  emits: ['update:modelValue'],
  methods: {
    selectOption(option) {
      if (typeof option.value !== 'undefined') this.$emit('update:modelValue', option.value);
      else this.$emit('update:modelValue', option);
    },
  },
  props: {
    dark: Boolean,
    modelValue: {},
    options: Array,
  },
  watch: {
    activeOptionIndex(nv, ov) {
      if (nv < 0) this.inkTransform = `translateX(calc(${ov * 100}% + ${ov * 0.125}rem))`;
      else this.inkTransform = `translateX(calc(${nv * 100}% + ${nv * 0.125}rem))`;
    },
  },
};
</script>

<style lang="scss" scoped>
  .segmented-selector {
    background-color: var(--bg-secondary);
    border-radius: var(--radius-m);
    position: relative;
    display: flex;
    box-shadow: 0 0 0 0.125rem var(--bg-secondary);

    &.dark {
      background-color: var(--bg-secondary-dark);
      box-shadow: 0 0 0 0.125rem var(--bg-secondary-dark);

      .option.disabled {
        color: var(--text-tertiary-dark);
      }
    }

    .ink {
      background-color: var(--accent);
      border-radius: var(--radius-m);
      position: absolute;
      top: 0;
      left: 0;
      width: 0;
      height: 100%;
      transition: transform 200ms cubic-bezier(0.645, 0.045, 0.355, 1);

      &.disabled {
        opacity: 0.7;
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

    .option {
      display: inline-block;
      width: 100%;
      text-align: center;
      text-overflow: ellipsis;
      overflow: hidden;
      position: relative;
      padding: 0.75rem 1.25rem;
      cursor: pointer;
      border-radius: var(--radius-m);
      white-space: nowrap;

      &:not(:last-child) {
        margin-right: 0.125rem;
      }

      &.active {
        color: var(--text-dark);
        pointer-events: none;

        &::before {
          box-shadow: inset 0 0 0 0.125rem var(--accent-lightened-5);
        }

        &.disabled {
          color: var(--text-tertiary-dark);
        }
      }

      &:focus-visible,
      &:hover {
        &::before {
          opacity: 1;
        }
      }

      &:active {
        transform: translateY(0.125rem);
      }

      &.disabled {
        pointer-events: none;
        color: var(--text-tertiary);
      }

      &::before {
        content: '';
        position: absolute;
        display: block;
        width: 100%;
        height: 100%;
        top: 0;
        left: 0;
        border-radius: var(--radius-m);
        box-shadow: inset 0 0 0 0.125rem var(--accent);
        opacity: 0;
        transition: opacity 200ms ease;
      }
    }
  }
</style>
