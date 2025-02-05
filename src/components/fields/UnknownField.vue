<template>
  <section class="unknown field" :class="{ dark }">
    <p>The field “{{label}}” is of an unknown type and cannot be displayed</p>
  </section>
</template>

<script>
import field from '../../mixins/field';

export default {
  mixins: [field],
};
</script>

<style lang="scss" scoped>
  .unknown.field {
    padding: 1rem;
    border: 0.0625rem dashed var(--text-tertiary);
    border-radius: var(--radius-l);
    color: var(--text-secondary);
    text-align: center;

    &.dark {
      color: var(--text-secondary-dark);
      border-color: var(--text-tertiary-dark);
    }
  }
</style>
