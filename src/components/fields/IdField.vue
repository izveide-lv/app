<template>
  <section class="id field">
    <MbInput :class="{ 'in-split': inSplit }" :dark="dark" :disabled="!options.editable || options.type === 'template'" :error="error && String(error)" icon="hash" :label="label" :model-value="modelValue" placeholder="A unique value" @update:model-value="handleInput" />
    <MbButton v-if="options.editable && options.type !== 'template'" :dark="dark" :disabled="originalValue === modelValue" icon="undo" rounded tooltip="Reset to initial value" @click="handleInput(originalValue)" />
  </section>
</template>

<script>
import field from '../../mixins/field';

export default {
  created() {
    this.originalValue = this.modelValue;
  },
  mixins: [field],
};
</script>

<style lang="scss" scoped>
  .id.field {
    display: flex;
    align-items: center;

    .input {
      width: 100%;
      margin-top: 0;

      &.dark.in-split {
        background-color: var(--bg-tertiary-dark);
      }
    }

    .button {
      margin-left: 0.5rem;
    }
  }
</style>
