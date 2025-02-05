<template>
  <div class="internal-link-helper">
    <transition mode="out-in">
      <div v-if="view === 'url'" class="view url" :class="{ dark }" key="url" tabindex="0" @click="activate" @keydown.space.prevent @keyup.space.enter="activate" @mouseenter="showPathTooltip">
        <MbIcon icon="document-link" />
        <span class="label" :class="{ placeholder: !modelValue }">{{modelValue || placeholder}}</span>
        <MbButton v-if="removable" v-show="modelValue" class="remove-button" :dark="dark" icon="cross" ref="removeButton" rounded tooltip="Clear reference" @click="$emit('update:modelValue', null)" />
      </div>
      <div v-else-if="view === 'collections'" class="view collections" key="collections">
        <p>Linkable Collections</p>
        <ul>
          <li v-if="linkableCollections.length === 0" class="empty-state" :class="{ dark }">
            <p>There are no linkable collections in this project yet</p>
          </li>
          <li v-for="collection in linkableCollections" :class="{ dark }" :key="collection.value" tabindex="0" @click="handleCollectionClick(collection.value, collection.type, collection.template, collection.collection)" @keydown.space.prevent @keyup.space.enter="handleCollectionClick(collection.value, collection.type, collection.template)">
            <MbIcon icon="folder" />
            <span class="label">{{collection.label}}</span>
          </li>
          <li :class="{ dark }" tabindex="0" @click="view = 'url'" @down.space.prevent @keyup.space.enter="view = 'url'">
            <MbIcon icon="chevron-left" />
            <span class="label">Back</span>
          </li>
        </ul>
      </div>
      <div v-else-if="view === 'files'" class="view files" :class="{ dark }" key="files">
        <MbFileList :dark="dark" :empty-state="{ noFiles: 'There are no content items in this directory', noFolders: 'There are no folders in this directory', empty: 'There are no content items in this collection' }" file-list-label="Content Items" :filetypes="filetype === 'media' ? null : [filetype]" :folders-first="false" pretty-filenames :root="currentRoot" :sortable="false" @fileclick="handleFileClick" />
        <MbButton :dark="dark" icon="chevron-left" @click="linkableCollections.length === 1 ? view = 'url' : view = 'collections'">Back</MbButton>
      </div>
      <div v-else-if="view === 'loading'" class="view loading" key="loading">
        <MbLoader />
      </div>
    </transition>
  </div>
</template>

<script>
import matter from 'gray-matter';
import fs, { joinPath, pathBasename, pathDirname } from '../../fs';

import assembleUrlFromTemplate from '../../assets/js/assembleUrlFromTemplate';
import generateDefaultFilePathFields from '../../assets/js/generateDefaultFilePathFields';
import prettifyEntityName from '../../assets/js/prettifyEntityName';

export default {
  computed: {
    projectDir() {
      return this.collectionsPath.replace('/.mattrbld/collections', '');
    },
  },
  data() {
    return {
      currentCollection: null,
      currentRoot: '/',
      currentTemplate: null,
      filetype: 'json',
      linkableCollections: [],
      view: 'url',
    };
  },
  emits: ['update:modelValue'],
  methods: {
    async activate(e) {
      if (this.removable && (e.target === this.$refs.removeButton.$el || this.$refs.removeButton.$el.contains(e.target))) return;
      this.view = 'loading';
      await this.loadCollections();
      if (this.linkableCollections.length === 1) this.handleCollectionClick(this.linkableCollections[0].value, this.linkableCollections[0].type, this.linkableCollections[0].template, this.linkableCollections[0].collection);
      else this.view = 'collections';
    },
    handleCollectionClick(dir, type, template, collection) {
      this.currentRoot = joinPath(this.projectDir, dir);
      this.currentCollection = collection;
      this.currentTemplate = null; // resetting the template here is needed since an old value would break line 74

      if (template && typeof template === 'object') {
        if (this.lang) this.currentTemplate = template[this.lang];
        if (!this.currentTemplate) this.currentTemplate = Object.values(template).find((value) => value); // if no lang is passed, or template[lang] is falsey, pick the first non-falsey-one
      } else this.currentTemplate = template;

      this.filetype = type;
      this.view = 'files';
    },
    async handleFileClick(path) {
      const pathWithoutExtension = path.substring(0, path.lastIndexOf('.')); // we know there’s a .something at the end that we want to strip off
      let newUrl;
      if (this.useFilePath || (!this.currentTemplate && !this.urlTemplate)) {
        if (this.fullPath) newUrl = path.replace(this.projectDir, '');
        else {
          const fileRoot = pathDirname(this.currentRoot);
          newUrl = pathWithoutExtension.replace(fileRoot, '');
          if (typeof this.urlSuffix === 'string') newUrl = `${newUrl}${this.urlSuffix}`;
        }
      } else {
        try {
          const defaultFields = generateDefaultFilePathFields(path, this.projectDir, this.currentRoot);
          let fields;
          if (this.filetype === 'json') fields = { ...defaultFields, ...JSON.parse(await fs.readFile(path, 'utf8')) };
          else if (this.filetype === 'md') fields = { ...defaultFields, ...matter(await fs.readFile(path, 'utf8')).data };
          else fields = { ...defaultFields };

          const urlTemplate = this.urlTemplate || this.currentTemplate; // if we were passed a urlTemplate, use that, otherwise fall back to the collection’s urlTemplate

          newUrl = assembleUrlFromTemplate(urlTemplate, fields, this.lang, this.slugify, this.$store.state.currentProject.slugifyOptions || { lowercase: true, decamelize: true, preserveLeadingUnderscore: true });
        } catch (err) {
          if (err.name === 'SyntaxError') {
            this.$store.commit('addToast', { message: 'The file you selected is not a valid JSON file', type: 'error' });
            return;
          }
          this.$store.commit('addToast', { message: `Something went wrong while reading the selected file: ${err.message}`, type: 'error' });
          return;
        }
      }
      this.$emit('update:modelValue', newUrl.replace(/\\\./g, '.'), this.currentCollection); // we’re replacing escaped dots here since that’s the only way to separate a dot from a property-path
      this.view = 'url';
    },
    async loadCollections() {
      if (this.linkableCollections.length > 0) return; // we don’t need to load them again
      try {
        let collectionFiles;
        if (!this.limitTo || this.limitTo.length === 0) collectionFiles = (await fs.readdir(this.collectionsPath)).filter((path) => path.endsWith('.json'));
        else collectionFiles = this.limitTo.map((path) => pathBasename(path));
        const collectionStrings = await Promise.all(collectionFiles.map((file) => fs.readFile(joinPath(this.collectionsPath, file), 'utf8')));
        const collections = collectionStrings.map((collection) => collection && JSON.parse(collection)).filter((collection) => typeof collection !== 'undefined');
        this.linkableCollections = collections.reduce((acc, collection, index) => {
          if ((this.allowUnlinkable || (this.limitTo && this.limitTo.length > 0) || collection.linkable) && collection.dir) {
            acc.push({
              collection: collectionFiles[index],
              label: prettifyEntityName(collectionFiles[index]),
              template: collection.urlTemplate,
              type: collection.type,
              value: collection.dir,
            });
          }
          return acc;
        }, []);
      } catch (err) {
        this.$store.commit('addToast', { message: `Something went wrong while fetching all linkable collections: ${err.message}`, type: 'error' });
      }
    },
    showPathTooltip(e) {
      if (!this.modelValue) return;

      const tooltip = {
        message: this.modelValue,
        target: e.currentTarget,
      };
      this.$store.commit('setTooltip', tooltip);
    },
  },
  props: {
    allowUnlinkable: Boolean,
    collectionsPath: {
      type: String,
      required: true,
    },
    dark: Boolean,
    fullPath: Boolean,
    lang: String,
    limitTo: Array,
    modelValue: String,
    placeholder: {
      type: String,
      default: 'Select a content item…',
    },
    removable: Boolean,
    slugify: {
      type: Boolean,
      default: true,
    },
    urlSuffix: String,
    urlTemplate: String,
    useFilePath: Boolean,
  },
  watch: {
    limitTo() {
      this.linkableCollections = [];
      this.loadCollections();
    },
  },
};
</script>

<style lang="scss" scoped>
  @use '../../assets/styles/breakpoints' as *;

  .internal-link-helper {
    .view {
      &.loading {
        padding: 2rem 0;
      }

      &.collections {
        p {
          font-weight: bold;
        }

        ul {
          margin: 0;
          list-style: none;

          > li:not(:last-child) {
            margin-bottom: 0.5rem;
          }
        }
      }

      &.collections ul > li:not(.empty-state),
      &.url {
        position: relative;
        border: none;
        background-color: var(--bg-secondary);
        color: inherit;
        border-radius: var(--radius-m);
        padding: 1rem;
        padding-right: 1.5rem;
        display: flex;
        align-items: center;
        cursor: pointer;
        transition: background-color 200ms ease;
        user-select: none;
        text-align: left;
        white-space: nowrap;
        max-width: 100%;
        overflow: hidden;

        &:hover {
          background-color: var(--bg-tertiary);
        }

        &:focus {
          background-color: var(--bg-secondary);

          &::before {
            opacity: 1;
          }
        }

        &:active {
          transform: translateY(2px);
        }

        &.dark {
          background-color: var(--bg-secondary-dark);

          &:hover {
            background-color: var(--bg-tertiary-dark);
          }

          &:focus {
            background-color: var(--bg-secondary-dark);
          }

          .label.placeholder {
            color: var(--text-secondary-dark);
          }
        }

        &::before {
          content: '';
          position: absolute;
          top: 0px;
          left: 0px;
          right: 0px;
          bottom: 0px;
          border: 0.125rem solid var(--accent);
          opacity: 0;
          border-radius: var(--radius-m);
          transition: opacity 200ms ease;
        }

        .label {
          margin-left: 0.75rem;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-right: auto;

          &.placeholder {
            color: var(--text-secondary);
          }
        }

        .icon {
          flex-shrink: 0;
        }

        .remove-button {
          margin: -0.5rem;
          margin-left: 0.5rem;
          margin-right: -1rem;
          padding: rem(8.5);
        }
      }

      &.collections ul > li {
        &.empty-state {
          text-align: center;
          color: var(--text-secondary);

          &.dark {
            color: var(--text-secondary-dark);
          }

          p {
            font-weight: normal;
            margin: 2rem 0;
          }
        }

        &:last-child {
          background-color: transparent;
          border: 0.0625rem solid var(--accent);
          padding: 1rem 2.5rem 1rem 1rem;
          height: rem(52);
          margin-top: 1rem;

          &.dark {
            &:hover {
              background-color: var(--bg-tertiary-dark);
            }

            &:active {
              background-color: var(--bg-secondary-dark);
            }
          }

          &:hover {
            background-color: var(--bg-tertiary);
          }

          &:active {
            background-color: var(--bg-secondary);
          }

          &::before {
            top: -1px;
            left: -1px;
            right: -1px;
            bottom: -1px;
          }

          .label {
            flex-grow: 1;
            text-align: center;
          }
        }
      }

      &.files {
        .file-list:deep(header .actions) {
          .input {
            flex-grow: 1;
            max-width: none;
            margin-right: 0;

            @media #{$mobile} {
              margin-right: 0;
            }
          }

          .button {
            margin-left: 0;
          }
        }

        .button {
          width: 100%;
          margin-top: 1rem;
        }
      }

      &.v-enter-active,
      &.v-leave-active {
        transition: opacity 200ms ease;

        &.v-enter-from,
        &.v-leave-to {
          opacity: 0;
        }
      }
    }
  }
</style>
