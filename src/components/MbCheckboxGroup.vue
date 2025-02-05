<template>
  <div class="checkbox-group" :class="{ inline }">
    <MbCheckbox v-for="(checkbox, index) in checkboxes" :dark="dark" :disabled="checkbox.disabled" :key="index" :model-value="modelValue.indexOf(checkbox.value) > -1" @update:model-value="handleChange($event, checkbox.value)">{{checkbox.label}}</MbCheckbox>
  </div>
</template>

<script>
export default {
  methods: {
    handleChange(value, checkbox) {
      if (value) this.$emit('update:modelValue', [...this.modelValue, checkbox]); // needs to be a new array, hence no push
      else this.$emit('update:modelValue', this.modelValue.filter((chb) => chb !== checkbox));
    },
  },
  props: {
    checkboxes: {
      type: Array,
      default: () => [],
    },
    dark: Boolean,
    inline: Boolean,
    modelValue: Array,
  },
};
</script>

<style lang="scss" scoped>
  .checkbox-group {
    display: flex;
    flex-direction: column;

    &.inline {
      flex-direction: row;
      flex-wrap: wrap;
      margin: -0.5rem;

      .checkbox {
        margin: 0.5rem;
      }
    }

    .checkbox:not(:last-child) {
      margin-bottom: 0.5rem;
    }
  }
</style>
