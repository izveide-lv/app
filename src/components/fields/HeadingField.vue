<template>
  <section class="heading field">
    <h2 v-if="options.heading">{{options.heading}}</h2>
    <p v-if="options.description" v-html="options.description" />
  </section>
</template>

<script>
import field from '../../mixins/field';

export default {
  mixins: [field],
};
</script>

<style lang="scss" scoped>
  .heading.field {
    &:first-child {
      h2, p {
        &:first-child {
          margin-top: 0;
        }
      }
    }

    &:last-child {
      h2, p {
        &:last-child {
          margin-bottom: 0;
        }
      }
    }
  }
</style>
