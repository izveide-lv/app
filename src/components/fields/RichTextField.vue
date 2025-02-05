<template>
  <section class="rich-text field" :class="{ dark, localised: showLocalisedOptions && languages.length > 1 }">
    <template v-if="!showLocalisedOptions">
      <MbEditor
        :allow-raw="options.allowRaw"
        :class="{ 'in-split': inSplit }"
        :code-langs="options.codeLangs"
        :dark="dark"
        :error="error && String(error)"
        :format-options="formatOptions"
        :formats="{ block: blockFormats, inline: inlineFormats }"
        :input-rule-options="inputRuleOptions"
        :label="label"
        :link-options="linkOptions"
        :max-len="(validation && validation.max) || null"
        :model-value="safeModelValue"
        :output-format="options.outputFormat"
        @update:model-value="handleInput"
      />
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
      <MbEditor
        :allow-raw="options.allowRaw"
        :class="{ 'in-split': renderedInSplit }"
        :code-langs="options.codeLangs"
        :dark="dark"
        :error="error instanceof Map ? error.get(lang) : ''"
        :format-options="formatOptions"
        :formats="{ block: blockFormats, inline: inlineFormats }"
        :input-rule-options="{ ...inputRuleOptions, autoquotes: autoquotesForLang(lang) }"
        :label="languages.length > 1 ? lang : label"
        :lang="lang"
        :link-options="linkOptions"
        :max-len="(validation && validation.max) || null"
        :model-value="safeModelValue[lang]"
        :output-format="options.outputFormat"
        @update:model-value="handleInput($event, lang)"
      />
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
    autoquotes() {
      const { autoquotes } = this.$store.state.currentProject;
      if (autoquotes && typeof autoquotes === 'object') return Object.values(autoquotes).find((value) => value);
      return '“”‘’';
    },
    blockFormats() {
      if (!this.options.blockFormats || !Array.isArray(this.options.blockFormats) || this.options.blockFormats.length === 0) return false;
      return this.options.blockFormats;
    },
    formatOptions() {
      return {
        minHeading: this.options.minHeading || 1,
        maxHeading: this.options.maxHeading || 6,
        allowQuoteFooters: this.options.formatOptions ? this.options.formatOptions.includes('allowQuoteFooters') : true,
        allowNestedLists: this.options.formatOptions ? this.options.formatOptions.includes('allowNestedLists') : true,
        allowImageCaptions: this.options.formatOptions ? this.options.formatOptions.includes('allowImageCaptions') : true,
      };
    },
    inlineFormats() {
      if (!this.options.inlineFormats || !Array.isArray(this.options.inlineFormats)) return ['em', 'link', 'strong']; // return sensible default inline formats
      return this.options.inlineFormats;
    },
    inputRuleOptions() {
      if (!this.options.inputRuleOptions) {
        return {
          autoquotes: this.autoquotes,
          dashes: true,
          ellipsis: true,
          minHeading: this.options.minHeading || 1,
          maxHeading: this.options.maxHeading || 6,
          noDoubleCaps: true,
          noDoubleSpace: true,
        };
      }
      const inputRuleOptions = {
        autoquotes: this.options.inputRuleOptions.includes('autoquotes') && this.autoquotes,
        dashes: this.options.inputRuleOptions.includes('dashes'),
        ellipsis: this.options.inputRuleOptions.includes('ellipsis'),
        maxHeading: this.options.maxHeading || 6,
        minHeading: this.options.minHeading || 1,
        noDoubleCaps: this.options.inputRuleOptions.includes('noDoubleCaps'),
        noDoubleSpace: this.options.inputRuleOptions.includes('noDoubleSpace'),
      };
      return inputRuleOptions;
    },
    linkOptions() {
      if (!this.options.linkOptions || !Array.isArray(this.options.linkOptions) || this.options.linkOptions.length === 0) {
        return {
          collectionsPath: this.$store.state.currentProject.id ? joinPath('/projects', this.$store.state.currentProject.id, '.mattrbld', 'collections') : null,
          forceBlankTarget: false,
          forceNofollow: false,
          only: null,
          urlSuffix: null,
          urlTemplate: null,
          useFilePath: false,
        };
      }

      let only;
      if (this.options.linkOptions.includes('allowExternal') && this.options.linkOptions.includes('allowInternal')) only = null;
      else if (this.options.linkOptions.includes('allowInternal')) only = 'internal';
      else if (this.options.linkOptions.includes('allowExternal')) only = 'external';
      else only = null;

      return {
        collectionsPath: this.$store.state.currentProject.id ? joinPath('/projects', this.$store.state.currentProject.id, '.mattrbld', 'collections') : null,
        forceBlankTarget: this.options.linkOptions.includes('forceBlankTarget'),
        forceNofollow: this.options.linkOptions.includes('forceNofollow'),
        only,
        urlSuffix: this.options.urlSuffix || null,
        urlTemplate: this.options.urlTemplate || null,
        useFilePath: this.options.linkOptions.includes('useFilePath'),
      };
    },
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
    autoquotesForLang(lang) {
      if (this.options.inputRuleOptions && !this.options.inputRuleOptions.includes('autoquotes')) return false;
      const { autoquotes } = this.$store.state.currentProject;
      if (autoquotes && typeof autoquotes === 'object') return autoquotes[lang] || '“”‘’';
      return '“”‘’';
    },
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
  .rich-text.field {
    .editor:deep(.toolbar) {
      margin-top: 0;
      top: 0;
    }
  }

  .editor:not(:last-child) {
    margin-bottom: 2rem;
  }

  .in-split.dark {
    &.editor:deep(.content-wrapper) {
      background-color: var(--bg-tertiary-dark);

      &:not(:focus-within) {
        box-shadow: inset 0 0.0625rem 0 0 var(--bg-tertiary-dark-lightened-10);
      }

      code {
        background-color: var(--bg-tertiary-dark-lightened-10);
      }

      pre {
        background-color: var(--bg-secondary-dark);

        code {
          background-color: initial;
        }
      }
    }
  }
</style>
