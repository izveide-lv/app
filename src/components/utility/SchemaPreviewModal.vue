<template>
  <MbModal class="schema-preview-modal" :dark="dark" :padded-body="false" :title="title" :visible="visible" @close="$emit('close')">
    <MbTabs v-if="schema.tabs && schema.tabs.length > 1" v-model="activeTab" :dark="dark" :tabs="cleanTabs" />
    <transition mode="out-in">
      <div v-if="fieldsForTab.length > 0" class="content-wrapper" :key="Math.max(0, activeTab)">
        <MbFieldsEditor v-model="contentForTab" :class="{ 'tabs-visible': schema.tabs && schema.tabs.length > 1 }" compact :dark="dark" :fields="fieldsForTab" :languages="languages" />
        <h3 :class="{ dark }">Output</h3>
        <pre>{{fakeModel}}</pre>
      </div>
      <div v-else-if="schema && schema.fields && schema.fields.length === 0" class="content-wrapper empty">
        <p :class="{ dark }">This Schema is empty. Add some fields to see a preview of how Content Editors will see them.</p>
      </div>
      <div v-else class="content-wrapper empty">
        <p :class="{ dark }">This tab doesn’t have any fields yet. Add some to see a preview of how Content Editors will see them.</p>
        <h3 :class="{ dark }">Output</h3>
        <pre>{{fakeModel}}</pre>
      </div>
    </transition>
    <template #actions>
      <MbButton :dark="dark" type="primary" @click="$emit('close')">Done</MbButton>
    </template>
  </MbModal>
</template>

<script>
import { set as _set } from 'lodash-es';

import assembleUrlFromTemplate from '../../assets/js/assembleUrlFromTemplate';
import generateDefaultContentFromSchema from '../../assets/js/generateDefaultContentFromSchema';
import getContentLanguages from '../../assets/js/getContentLanguages';
import getFieldsByPredicate from '../../assets/js/getFieldsByPredicate';

export default {
  computed: {
    cleanTabs() {
      if (!this.schema.tabs) return [];
      return this.schema.tabs.map((tab) => tab.label);
    },
    contentForTab: {
      get() {
        if (this.activeTab < 0) return this.fakeModel;
        const { groupAs } = this.schema.tabs[this.activeTab];
        if (groupAs) return this.fakeModel[groupAs] || {};
        return this.fakeModel;
      },
      set(v) {
        const { groupAs } = this.schema.tabs[this.activeTab];
        if (groupAs) this.fakeModel[groupAs] = v;
        else this.fakeModel = v;
        this.$nextTick(() => this.findAndSetTemplateIds(this.schema)); // we need a tick for inputs to update because of the internal / external change flags in FieldsEditor
      },
    },
    fieldsForTab() {
      if (!this.schema.fields) return [];
      if (this.activeTab === 0) return this.schema.fields.filter((field) => field.tab === this.cleanTabs[0] || !field.tab); // first tab shows all fields without tab, too
      return this.schema.fields.filter((field) => field.tab === this.cleanTabs[this.activeTab]);
    },
    languages() {
      return getContentLanguages(this.fakeModel, this.schema, this.$store.state.currentProject.languages);
    },
  },
  data() {
    return {
      activeTab: -1,
      cachedTemplateIdFields: null,
      fakeModel: {},
    };
  },
  emits: ['close'],
  methods: {
    findAndSetTemplateIds(schema) {
      if (!this.cachedTemplateIdFields) this.cachedTemplateIdFields = getFieldsByPredicate(schema, (field) => field.type === 'id' && field.options && field.options.type === 'template');
      this.cachedTemplateIdFields.forEach(({ field, contentpath }) => {
        _set(this.fakeModel, contentpath, assembleUrlFromTemplate((field.options && field.options.idTemplate) || '', this.fakeModel, null, true, this.$store.state.currentProject.slugifyOptions || { lowercase: true, decamelize: true, preserveLeadingUnderscore: true }));
      });
    },
  },
  props: {
    dark: Boolean,
    schema: Object,
    title: {
      type: String,
      default: 'Schema Preview',
    },
    visible: Boolean,
  },
  watch: {
    visible(nv) {
      if (!nv) return;
      this.fakeModel = generateDefaultContentFromSchema(this.schema);
      this.cachedTemplateIdFields = null; // clearing cache in case we added a new id field
      this.findAndSetTemplateIds(this.schema);
      if (this.activeTab < 0 && this.schema.tabs && this.schema.tabs.length > 0) this.$nextTick(() => { this.activeTab = 0; }); // so the indicator looks right
    },
  },
};
</script>

<style lang="scss" scoped>
  @use '../../assets/styles/breakpoints' as *;

  .schema-preview-modal {
    .tabs {
      position: sticky;
      top: 0;
      z-index: 2;
    }

    .content-wrapper {
      padding: 0 2rem;

      &.empty {
        > p {
          margin: 4rem;
          color: var(--text-secondary);
          text-align: center;

          &.dark {
            color: var(--text-secondary-dark);
          }
        }
      }

      @media #{$mobile} {
        padding: 1rem;
        padding-top: 0;
      }

      &.v-enter-active,
      &.v-leave-active {
        transition: opacity 200ms ease;

        &.v-enter-from,
        &.v-leave-to {
          opacity: 0;
        }
      }

      .fields-editor {
        margin-top: 1rem;
        width: 100%;

        &.tabs-visible {
          margin-top: 2rem;
        }
      }

      > h3 {
        margin-top: 3rem;
        color: var(--text-secondary);

        &.dark {
          color: var(--text-secondary-dark);
        }
      }

      > pre {
        margin: 0;
      }
    }
  }
</style>
