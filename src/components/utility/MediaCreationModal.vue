<template>
  <MbModal class="media-creation-modal" :dark="dark" :permanent="type === 'uploading'" :title="title" :visible="visible" @after-close="resetEntityCreation" @close="$emit('close')">
    <MbSegmentedSelector v-if="permissions.has('everything') || (permissions.has('upload') && permissions.has('createFolder'))" :dark="dark" :model-value="type" :options="[{ label: 'Upload', value: 'upload' }, { label: 'Folder', value: 'directory' }]" @update:modelValue="$emit('update-type', $event)" />
    <transition mode="out-in">
      <div v-if="type === 'directory'" class="input-group">
        <MbInput v-model="newFolderName" :dark="dark" :error="newFolderError" icon="folder-add" label="Name" :max-len="255" ref="nameInput" @keyup.ctrl.enter="createFolder" @update:model-value="validateNewFolderName" />
        <p class="name-hint" :class="{ dark, hidden: !newFolderName || newFolderError }">Will be created as: <strong>{{slugifiedNewFolderName}}</strong></p>
      </div>
      <div v-else-if="type === 'uploading'" class="uploading">
        <MbLoader />
      </div>
      <div v-else class="dropzone" :class="{ dark, 'drag-active': dragActive }" @dragenter.prevent="dragActive = true" @dragover.prevent @dragleave="dragActive = false" @drop="handleDrop">
        <p v-if="!singleFile" :class="{ dark }">Drop media files here to upload them, or select some by clicking the button below</p>
        <p v-else :class="{ dark }">Drop a media file here to upload it, or select one by clicking the button below</p>
        <MbButton :dark="dark" icon="upload" @click="selectFiles">Select file{{singleFile ? '' : 's'}}</MbButton>
        <input :accept="acceptedTypes" :multiple="!singleFile" type="file" ref="modalFileInput" @change="handleFileInput">
      </div>
    </transition>
    <template #actions>
      <MbButton :dark="dark" :disabled="type === 'uploading'" @click="$emit('close')">Cancel</MbButton>
      <transition>
        <MbButton v-if="type === 'directory'" :dark="dark" :disabled="!newFolderName || Boolean(newFolderError)" type="primary" @click="createFolder">Create</MbButton>
      </transition>
    </template>
  </MbModal>
</template>

<script>
import slugify from '@sindresorhus/slugify';
import { debounce } from 'lodash-es';
import fs, { joinPath } from '../../fs';

import slugifyFileName from '../../assets/js/slugifyFileName';
import { imageRegExp } from '../../data/regExps';
import getFilenameAndExtension from '../../assets/js/getFilenameAndExtension';

export default {
  computed: {
    acceptedTypes() {
      if (!this.allowedTypes || !this.allowedTypes.length) return null;
      return this.allowedTypes.map((type) => {
        if (!String(type).startsWith('.')) return `.${type}`;
        return type;
      }).join(',');
    },
    mediaSettings() {
      return this.$store.state.currentProject.media;
    },
    slugifiedNewFolderName() {
      return slugify(this.newFolderName, this.$store.state.currentProject.slugifyOptions || { lowercase: false, decamelize: false, preserveLeadingUnderscore: true });
    },
  },
  data() {
    return {
      dragActive: false,
      newFolderError: '',
      newFolderName: '',
    };
  },
  emits: ['close', 'entity-created', 'update-type'],
  methods: {
    async createFolder() {
      await this.validateNewFolderName();

      if (this.newFolderError) return;

      const { slugifiedNewFolderName: name, currentPath: path } = this;

      try {
        const folderPath = joinPath(path, name);
        await fs.mkdir(folderPath);
        await fs.writeFile(joinPath(folderPath, '.gitkeep'), '', 'utf8'); // also add a .gitkeep file to the newly added folder so it is kept during sync ops
        this.$store.commit('addLocallyChangedFile', joinPath(folderPath, '.gitkeep'));
        await this.$store.dispatch('saveAppData');
        this.$emit('entity-created', [folderPath], 'directory'); // putting it in an array so it’s consistent with file creation
        this.$emit('close');
      } catch (err) {
        this.$store.commit('addToast', { message: `Something went wrong while creating the directory: ${err.message}`, type: 'error' });
      }
    },
    handleFileInput(e) {
      if (this.singleFile) this.saveFiles([e.currentTarget.files[0]]);
      else this.saveFiles([...e.currentTarget.files]);
      e.currentTarget.value = '';
    },
    handleDrop(e) {
      e.preventDefault();
      e.stopPropagation();
      let files;

      if (this.singleFile) {
        if (e.dataTransfer.files.length > 1) this.$store.commit('addToast', { message: 'Uploading multiple files at once is not supported here. Only the first file will be used.', type: 'warning' });
        files = [e.dataTransfer.files[0]];
      } else files = [...e.dataTransfer.files];

      this.saveFiles(files);
    },
    resetEntityCreation() {
      this.dragActive = false;
      this.newFolderError = '';
      this.newFolderName = '';
      if (this.permissions.has('everything') || this.permissions.has('upload')) this.$emit('update-type', 'upload');
      else this.$emit('update-type', 'directory');
    },
    async saveFiles(files) {
      this.$emit('update-type', 'uploading');
      try {
        const arrayBuffers = await Promise.allSettled(files.map((file) => file.arrayBuffer()));
        const existingFiles = await fs.readdir(this.currentPath);
        const writePromises = [];
        const filePaths = [];
        const maxSize = this.maxSize || this.mediaSettings.maxSize;

        files.forEach((file, index) => {
          const slugifiedFileName = slugifyFileName(file.name, this.$store.state.currentProject.slugifyOptions || { lowercase: false, decamelize: false, preserveLeadingUnderscore: true });
          let valid = true;
          if (this.onlyImages && !imageRegExp.test(file.name)) {
            this.$store.commit('addToast', { message: `The file “${slugifiedFileName}” was not uploaded because it is not an image`, type: 'warning' });
            valid = false;
          } else if (this.allowedTypes && this.allowedTypes.length) {
            const { extension } = getFilenameAndExtension(file.name);

            if (!this.allowedTypes.includes(extension)) {
              this.$store.commit('addToast', { message: `The file “${slugifiedFileName}” was not uploaded because it is not of one of the allowed types: ${this.allowedTypes.join(', ')}`, type: 'warning' });
              valid = false;
            }
          }

          if (valid && maxSize) {
            const sizeInMb = file.size / 1024 / 1024;
            if (sizeInMb > maxSize) {
              this.$store.commit('addToast', { message: `The file “${slugifiedFileName}” was not uploaded because it is too large (maximum ${maxSize} MB)`, type: 'warning' });
              valid = false;
            }
          }

          if (valid && !arrayBuffers[index].value) {
            this.$store.commit('addToast', { message: `“${slugifiedFileName}” was not uploaded because it is a folder`, type: 'warning' });
            valid = false;
          }

          if (valid && existingFiles.includes(slugifiedFileName)) {
            this.$store.commit('addToast', { message: `The file “${slugifiedFileName}” was not uploaded because it already exists in this folder`, type: 'warning' });
            valid = false;
          }

          if (valid) {
            const filePath = joinPath(this.currentPath, slugifiedFileName);
            writePromises.push(fs.writeFile(filePath, arrayBuffers[index].value));
            filePaths.push(filePath);
          }
        });

        await Promise.all(writePromises);

        filePaths.forEach((path) => this.$store.commit('addLocallyChangedFile', path));
        await this.$store.dispatch('saveAppData');
        if (writePromises.length > 0) {
          this.$store.commit('addToast', {
            message: writePromises.length === 1 ? `${slugifyFileName(files[0].name, this.$store.state.currentProject.slugifyOptions || { lowercase: false, decamelize: false, preserveLeadingUnderscore: true })} was uploaded successfully` : `${writePromises.length} files were uploaded successfully`,
            timeout: 2000,
            type: 'positive',
          });
        }
        this.$emit('entity-created', filePaths, 'files');
      } catch (err) {
        this.$store.commit('addToast', { message: `Something went wrong while saving files: ${err.message}`, type: 'error' });
      }

      this.dragActive = false;
      this.$emit('close');
    },
    selectFiles() {
      this.$refs.modalFileInput.click();
    },
    validateNewFolderName: debounce(async function () { // eslint-disable-line func-names
      let existingEntities = [];
      try {
        existingEntities = await fs.readdir(this.currentPath);
      } catch (err) {
        // don’t do anything, it’ll fail and be handled when trying to create
      }

      if (!this.slugifiedNewFolderName) this.newFolderError = 'A name is required';
      else if (this.slugifiedNewFolderName.length > 255) this.newFolderError = 'Name is too long';
      else if (existingEntities.length > 0 && existingEntities.includes(this.slugifiedNewFolderName)) this.newFolderError = 'A folder with this name already exists';
      else this.newFolderError = '';
    }, 250, { leading: true }),
  },
  props: {
    allowedTypes: Array,
    currentPath: String,
    dark: Boolean,
    maxSize: Number,
    onlyImages: Boolean,
    permissions: Set,
    singleFile: Boolean,
    title: String,
    type: String,
    visible: Boolean,
  },
};
</script>

<style lang="scss" scoped>
  .media-creation-modal {
    .segmented-selector {
      margin-bottom: 2rem;
    }

    .input-group,
    .dropzone,
    .button,
    .uploading {
      &.v-enter-active,
      &.v-leave-active {
        transition: opacity 200ms ease;

        &.v-enter-from,
        &.v-leave-to {
          opacity: 0;
        }
      }
    }

    .input-group {
      &:first-child {
        margin-top: 1.5rem;
      }

      .input {
        width: 100%;
        margin-top: 0;
        margin-bottom: 0.5rem;
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

    .dropzone {
      border: 0.125rem dashed var(--accent-secondary);
      padding: 2rem;
      text-align: center;
      border-radius: var(--radius-l);

      &.drag-active {
        background-color: var(--bg-secondary);

        &.dark {
          background-color: var(--bg-secondary-dark);
        }

        .button {
          visibility: hidden;
        }
      }

      p {
        color: var(--text-secondary);
        margin-top: 0;
        margin-bottom: 2rem;
        pointer-events: none;

        &.dark {
          color: var(--text-secondary-dark);
        }
      }

      input[type=file] {
        display: none;
      }
    }

    .uploading {
      padding: 2rem;
    }
  }
</style>
