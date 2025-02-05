<template>
  <section class="color field" :class="{ dark, error, 'in-split': inSplit }">
    <span>{{label}}:</span>
    <MbColorPicker :class="{ error }" :dark="dark" :data-error="error" :format="options.format" :model-value="modelValue" :palette="palette" :palette-only="options.paletteOnly" :removable="options.removable" @update:model-value="handleInput" />
  </section>
</template>

<script>
import field from '../../mixins/field';

export default {
  computed: {
    palette() {
      let palette = [];

      if (this.options.useBrandPalette) palette = palette.concat(this.$store.state.currentProject.brandColors);
      if (this.options.palette) palette = palette.concat(this.options.palette);
      return palette;
    },
  },
  mixins: [field],
};
</script>

<style lang="scss" scoped>
  .color.field {
    display: flex;
    align-items: center;

    &.in-split.dark {
      > .color-picker {
        background-color: var(--bg-tertiary-dark);

        &:hover {
          background-color: var(--bg-tertiary-dark-lightened-5);
        }

        &:active {
          background-color: var(--bg-secondary-dark);
        }
      }
    }

    > span {
      margin-right: auto;
    }

    > .color-picker {
      margin-left: 1rem;

      &.error {
        &:not(:focus)::before {
          opacity: 1;
          border-color: var(--negative);
        }

        &::after {
          content: attr(data-error);
          position: absolute;
          top: -1.125rem;
          left: var(--radius-m);
          font-size: 0.75rem;
          color: var(--negative-saturated);
        }
      }
    }
  }
</style>
