<template>
  <section class="tags field" :class="{ dark, localised: showLocalisedOptions && languages.length > 1 }">
    <template v-if="!showLocalisedOptions">
      <MbTagInput :allow-unsuggested="options.allowUnsuggested" :autocomplete-model="autocompleteModel" :autocomplete-property="autocompleteProperty" :class="{ 'in-split': inSplit }" :dark="dark" :external-error="error && String(error)" :label="label" :max="(validation && validation.max) || null" :min="(validation && validation.min) || null" :model-value="safeModelValue" :placeholder="placeholder" :value-property="valueProperty" @update:model-value="handleInput" />
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
      <MbTagInput :allow-unsuggested="options.allowUnsuggested" :autocomplete-model="autocompleteModel" :autocomplete-property="autocompleteProperty" :class="{ 'in-split': renderedInSplit }" :dark="dark" :external-error="error instanceof Map ? error.get(lang) : null" :label="languages.length > 1 ? lang : label" :max="(validation && validation.max) || null" :min="(validation && validation.min) || null" :model-value="safeModelValue[lang]" :placeholder="placeholder" :value-property="valueProperty" @update:model-value="handleInput($event, lang)" />
    </LocalisedFieldsContainer>
  </section>
</template>

<script>
import pluralize from 'pluralize';

import fs, { joinPath } from '../../fs';

import field from '../../mixins/field';

import LocalisedFieldsContainer from '../utility/LocalisedFieldsContainer.vue';

export default {
  components: {
    LocalisedFieldsContainer,
  },
  computed: {
    autocompleteModel() {
      if (Array.isArray(this.options.autocompleteModel)) return this.options.autocompleteModel;
      // it’s a file
      return this.fileModel;
    },
    autocompleteProperty() {
      if (!this.autocompleteModel || !Array.isArray(this.autocompleteModel) || this.autocompleteModel.length === 0) return null;
      if (typeof this.autocompleteModel[0] !== 'string') return 'label';
      return null;
    },
    firstLocalisedValue() {
      if (this.modelValue && Array.isArray(this.modelValue)) return this.modelValue.map((entry) => entry.label || entry).join(', ');
      if (this.modelValue) {
        const firstVal = Object.values(this.modelValue).find((value) => value);
        if (!firstVal) return null;
        return firstVal.map((entry) => entry.label || entry).join(', ');
      }
      return null;
    },
    placeholder() {
      if (this.label) return `New ${pluralize.singular(this.label)}…`;
      return 'New Tag…';
    },
    safeModelValue() {
      if (this.showLocalisedOptions) {
        if (this.modelValue && typeof this.modelValue === 'object' && !Array.isArray(this.modelValue)) return this.modelValue;
        return this.languages.reduce((acc, lang, index) => {
          if (index === 0 && this.modelValue) acc[lang] = this.modelValue;
          else acc[lang] = [];
          return acc;
        }, {});
      }
      if (this.modelValue && typeof this.modelValue === 'object' && !Array.isArray(this.modelValue)) return Object.values(this.modelValue)[0] || [];
      return this.modelValue || [];
    },
    valueProperty() {
      if (!this.autocompleteModel || !Array.isArray(this.autocompleteModel) || this.autocompleteModel.length === 0) return null;
      if (typeof this.autocompleteModel[0] !== 'string') return 'value';
      return null;
    },
  },
  created() {
    if (this.options.autocompleteModel && !Array.isArray(this.options.autocompleteModel)) this.fetchFileModel();
  },
  data() {
    return {
      fileModel: [],
    };
  },
  methods: {
    convertLocalisedValue(localised) {
      if (localised) {
        return this.languages.reduce((acc, lang, index) => {
          if (index === 0 && this.modelValue) acc[lang] = this.modelValue;
          else acc[lang] = [];
          return acc;
        }, {});
      }
      return Object.values(this.modelValue)[0] || [];
    },
    async fetchFileModel() {
      if (!this.options.autocompleteModel.path || !this.options.autocompleteModel.key) this.fileModel = [];
      else {
        try {
          this.fileModel = JSON.parse(await fs.readFile(joinPath('/projects', this.$store.state.currentProject.id, this.options.autocompleteModel.path), 'utf8'))[this.options.autocompleteModel.key];
        } catch (err) {
          this.$store.commit('addToast', { message: `Something went wrong while loading the model for ${this.label}: ${err}`, type: 'error' });
        }
      }
    },
  },
  mixins: [field],
  watch: {
    active(nv) {
      if (!nv) this.$emit('update:error', this.validateLocalisedValues(this.safeModelValue, ''));
    },
    'options.autocompleteModel': {
      handler(nv, ov) {
        if (!Array.isArray(nv) && nv.path && nv.key && (this.fileModel.length === 0 || ov.path !== nv.path)) this.fetchFileModel();
      },
    },
  },
};
</script>

<style lang="scss" scoped>
  .tags.field {
    .tag-input {
      margin-top: 0;
    }
  }

  .tag-input:not(:last-child) {
    margin-bottom: 2rem;
  }

  .localisation-modal .tag-input:not(:last-child) {
    margin-bottom: 2rem;
  }

  .in-split.dark.tag-input {
    background-color: var(--bg-tertiary-dark);
  }
</style>
