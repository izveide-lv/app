<template>
  <section class="file field" :class="{ dark, localised: showLocalisedOptions && languages.length > 1 }">
    <template v-if="!showLocalisedOptions">
      <span class="label" :class="{ dark, error }">{{error || label}}</span>
      <MbFilePicker :allow-upload="options.allowUpload" :class="{ error, 'in-split': inSplit }" :dark="dark" :empty-state="pickerEmptyState" :filetypes="options.filetypes" :folders-first="true" :max-size="validation && validation.max ? validation.max : $store.state.currentProject.media.maxSize" mode="file" :model-value="safeModelValue" relative-to-root :removable="options.removable" :root="root" @update:model-value="prependProjectRootAndUpdateValue" />
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
      <MbFilePicker :allow-upload="options.allowUpload" :class="{ 'in-split': renderedInSplit, error: error instanceof Map && error.get(lang) }" :dark="dark" :filetypes="options.filetypes" :folders-first="false" :max-size="validation && validation.max ? validation.max : $store.state.currentProject.media.maxSize" mode="file" :model-value="safeModelValue[lang]" relative-to-root :removable="options.removable" :root="root" @update:model-value="prependProjectRootAndUpdateValue($event, lang)" />
    </LocalisedFieldsContainer>
  </section>
</template>

<script>
import { joinPath } from '../../fs';

import field from '../../mixins/field';

import LocalisedFieldsContainer from '../utility/LocalisedFieldsContainer.vue';

export default {
  components: {
    LocalisedFieldsContainer,
  },
  computed: {
    pickerEmptyState() {
      return this.options.filetypes ? 'This directory doesn’t contain any eligible files' : 'This directory is empty';
    },
    firstLocalisedValue() {
      if (this.modelValue && typeof this.modelValue === 'object') {
        const firstVal = Object.values(this.modelValue).find((value) => value);
        if (!firstVal) return null;
        if (Array.isArray(firstVal)) return firstVal.join(', ');
        return firstVal;
      }
      return this.modelValue || null;
    },
    root() {
      if (this.options.root) return joinPath('/projects', this.$route.params.id, this.options.root);
      return joinPath('/projects', this.$route.params.id);
    },
    safeModelValue() {
      if (this.showLocalisedOptions) {
        if (this.modelValue && typeof this.modelValue === 'object' && !Array.isArray(this.modelValue)) return this.modelValue;
        return this.languages.reduce((acc, lang, index) => {
          if (index === 0 && this.modelValue) acc[lang] = this.modelValue;
          else acc[lang] = null;
          return acc;
        }, {});
      }
      if (this.modelValue && typeof this.modelValue === 'object' && !Array.isArray(this.modelValue)) return Object.values(this.modelValue)[0] || null;
      return this.modelValue || null;
    },
  },
  methods: {
    convertLocalisedValue(localised) {
      if (localised) {
        return this.languages.reduce((acc, lang, index) => {
          if (index === 0 && this.modelValue) acc[lang] = this.modelValue;
          else acc[lang] = null;
          return acc;
        }, {});
      }
      return Object.values(this.modelValue)[0] || null;
    },
    prependProjectRootAndUpdateValue(path, lang) {
      if (path === null) {
        this.handleInput(path, lang);
        return;
      }

      const projectRoot = joinPath('/projects', this.$route.params.id);
      if (this.options.root && this.options.root !== projectRoot) this.handleInput(joinPath(this.options.root.replace(projectRoot, ''), path), lang);
      else this.handleInput(path, lang);
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

  .file-picker {
    width: 100%;

    &:not(:last-child) {
      margin-bottom: 2rem;
    }

    &.error {
      &::before {
        border-color: var(--negative);
        opacity: 1;
      }
    }

    &.in-split.dark {
      background-color: var(--bg-tertiary-dark);

      &:hover {
        background-color: var(--bg-tertiary-dark-lightened-5);
      }
    }
  }
</style>
