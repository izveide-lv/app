<template>
  <section class="list field" :class="{ dark, localised: showLocalisedOptions && languages.length > 1 }">
    <template v-if="!showLocalisedOptions">
      <span class="label" :class="{ dark, error }">{{error || label}}</span>
      <MbItemList v-if="options.limitToModel" :class="{ 'in-split': inSplit }" :dark="dark" :model-value="safeModelValue" :options="model" placeholder="Select an item…" @update:model-value="handleInput" />
      <MbEditableList v-else :class="{ 'in-split': inSplit }" :dark="dark" force-mode="simple" :model-value="safeModelValue" @update:model-value="handleInput" />
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
      <span class="label" :class="{ dark, error: error instanceof Map && error.get(lang) }">{{error instanceof Map && error.get(lang) || languages.length > 1 ? lang : label}}</span>
      <MbItemList v-if="options.limitToModel" :class="{ 'in-split': renderedInSplit }" :dark="dark" :model-value="safeModelValue[lang]" :options="model" placeholder="Select an item…" @update:model-value="handleInput($event, lang)" />
      <MbEditableList v-else :class="{ 'in-split': renderedInSplit }" :dark="dark" force-mode="simple" :model-value="safeModelValue[lang]" @update:model-value="handleInput($event, lang)" />
    </LocalisedFieldsContainer>
  </section>
</template>

<script>
import fs, { joinPath } from '../../fs';

import field from '../../mixins/field';

import LocalisedFieldsContainer from '../utility/LocalisedFieldsContainer.vue';

export default {
  components: {
    LocalisedFieldsContainer,
  },
  computed: {
    model() {
      if (Array.isArray(this.options.model)) return this.options.model;
      // it’s a file
      return this.fileModel;
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
  },
  created() {
    if (this.options.model && !Array.isArray(this.options.model)) this.fetchFileModel();
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
      if (!this.options.model.path || !this.options.model.key) this.fileModel = [];
      else {
        try {
          this.fileModel = JSON.parse(await fs.readFile(joinPath('/projects', this.$store.state.currentProject.id, this.options.model.path), 'utf8'))[this.options.model.key];
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
    'options.model': {
      handler(nv, ov) {
        if (!Array.isArray(nv) && nv.path && nv.key && (this.fileModel.length === 0 || ov.path !== nv.path)) this.fetchFileModel();
      },
    },
  },
};
</script>

<style lang="scss" scoped>
  .label {
    display: block;
    font-size: 0.75rem;
    margin-bottom: 0.25rem;
    color: var(--text-secondary);

    &.dark {
      color: var(--text-secondary-dark);
    }

    &.error {
      color: var(--negative-saturated);
    }
  }

  .item-list:not(:last-child),
  .editable-list:not(:last-child) {
    margin-bottom: 2rem;
  }

  .item-list.in-split {
    &:deep(.item-dark) {
      background-color: var(--bg-tertiary-dark);
      box-shadow: inset 0 0 0 0.0625rem var(--bg-tertiary-dark-lightened-5);
    }
  }

  .editable-list.in-split {
    &:deep(.item.dark) {
      background-color: var(--bg-tertiary-dark);

      .input {
        background-color: var(--bg-tertiary-dark);
        border-left-color: var(--bg-secondary-dark);
        border-right-color: var(--bg-secondary-dark);
      }
    }
  }
</style>
