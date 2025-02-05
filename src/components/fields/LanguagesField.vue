<template>
  <section class="languages field">
    <p :class="{ error }">{{ error || `${label}:` }}</p>
    <MbCheckboxGroup :checkboxes="checkboxes" :dark="dark" inline :model-value="modelValue || []" @update:model-value="handleInput" />
  </section>
</template>

<script>
import field from '../../mixins/field';

export default {
  computed: {
    checkboxes() {
      if (!this.$store.state.currentProject.languages) return [];
      return this.$store.state.currentProject.languages.map((lang) => ({ label: lang, value: lang }));
    },
  },
  mixins: [field],
};
</script>

<style lang="scss" scoped>
  .languages.field {
    > p {
      margin-top: 0;
      margin-bottom: 0.5rem;

      &.error {
        color: var(--negative-saturated);
      }
    }
  }
</style>
