<template>
  <MbModal class="entity-rename-modal" :dark="dark" slim :title="title" :visible="visible" @after-open="focusInput" @after-close="reInitialize" @close="$emit('close')">
    <div class="input-group">
      <MbInput v-model="name" :class="{ 'no-extension': !fileExtension }" :dark="dark" :error="nameError" icon="text-input" label="Name" :max-len="fileExtension ? 255 - fileExtension.length + 1 : 255" ref="nameInput" @keyup.ctrl.enter="renameEntity" @update:model-value="validateName" />
      <span v-if="fileExtension" :class="{ dark }">.{{fileExtension}}</span>
    </div>
    <p class="name-hint" :class="{ dark, hidden: !name || nameError }">Will be renamed to: <strong>{{fullName}}</strong></p>
    <template #actions>
      <MbButton :dark="dark" @click="$emit('close')">Cancel</MbButton>
      <MbButton :dark="dark" :disabled="!name || Boolean(nameError)" type="primary" @click="renameEntity">Rename</MbButton>
    </template>
  </MbModal>
</template>

<script>
import slugify from '@sindresorhus/slugify';
import { debounce } from 'lodash-es';

import fs, { pathBasename, pathDirname, joinPath } from '../../fs';

export default {
  computed: {
    fileExtension() {
      if (!this.oldPath) return '';
      const filename = pathBasename(this.oldPath);
      return filename.slice((Math.max(0, filename.lastIndexOf('.')) || Infinity) + 1); // based on https://stackoverflow.com/questions/190852/how-can-i-get-file-extensions-with-javascript/12900504#12900504
    },
    fullName() {
      if (!this.name) return '';
      if (!this.fileExtension) return slugify(this.name, this.$store.state.currentProject.slugifyOptions || { lowercase: false, decamelize: false, preserveLeadingUnderscore: true });
      return `${slugify(this.name, this.$store.state.currentProject.slugifyOptions || { lowercase: false, decamelize: false, preserveLeadingUnderscore: true })}.${this.fileExtension}`;
    },
  },
  created() {
    this.reInitialize();
  },
  data() {
    return {
      name: '',
      nameError: '',
    };
  },
  emits: ['close', 'entity-renamed'],
  methods: {
    focusInput() {
      this.$refs.nameInput.focus();
      this.$refs.nameInput.$refs.input.select();
    },
    reInitialize() {
      this.name = '';
      this.nameError = '';
    },
    async renameEntity() {
      await this.validateName();

      if (this.nameError) return;

      const { fullName, oldPath } = this;
      const newPath = joinPath(pathDirname(oldPath), fullName);

      try {
        await fs.rename(oldPath, newPath);
        this.$emit('close');
        this.$emit('entity-renamed', { oldPath, newPath });
      } catch (err) {
        this.$store.commit('addToast', { message: `Something went wrong while renaming the file: ${err.message}`, type: 'error' });
      }
    },
    validateName: debounce(async function () { // eslint-disable-line func-names
      let existingEntities = [];
      try {
        existingEntities = await fs.readdir(pathDirname(this.oldPath));
      } catch (err) {
        // don’t do anything, it’ll fail and be handled when trying to rename
      }

      if (!slugify(this.name, this.$store.state.currentProject.slugifyOptions || { lowercase: false, decamelize: false, preserveLeadingUnderscore: true })) this.nameError = 'A name is required';
      else if (this.fullName.length > 255) this.nameError = 'Name is too long';
      else if (existingEntities.length > 0 && existingEntities.includes(this.fullName)) this.nameError = 'An entity with this name already exists';
      else if (this.fullName === pathBasename(this.oldPath)) this.nameError = 'The entity is already called like this';
      else this.nameError = '';
    }, 250, { leading: true }),
  },
  props: {
    dark: Boolean,
    oldPath: String,
    title: {
      type: String,
      default: 'Rename…',
    },
    visible: Boolean,
  },
  watch: {
    oldPath(nv) {
      if (nv) {
        const filename = pathBasename(nv);
        this.name = filename.substring(0, Math.max(0, filename.lastIndexOf('.')) || Infinity);
      }
    },
  },
};
</script>

<style lang="scss" scoped>
  .entity-rename-modal {
    .input-group {
      white-space: nowrap;
      display: flex;
      align-items: stretch;
      margin-bottom: 0.5rem;

      &:first-child {
        margin-top: 1.5rem;
      }

      .input {
        border: none;
        width: 100%;
        margin-top: 0;
        border-top-right-radius: 0;
        border-bottom-right-radius: 0;

        &.no-extension {
          border-top-right-radius: var(--radius-m);
          border-bottom-right-radius: var(--radius-m);
        }
      }

      span {
        display: inline-block;
        padding: 1rem;
        background-color: var(--bg-secondary);
        color: var(--text-secondary);
        border-top-right-radius: var(--radius-m);
        border-bottom-right-radius: var(--radius-m);
        margin-left: 0.0625rem;

        &.dark {
          background-color: var(--bg-secondary-dark);
          color: var(--text-secondary-dark);
        }
      }
    }

    .name-hint {
      color: var(--text-secondary);
      margin: 0;
      font-size: 0.875rem;
      transition: opacity 200ms ease;

      &.dark {
        color: var(--text-secondary-dark);
      }

      &.hidden {
        opacity: 0;
      }
    }
  }
</style>
