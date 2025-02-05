<template>
  <section class="toggle field">
    <MbToggle :dark="dark" :icons="icons" :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)">
      {{label}}:
    </MbToggle>
  </section>
</template>

<script>
import field from '../../mixins/field';

export default {
  computed: {
    icons() {
      if (this.options.iconLeft && this.options.iconRight) return [this.options.iconLeft, this.options.iconRight];
      return null;
    },
  },
  mixins: [field],
};
</script>

<style lang="scss" scoped>
</style>
