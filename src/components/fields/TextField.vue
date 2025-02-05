<template>
  <section class="text field" :class="{ dark, localised: showLocalisedOptions && languages.length > 1 }">
    <template v-if="!showLocalisedOptions">
      <MbEditor v-if="options && (options.wrapping || options.multiline)" :allow-new-lines="options && options.multiline" :class="{ 'in-split': inSplit }" :dark="dark" :error="error && String(error)" :label="label" :max-len="(validation && validation.max) || null" :model-value="safeModelValue" @update:model-value="handleInput" />
      <MbInput v-else :class="{ 'in-split': inSplit }" :dark="dark" :error="error && String(error)" :label="label" :max-len="(validation && validation.max) || null" :model-value="safeModelValue" @update:model-value="handleInput" />
    </template>
    <LocalisedFieldsContainer
      v-else
      v-slot="{ lang }"
      :active="active"
      :dark="dark"
      :display-value="firstLocalisedValue"
      :error="error"
      :in-split="inSplit"
      :label="label"
      :languages="languages"
      :teleport-target="teleportTarget"
      @modal-closed="$emit('update:error', validateLocalisedValues(safeModelValue, ''))"
      @update:active="$emit('update:active', $event)"
    >
      <MbEditor v-if="options && (options.wrapping || options.multiline)" :allow-new-lines="options && options.multiline" :class="{ 'in-split': renderedInSplit }" :dark="dark" :error="error instanceof Map ? error.get(lang)  : ''" :label="languages.length > 1 ? lang : label" :max-len="(validation && validation.max) || null" :model-value="safeModelValue[lang]" @update:model-value="handleInput($event, lang)" />
      <MbInput v-else :class="{ 'in-split': renderedInSplit }" :dark="dark" :error="error instanceof Map ? error.get(lang) : ''" :label="languages.length > 1 ? lang : label" :max-len="(validation && validation.max) || null" :model-value="safeModelValue[lang]" @update:model-value="handleInput($event, lang)" />
    </LocalisedFieldsContainer>
  </section>
</template>

<script>
import field from '../../mixins/field';

import LocalisedFieldsContainer from '../utility/LocalisedFieldsContainer.vue';

export default {
  components: {
    LocalisedFieldsContainer,
  },
  computed: {
    safeModelValue() {
      if (this.showLocalisedOptions) {
        if (this.modelValue && typeof this.modelValue === 'object') return this.modelValue;
        return this.languages.reduce((acc, lang, index) => {
          if (index === 0 && this.modelValue) acc[lang] = String(this.modelValue);
          else acc[lang] = '';
          return acc;
        }, {});
      }
      if (this.modelValue && typeof this.modelValue === 'object') return Object.values(this.modelValue)[0] || '';
      return this.modelValue || '';
    },
  },
  methods: {
    convertLocalisedValue(localised) {
      if (localised) {
        return this.languages.reduce((acc, lang, index) => {
          if (index === 0 && this.modelValue) acc[lang] = this.modelValue;
          else acc[lang] = '';
          return acc;
        }, {});
      }
      return Object.values(this.modelValue)[0] || '';
    },
  },
  mixins: [field],
  watch: {
    active(nv) {
      if (!nv) this.$emit('update:error', this.validateLocalisedValues(this.safeModelValue, ''));
    },
  },
};
</script>

<style lang="scss" scoped>
  .text.field {
    .input {
      margin-top: 0;
      width: 100%;
    }

    .editor:deep(.content-wrapper) {
      margin-top: 0;
    }
  }

  .localisation-modal .input {
    display: flex;
    width: 100%;
  }

  .input, .editor {
    &:not(:last-child) {
      margin-bottom: 2rem;
    }
  }

  .in-split {
    &.input {
      width: 100%;
      margin-top: 0;

      &:not(:last-child) {
        margin-bottom: 2rem;
      }
    }

    &.dark {
      &.input,
      &.editor:deep(.content-wrapper) {
        background-color: var(--bg-tertiary-dark);
      }
    }
  }
</style>
