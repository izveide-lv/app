<template>
  <MbModal class="add-repeating-field-modal" :dark="dark" title="Add new…" :visible="visible" @after-close="fieldFilter = ''" @close="$emit('close')">
    <div v-if="fields.length > 6" class="input-wrapper">
      <MbInput v-model="fieldFilter" clearable :dark="dark" icon="search" :placeholder="`Filter available ${pluralizedItemLabel}`" />
    </div>
    <ul>
      <li v-for="field in filteredFields" :key="field.key">
        <MbButton :dark="dark" :icon="field.icon" @click="$emit('add-item', field)">{{field.label}}</MbButton>
      </li>
    </ul>
    <template #actions>
      <MbButton :dark="dark" @click="$emit('close')">Cancel</MbButton>
    </template>
  </MbModal>
</template>

<script>
import { plural } from 'pluralize';

export default {
  computed: {
    filteredFields() {
      if (!this.fieldFilter) return this.fields;
      return this.fields.filter((field) => field.label.toLowerCase().includes(this.fieldFilter.toLowerCase()) || field.type.toLowerCase().includes(this.fieldFilter.toLowerCase()));
    },
    pluralizedItemLabel() {
      return plural(this.itemLabel);
    },
  },
  data() {
    return {
      fieldFilter: '',
    };
  },
  emits: ['add-item', 'close'],
  props: {
    dark: Boolean,
    fields: Array,
    itemLabel: String,
    visible: Boolean,
  },
};
</script>

<style lang="scss" scoped>
  @use '../../assets/styles/breakpoints' as *;

  .add-repeating-field-modal {
    &.dark .input-wrapper {
      background-color: var(--bg-dark);
    }

    .input-wrapper {
      position: sticky;
      top: 0;
      z-index: 1;
      background-color: var(--bg);

      .input {
        margin-bottom: 1rem;
        margin-top: 0;
        width: 100%;
      }
    }

    ul {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      grid-gap: 1rem;

      @media #{$mobile} {
        grid-template-columns: 1fr;
      }

      &:last-child {
        margin-bottom: 0.125rem;
      }

      li {
        .button {
          width: 100%;
        }
      }
    }
  }
</style>
