<template>
  <MbModal class="media-select-modal" :dark="dark" :style="{ width: '60rem' }" title="Select an image…" :visible="visible" @close="$emit('close')">
    <div v-if="!mediaSettings.dir" class="unconfigured-state" :class="{ dark }">
      <h2>The Media Library hasn’t been configured yet</h2>
      <p>In order to upload and add images to your content, the Media Library has to be configured. Please ensure an upload directory has been added in the Project Settings.</p>
    </div>
    <MbFileList v-else :action="uploadAction" :active-file="selectedFilePath" :dark="dark" file-list-label="Media Files" folders-first only-images pretty-filenames ref="fileList" :root="mediaDir" thumbnails @fileclick="handleFileClick" @path-change="currentPath = $event" />
    <template #actions>
      <MbButton :dark="dark" @click="$emit('close')">Cancel</MbButton>
      <MbButton v-if="showRemoveButton" :dark="dark" :disabled="!selectedFilePath" type="negative" @click="$emit('clear-image')">Remove current image</MbButton>
    </template>

    <MediaCreationModal
      :current-path="currentPath"
      :dark="dark"
      :max-size="maxSize"
      only-images
      :permissions="userPermissions"
      single-file
      :title="uploadAction && uploadAction.label !== 'Add' ? uploadAction.label : 'Add new…'"
      :type="mediaCreationType"
      :visible="showUploadModal"
      @close="showUploadModal = false"
      @entity-created="handleEntityCreated"
      @update-type="mediaCreationType = $event"
    />

  </MbModal>
</template>

<script>
import fs, {
  exists,
  joinPath,
  mkdirp,
  pathDirname,
} from '../../fs';

import generateDefaultContentFromSchema from '../../assets/js/generateDefaultContentFromSchema';

import MediaCreationModal from './MediaCreationModal.vue';

export default {
  beforeUnmount() {
    window.removeEventListener('dragenter', this.handleWindowDragEnter);
    window.removeEventListener('dragover', this.preventWindowDragEvent);
    window.removeEventListener('dragleave', this.handleWindowDragLeave);
    window.removeEventListener('drop', this.preventWindowDragEvent);
  },
  components: {
    MediaCreationModal,
  },
  computed: {
    mediaDir() {
      if (!this.mediaSettings.dir) return null;
      return joinPath(this.projectsDir, this.mediaSettings.dir);
    },
    mediaSettings() {
      return this.$store.state.currentProject.media;
    },
    projectsDir() {
      return joinPath('/projects', this.$store.state.currentProject.id);
    },
    uploadAction() {
      let uploadAllowed = false;
      let folderCreationAllowed = false;
      if (!this.mediaSettings.permissions || this.userPermissions.has('everything')) {
        uploadAllowed = true;
        folderCreationAllowed = true;
      } else {
        if (this.userPermissions.has('upload')) uploadAllowed = true;
        if (this.userPermissions.has('createFolder')) folderCreationAllowed = true;
      }

      if (uploadAllowed) { // there’s no reason to offer folder creation if the user cannot upload
        return {
          callback: () => { this.showUploadModal = true; },
          label: folderCreationAllowed ? 'Add' : 'Upload',
          icon: folderCreationAllowed ? 'plus' : 'upload',
          iconFirst: true,
          type: 'primary',
        };
      }

      return null;
    },
    userPermissions() {
      if (!this.mediaSettings.permissions || !this.$store.getters.userInCurrentProject) return new Set();

      const { role } = this.$store.getters.userInCurrentProject;

      return new Set([
        ...(this.mediaSettings.permissions.everybody || []),
        ...(this.mediaSettings.permissions[role] || []),
      ]);
    },
  },
  data() {
    return {
      currentPath: '/',
      mediaCreationType: 'upload',
      showUploadModal: false,
    };
  },
  emits: ['clear-image', 'close', 'file-selected', 'too-large-error', 'update-meta-is-new'],
  methods: {
    handleEntityCreated(paths, type) {
      if (this.$refs.fileList) this.$refs.fileList.refresh();
      if (type !== 'directory') {
        const [path] = paths;
        if (path) this.handleFileClick(path);
      }
    },
    async handleFileClick(path) {
      if (!this.mediaSettings.advanced || this.noMeta) this.$emit('file-selected', path.replace(this.projectsDir, ''));
      else {
        let meta;
        const mediaMetaDir = joinPath(this.projectsDir, '.mattrbld', 'media');
        const pathInMediaDir = path.replace(this.mediaDir, '');
        try {
          const metadata = JSON.parse(await fs.readFile(joinPath(mediaMetaDir, `${pathInMediaDir}.json`), 'utf8'));
          meta = metadata;
        } catch (err) {
          if (err.code !== 'ENOENT') this.$store.commit('addToast', { message: `Something went wrong while reading the metadata for this file: ${err.message}`, type: 'error' });
          else {
            try {
              const mediaMetaDirExists = await exists(joinPath(mediaMetaDir, pathDirname(pathInMediaDir)));
              if (!mediaMetaDirExists) await mkdirp(joinPath(mediaMetaDir, pathDirname(pathInMediaDir)));
              const defaultMeta = generateDefaultContentFromSchema({ fields: this.mediaSettings.customFields }, path.replace(this.projectsDir, ''));
              await fs.writeFile(joinPath(mediaMetaDir, `${pathInMediaDir}.json`), JSON.stringify(defaultMeta, null, 2), 'utf8');
              this.$store.commit('addLocallyChangedFile', joinPath(mediaMetaDir, `${pathInMediaDir}.json`));
              this.$store.dispatch('saveAppData');
              meta = defaultMeta;
              this.$emit('update-meta-is-new', true);
            } catch (innerErr) {
              this.$store.commit('addToast', { message: `Something went wrong while creating the metadata file: ${innerErr.message}`, type: 'error' });
            }
          }
        }

        this.$emit('file-selected', { src: path.replace(this.projectsDir, ''), ...meta });
      }

      if (this.maxSize) {
        try {
          const size = await fs.du(path);
          const sizeInMb = size / 1024 / 1024;

          if (sizeInMb > this.maxSize) this.$emit('too-large-error');
        } catch (err) {
          this.$store.commit('addToast', { message: `Something went wrong when reading the filesize in ${this.label}: ${err.message}`, type: 'error' });
        }
      }

      this.$emit('close');
    },
    handleWindowDragEnter(e) {
      e.preventDefault();
      if (this.uploadAction) { // uploadAction is null if we don’t have permission
        this.mediaCreationType = 'upload';
        this.showUploadModal = true;
      }
    },
    handleWindowDragLeave(e) {
      e.preventDefault();

      if (
        this.showUploadModal && this.mediaCreationType === 'upload'
        && e.clientX === 0 && e.clientY === 0 // clientX and clientY are 0 if outside of the window
      ) this.showUploadModal = false;
    },
    preventWindowDragEvent(e) {
      e.preventDefault();
    },
  },
  props: {
    dark: Boolean,
    maxSize: Number,
    noMeta: Boolean,
    selectedFilePath: String,
    showRemoveButton: Boolean,
    visible: Boolean,
  },
  watch: {
    visible(nv) {
      if (nv) {
        window.addEventListener('dragenter', this.handleWindowDragEnter);
        window.addEventListener('dragover', this.preventWindowDragEvent);
        window.addEventListener('dragleave', this.handleWindowDragLeave);
        window.addEventListener('drop', this.preventWindowDragEvent);
      } else {
        window.removeEventListener('dragenter', this.handleWindowDragEnter);
        window.removeEventListener('dragover', this.preventWindowDragEvent);
        window.removeEventListener('dragleave', this.handleWindowDragLeave);
        window.removeEventListener('drop', this.preventWindowDragEvent);
      }
    },
  },
};
</script>

<style lang="scss" scoped>
  .media-select-modal {
    .unconfigured-state {
      text-align: center;
      color: var(--text-secondary);
      max-width: 40rem;
      margin-left: auto;
      margin-right: auto;

      &.dark {
        color: var(--text-secondary-dark);
      }

      h2 {
        margin-top: 0;
      }
    }

    .file-list {
      min-height: 50vh;
    }
  }

  .media-upload-modal {
    .uploading,
    .dropzone {
      &.v-enter-active,
      &.v-leave-active {
        transition: opacity 200ms ease;

        &.v-enter-from,
        &.v-leave-to {
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
