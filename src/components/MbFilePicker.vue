<template>
  <div class="file-picker" :class="{ dark }" tabindex="0" @click="activate" @keydown.space.prevent @keyup.space.enter="activate" @mouseenter="showPathTooltip">
    <MbIcon :icon="mode === 'folder' ? 'folder' : 'document'" />
    <span class="label" :class="{ placeholder: !modelValue }">{{label}}</span>
    <MbButton v-if="removable" v-show="modelValue" :dark="dark" icon="cross" ref="removeButton" rounded tooltip="Clear path" @click="$emit('update:modelValue', null)" />
    <MbPopover center-x class="picker-popover" :dark="dark" no-content-padding ref="popover" :visible="showPicker" :x="popover.x" :y="popover.y" @close="deactivate">
      <div class="content-wrapper">
        <MbFileList :dark="dark" :empty-state="emptyState" :filetypes="filetypes" :filterable="false" :folders-first="mode === 'file' && foldersFirst" :folders-only="mode === 'folder'" :pretty-filenames="prettyFilenames" ref="fileList" :root="root" :show-hidden="showHidden" :sortable="false" :style="{ width: `${listWidth}rem` }" @fileclick="pickEntity" @path-change="currentPath = $event" />
        <MbButton v-if="mode === 'folder'" class="create-button" :dark="dark" icon="plus" type="positive" @click="handleFolderCreation">Add Folder</MbButton>
        <input v-if="showUpload" :accept="allowedTypes" ref="fileInput" type="file" @change="uploadFile">
      </div>
      <template #footer>
        <MbButton :dark="dark" @click="deactivate">Cancel</MbButton>
        <MbButton v-if="showUpload" :dark="dark" icon="upload" :loading="uploading" type="positive" @click="handleUpload">Upload File</MbButton>
        <MbButton v-if="mode === 'folder'" :dark="dark" type="primary" @click="pickEntity($refs.fileList.currentPath)">Pick this folder</MbButton>
      </template>
    </MbPopover>
    <EntityCreationModal :dark="dark" only="directory" :path="currentPath" title="Add folder" :visible="showEntityCreationModal" @after-close="activate" @close="showEntityCreationModal = false" @entity-created="handleEntityCreated" />
  </div>
</template>

<script>
import fs, { joinPath } from '../fs';

import slugifyFileName from '../assets/js/slugifyFileName';

import EntityCreationModal from './utility/EntityCreationModal.vue';

export default {
  beforeUnmount() {
    window.removeEventListener('scroll', this.deactivate, { capture: true, passive: true });
  },
  components: {
    EntityCreationModal,
  },
  computed: {
    allowedTypes() {
      if (!this.filetypes) return null;
      return this.filetypes.map((type) => {
        if (!String(type).startsWith('.')) return `.${type}`;
        return type;
      }).join(',');
    },
    label() {
      if (this.modelValue) return this.modelValue;
      if (this.placeholder) return this.placeholder;
      return `Pick a ${this.mode}…`;
    },
    showUpload() {
      return this.mode === 'file' && this.allowUpload;
    },
  },
  data() {
    return {
      currentPath: null,
      listWidth: 20,
      popover: {
        x: 0,
        y: 0,
      },
      showEntityCreationModal: false,
      showPicker: false,
      uploading: false,
    };
  },
  emits: ['update:modelValue'],
  methods: {
    activate(e) {
      if (e && this.removable && (e.target === this.$refs.removeButton.$el || this.$refs.removeButton.$el.contains(e.target))) return;
      const rect = this.$el.getBoundingClientRect();
      const remBase = Number.parseInt(window.getComputedStyle(document.documentElement).fontSize, 10);
      this.listWidth = Math.max(20, rect.width / remBase);
      this.popover.x = rect.left + rect.width / 2;
      this.popover.y = rect.bottom + 0.5 * remBase;
      window.addEventListener('scroll', this.deactivate, { capture: true, passive: true });
      this.showPicker = true;
    },
    deactivate(e) {
      if (e && e.type === 'scroll' && this.$refs.popover.$refs.el.contains(e.target)) return;
      window.removeEventListener('scroll', this.deactivate, { capture: true, passive: true });
      this.showPicker = false;
      this.$el.focus();
    },
    handleEntityCreated(name) {
      this.$refs.fileList.openFolder(name);
    },
    handleFolderCreation() {
      this.deactivate();
      this.showEntityCreationModal = true;
    },
    handleUpload() {
      this.$refs.fileInput.click();
    },
    pickEntity(path) {
      this.$emit('update:modelValue', this.relativeToRoot && this.root !== '/' ? path.replace(this.root, '') : path);
      this.showPicker = false;
    },
    async uploadFile(e) {
      const file = e.currentTarget.files[0];
      e.currentTarget.value = '';

      if (this.maxSize) {
        const sizeInMb = file.size / 1024 / 1024;
        if (sizeInMb > this.maxSize) {
          this.$store.commit('addToast', { message: `“${file.name}” was not uploaded because it is too large (maximum ${this.maxSize} MB)`, type: 'warning' });
          return;
        }
      }

      this.uploading = true;

      try {
        const arrayBuffer = await file.arrayBuffer();
        const existingFiles = await fs.readdir(this.currentPath);
        const filenameWithExtension = slugifyFileName(file.name, this.$store.state.currentProject.slugifyOptions || { lowercase: false, decamelize: false, preserveLeadingUnderscore: true });
        const path = joinPath(this.currentPath, filenameWithExtension);

        if (!arrayBuffer) {
          this.$store.commit('addToast', { message: `“${filenameWithExtension}” was not uploaded because it is a folder`, type: 'warning' });
          this.uploading = false;
          return;
        }

        if (existingFiles.includes(filenameWithExtension)) {
          this.$store.commit('addToast', { message: `The file “${filenameWithExtension}” was not uploaded because it already exists in this folder`, type: 'warning' });
          this.uploading = false;
          return;
        }

        await fs.writeFile(path, arrayBuffer);
        this.$refs.fileList.refresh();

        this.$store.commit('addLocallyChangedFile', path);
        await this.$store.dispatch('saveAppData');
        this.pickEntity(path);
      } catch (err) {
        this.$store.commit('addToast', { message: `Something went wrong while saving the file: ${err.message}`, type: 'error' });
      }

      this.uploading = false;
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
    allowUpload: Boolean,
    dark: Boolean,
    emptyState: [String, Object],
    filetypes: Array,
    foldersFirst: {
      type: Boolean,
      default: true,
    },
    maxSize: Number,
    mode: {
      type: String,
      default: 'folder',
      validator: (v) => ['file', 'folder'].includes(v),
    },
    modelValue: String,
    placeholder: String,
    prettyFilenames: Boolean,
    relativeToRoot: Boolean,
    removable: Boolean,
    root: {
      type: String,
      default: '/',
    },
    showHidden: Boolean,
  },
  watch: {
    filetypes(nv) {
      if (nv) this.$refs.fileList.refresh();
    },
  },
};
</script>

<style lang="scss" scoped>
  @use '../assets/styles/breakpoints' as *;

  .file-picker {
    position: relative;
    border: none;
    background-color: var(--bg-secondary);
    color: inherit;
    border-radius: var(--radius-m);
    padding: 1rem;
    padding-right: 1.5rem;
    display: inline-flex;
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
      border-radius: inherit;
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

    .button.icon {
      margin: -0.5rem;
      margin-left: 0.5rem;
      margin-right: -1rem;
      padding: rem(8.5);
    }
  }

  .picker-popover {
    .content-wrapper {
      padding: 0 1rem;
      max-height: 30rem;

      &::after {
        content: '';
        height: 1rem;
        display: block;
      }

      .create-button {
        width: 100%;
        margin-top: 1rem;
      }

      .file-list {
        width: 20rem;
        max-width: 100%;

        @media #{$mobile} {
          height: auto;
        }

        &.dark {
          &:deep(> header) {
            background-color: var(--bg-secondary-dark);
          }

          &:deep(.file),
          &:deep(.folder) {
            background-color: var(--bg-tertiary-dark);

            &:active {
              background-color: var(--bg-dark);
            }
          }
        }

        &:deep(> header) {
          position: sticky;
          top: 0;
          z-index: 1;
          background-color: var(--bg);
          padding: 1rem;
          margin-bottom: 0;
          margin-left: -1rem;
          margin-right: -1rem;
        }

        &:deep(.empty-state) {
          text-align: center;
          margin: 2rem 0;
        }

        &:deep(.folder-scroller) {
          margin-left: -1rem;
          margin-right: -1rem;

          .folder-wrapper {
            padding-left: 1rem;
            padding-right: 1rem;

            &::after {
              content: '';
              width: 1rem;
              flex-shrink: 0;
            }
          }
        }
      }

      input[type=file] {
        display: none;
      }
    }
  }
</style>
