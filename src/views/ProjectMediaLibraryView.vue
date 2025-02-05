<template>
  <div class="media-library">
    <header>
      <h1>Media Library</h1>
      <MbChip v-if="currentProject.media.advanced" label="Advanced" @mouseenter="$store.commit('setTooltip', { position: 'right', message: 'The advanced Media Library is active, metadata will be stored', target: $event.target })" />
    </header>
    <TabContent :dark="dark" :show-split="showSplit" @split-close="entityBeingModified = null" @split-closed="handleSplitClosed">
      <MbFileList v-if="currentProject.media.dir" :action="action" :active-file="entityBeingModified" :dark="dark" :file-actions="fileActions" file-list-label="Media Files" folders-first pretty-filenames ref="fileList" :root="mediaDir" thumbnails @fileclick="handleFileClick" @list-change="listedFiles = $event.files" @path-change="currentPath = $event" />
      <div v-else class="unconfigured-state" :class="{ dark }">
        <h2>The Media Library hasn’t been configured yet</h2>
        <p v-if="isPrivilegedUser">You can do so in the project settings.</p>
        <p v-else>A developer can do so in the project settings.</p>
        <MbButton v-if="isPrivilegedUser" :dark="dark" icon="wrench-and-driver" type="primary" @click="$router.push({ name: 'Project.Settings', params: { id: currentProject.id }, query: { tab: 'media' }})">Configure now</MbButton>
      </div>
      <input type="file" ref="replaceFileInput" @change="handleReplaceFileInput" @cancel="handleReplaceFileInputCancel">

      <template #right="{ isModal }">
        <transition mode="out-in">
          <div class="edit-file" :class="{ dark }" :key="entityBeingModified">
            <div v-if="fileDetails.image" class="thumbnail">
              <img :src="fileDetails.image" :alt="fileDetails.alt || 'Error loading file'" @load="setImageResolutionAndColor">
            </div>
            <dl v-show="fileDetails.name" class="meta">
              <dl @mouseenter="showPathTooltip">
                <dt>Name:</dt>
                <dd>{{fileDetails.name}}</dd>
              </dl>
              <dl v-show="fileDetails.width !== null && fileDetails.height !== null">
                <dt>Resolution:</dt>
                <dd>{{fileDetails.width}}x{{fileDetails.height}}</dd>
              </dl>
              <dl v-show="fileDetails.dominantColor !== null">
                <dt>Color:</dt>
                <dd>
                  <span class="color-indicator" :style="{ backgroundColor: fileDetails.dominantColor }" />
                  <span class="color-code">{{fileDetails.dominantColor}}</span>
                </dd>
              </dl>
              <dl>
                <dt>Size:</dt>
                <dd>{{fileDetails.size}}</dd>
              </dl>
              <dl>
                <dt>Type:</dt>
                <dd>{{fileDetails.type}}</dd>
              </dl>
            </dl>
            <div class="data">
              <MbFieldsEditor v-if="currentProject.media.advanced && imageRegExp.test(entityBeingModified) && (userPermissions.has('everything') || userPermissions.has('editMedia'))" v-model:error="fileDetails.errors" :dark="dark" compact :fields="currentProject.media.customFields" in-split :model-value="fileDetails.meta" :languages="currentProject.languages" @update:model-value="updateMediaMetaFile" />
              <MbHighlightBox v-if="showSplit && (userPermissions.has('everything') || userPermissions.has('editMedia'))" class="replacement" :class="{ 'in-modal': isModal }" :dark="dark" label="Replace File">
                <p>Replacing a file allows you to change its contents without having to update all content items that refer to it, since the path will remain unchanged.</p>
                <MbButton :dark="dark" icon="replace-alt" @click="replaceFile">Replace</MbButton>
              </MbHighlightBox>
              <MbHighlightBox v-if="showSplit && (userPermissions.has('everything') || userPermissions.has('deleteMedia'))" :class="{ 'in-modal': isModal }" color="negative" :dark="dark" label="Delete File">
                <p>Please note that deleting a file will <strong>not</strong> remove it from content items that reference it! <strong>Make sure to update those as well</strong> to avoid broken links.</p>
                <MbButton :dark="dark" icon="trash" type="negative" @click="deleteEntity(entityBeingModified)">Delete</MbButton>
              </MbHighlightBox>
            </div>
          </div>
        </transition>
      </template>
    </TabContent>

    <EntityMoveModal :dark="dark" :old-path="entityBeingModified" pretty-filenames :root="mediaDir" :visible="showEntityMove" @close="showEntityMove = false; if (!showSplit) entityBeingModified = null" @entity-moved="handleEntityMoved" />
    <EntityRenameModal :dark="dark" :old-path="entityBeingModified" :visible="showEntityRename" @close="showEntityRename = false; if (!showSplit) entityBeingModified = null" @entity-renamed="handleEntityRenamed" />
    <MediaCreationModal :current-path="currentPath" :dark="dark" :permissions="userPermissions" :title="action && action.label !== 'Add' ? action.label : 'Add new…'" :type="type" :visible="showEntityCreation" @close="showEntityCreation = false" @entity-created="refreshFileList" @update-type="type = $event" />
  </div>
</template>

<script>
import { debounce } from 'lodash-es';
import fs, { exists, joinPath, mkdirp, pathBasename, pathDirname } from '../fs'; // eslint-disable-line object-curly-newline
import { rmrf } from '../fs/workerFS';

import generateDefaultContentFromSchema from '../assets/js/generateDefaultContentFromSchema';
import humanReadableSize from '../assets/js/humanReadableSize';
import prettifyEntityName from '../assets/js/prettifyEntityName';
import getFilenameAndExtension from '../assets/js/getFilenameAndExtension';
import { imageRegExp } from '../data/regExps';

import isPrivilegedUser from '../mixins/isPrivilegedUser';
import setImageResolutionAndColor from '../mixins/setImageResolutionAndColor';
import updateLocallyChangedFiles from '../mixins/updateLocallyChangedFiles';

import EntityMoveModal from '../components/utility/EntityMoveModal.vue';
import EntityRenameModal from '../components/utility/EntityRenameModal.vue';
import MediaCreationModal from '../components/utility/MediaCreationModal.vue';
import TabContent from '../components/utility/TabContent.vue';

export default {
  beforeUnmount() {
    window.removeEventListener('dragenter', this.handleWindowDragEnter);
    window.removeEventListener('dragover', this.preventWindowDragEvent);
    window.removeEventListener('dragleave', this.handleWindowDragLeave);
    window.removeEventListener('drop', this.preventWindowDragEvent);
  },
  components: {
    EntityMoveModal,
    EntityRenameModal,
    MediaCreationModal,
    TabContent,
  },
  computed: {
    action() {
      if (this.userPermissions.has('everything') || this.userPermissions.has('createFolder') || this.userPermissions.has('upload')) {
        let label;
        if (this.userPermissions.has('everything') || (this.userPermissions.has('createFolder') && this.userPermissions.has('upload'))) label = 'Add';
        else if (this.userPermissions.has('createFolder')) label = 'Add folder';
        else if (this.userPermissions.has('upload')) label = 'Upload files';

        return {
          callback: () => { this.showEntityCreation = true; },
          label,
          icon: label.includes('Add') ? 'plus' : 'upload',
          iconFirst: true,
          type: 'primary',
        };
      }
      return null;
    },
    currentProject() {
      return this.$store.state.currentProject;
    },
    fileActions() {
      const actions = [];

      if (this.userPermissions.has('everything')) {
        actions.push(
          {
            action: this.replaceFile,
            label: 'Replace',
            icon: 'replace-alt',
            filesOnly: true,
          },
          {
            action: this.renameEntity,
            label: 'Rename',
            icon: 'text-input',
          },
          {
            action: this.moveEntity,
            label: 'Move',
            icon: 'arrow-right',
          },
        );

        // so delete is always last
        actions.push(
          {
            action: this.deleteEntity,
            label: 'Delete',
            icon: 'trash',
            type: 'negative',
          },
        );

        return actions;
      }

      if (this.userPermissions.has('editMedia')) {
        actions.push(
          {
            action: this.replaceFile,
            label: 'Replace',
            icon: 'replace-alt',
            filesOnly: true,
          },
          {
            action: this.renameEntity,
            label: 'Rename',
            icon: 'text-input',
            filesOnly: !this.userPermissions.has('editFolder'),
          },
          {
            action: this.moveEntity,
            label: 'Move',
            icon: 'arrow-right',
            filesOnly: !this.userPermissions.has('editFolder'),
          },
        );
      } else if (this.userPermissions.has('editFolder')) {
        actions.push(
          {
            action: this.renameEntity,
            label: 'Rename',
            icon: 'text-input',
            foldersOnly: true,
          },
          {
            action: this.moveEntity,
            label: 'Move',
            icon: 'arrow-right',
            foldersOnly: true,
          },
        );
      }

      if (this.userPermissions.has('deleteMedia')) {
        actions.push(
          {
            action: this.deleteEntity,
            label: 'Delete',
            icon: 'trash',
            type: 'negative',
            filesOnly: !this.userPermissions.has('deleteFolder'),
          },
        );
      } else if (this.userPermissions.has('deleteFolder')) {
        actions.push(
          {
            action: this.deleteEntity,
            label: 'Delete',
            icon: 'trash',
            type: 'negative',
            foldersOnly: true,
          },
        );
      }

      return actions;
    },
    mediaDir() {
      return joinPath('/projects', this.currentProject.id, this.currentProject.media.dir);
    },
    mediaMetaDir() {
      return joinPath('/projects', this.currentProject.id, '.mattrbld', 'media');
    },
    userPermissions() {
      if (!this.currentProject.media.permissions || !this.$store.getters.userInCurrentProject) return new Set();

      const { role } = this.$store.getters.userInCurrentProject;

      return new Set([
        ...(this.currentProject.media.permissions.everybody || []),
        ...(this.currentProject.media.permissions[role] || []),
      ]);
    },
  },
  created() {
    window.addEventListener('dragenter', this.handleWindowDragEnter);
    window.addEventListener('dragover', this.preventWindowDragEvent);
    window.addEventListener('dragleave', this.handleWindowDragLeave);
    window.addEventListener('drop', this.preventWindowDragEvent);

    if (!this.userPermissions.has('everything') && !this.userPermissions.has('upload')) this.type = 'directory';
  },
  data() {
    return {
      currentPath: '/',
      entityBeingModified: null,
      fileDetails: {
        errors: new Map(),
        dominantColor: null,
        height: null,
        image: null,
        meta: null,
        name: null,
        size: null,
        type: null,
        width: null,
      },
      imageRegExp,
      listedFiles: 0,
      showEntityCreation: false,
      showEntityMove: false,
      showEntityRename: false,
      showSplit: false,
      type: 'upload',
    };
  },
  methods: {
    async deleteEntity(path) {
      const isFile = (await fs.stat(path)).isFile();

      if (path === this.entityBeingModified) this.entityBeingModified = null;
      this.$store.commit('addToSoftDeleted', path);
      this.$store.commit('addToast', {
        action: () => {
          this.$store.commit('removeFromSoftDeleted', path);
        },
        actionLabel: 'Undo',
        message: isFile ? `The file “${prettifyEntityName(pathBasename(path))}” was deleted` : 'The folder and all files within have been deleted',
        onClose: async (undone) => {
          if (undone) return;

          try {
            if (!isFile) await this.updateLocallyChangedFiles(path); // need to do this before the folder is removed so we can still grab the file paths
            await rmrf(path);
            if (this.currentProject.media.advanced && (this.imageRegExp.test(path) || !isFile)) {
              const pathInMediaDir = joinPath(this.mediaMetaDir, `${path.replace(this.mediaDir, '')}${isFile ? '.json' : ''}`);
              try {
                if (!isFile) await this.updateLocallyChangedFiles(pathInMediaDir); // need to do this before the folder is removed so we can still grab the file paths
                await rmrf(pathInMediaDir);
                if (isFile) this.$store.commit('addLocallyChangedFile', pathInMediaDir);
              } catch (err) {
                if (err.code !== 'ENOENT') throw err;
              }
            }
            await this.refreshFileList();
            if (isFile) this.$store.commit('addLocallyChangedFile', path);
            this.$store.dispatch('saveAppData');
          } catch (err) {
            this.$store.commit('addToast', { message: `Something went wrong while deleting the ${isFile ? 'schema' : 'folder'}: ${err.message}`, type: 'error' });
          } finally {
            this.$store.commit('removeFromSoftDeleted', path);
          }
        },
        timeout: 5000,
        type: 'warning',
      });
    },
    async handleEntityMoved({ oldPath, newPath }) {
      this.refreshFileList();
      this.entityBeingModified = null;

      const isFile = (await fs.stat(newPath)).isFile();

      if (isFile) {
        this.$store.commit('removeLocallyChangedFile', oldPath);
        this.$store.commit('addLocallyChangedFile', newPath);
      } else { // we moved a directory
        this.$store.commit('removeLocallyChangedFolder', oldPath);
        try {
          await this.updateLocallyChangedFiles(newPath);
        } catch (err) {
          this.$store.commit('addToast', { message: `Something went wrong while updating locally changed files: ${err.message}`, type: 'error' });
        }
      }
      this.$store.dispatch('saveAppData');

      if (this.currentProject.media.advanced && (this.imageRegExp.test(oldPath) || !isFile)) {
        const oldPathInMediaDir = joinPath(this.mediaMetaDir, `${oldPath.replace(this.mediaDir, '')}${isFile ? '.json' : ''}`);
        const newPathInMediaDir = joinPath(this.mediaMetaDir, `${newPath.replace(this.mediaDir, '')}${isFile ? '.json' : ''}`);

        if (await exists(oldPathInMediaDir)) {
          await mkdirp(pathDirname(newPathInMediaDir)); // since that might not exist
          await fs.rename(oldPathInMediaDir, newPathInMediaDir);
          this.handleEntityMoved({ oldPath: oldPathInMediaDir, newPath: newPathInMediaDir });
        }
      }
    },
    async handleEntityRenamed({ oldPath, newPath }) {
      this.refreshFileList();
      this.entityBeingModified = null;

      const isFile = (await fs.stat(newPath)).isFile();

      if (isFile) {
        this.$store.commit('removeLocallyChangedFile', oldPath);
        this.$store.commit('addLocallyChangedFile', newPath);
      } else {
        this.$store.state.application.locallyChangedFiles.forEach((path) => {
          this.$store.commit('removeLocallyChangedFile', path);
          this.$store.commit('addLocallyChangedFile', path.replace(oldPath, newPath));
        });
      }

      this.$store.dispatch('saveAppData');

      if (this.currentProject.media.advanced && (this.imageRegExp.test(oldPath) || !isFile)) {
        const oldPathInMediaDir = joinPath(this.mediaMetaDir, `${oldPath.replace(this.mediaDir, '')}${isFile ? '.json' : ''}`);
        const newPathInMediaDir = joinPath(this.mediaMetaDir, `${newPath.replace(this.mediaDir, '')}${isFile ? '.json' : ''}`);

        if (await exists(oldPathInMediaDir)) {
          await fs.rename(oldPathInMediaDir, newPathInMediaDir);
          this.handleEntityRenamed({ oldPath: oldPathInMediaDir, newPath: newPathInMediaDir });
        }
      }
    },
    async handleFileClick(path, size, imageUrl) {
      if (this.entityBeingModified === path) {
        this.entityBeingModified = null;
        return;
      }

      if (this.currentProject.media.advanced && this.imageRegExp.test(path) && (this.userPermissions.has('everything') || this.userPermissions.has('editMedia'))) {
        const { mediaMetaDir } = this;
        const pathInMediaDir = path.replace(this.mediaDir, '');
        try {
          const metadata = JSON.parse(await fs.readFile(joinPath(mediaMetaDir, `${pathInMediaDir}.json`), 'utf8'));
          this.fileDetails.meta = metadata;
        } catch (err) {
          if (err.code !== 'ENOENT') this.$store.commit('addToast', { message: `Something went wrong while reading the metadata for this file: ${err.message}`, type: 'error' });
          else {
            try {
              const mediaMetaDirExists = await exists(joinPath(mediaMetaDir, pathDirname(pathInMediaDir)));
              if (!mediaMetaDirExists) await mkdirp(joinPath(mediaMetaDir, pathDirname(pathInMediaDir)));
              const defaultMeta = generateDefaultContentFromSchema({ fields: this.currentProject.media.customFields }, path.replace(`/projects/${this.currentProject.id}`, ''));
              await fs.writeFile(joinPath(mediaMetaDir, `${pathInMediaDir}.json`), JSON.stringify(defaultMeta, null, 2), 'utf8');
              this.$store.commit('addLocallyChangedFile', joinPath(mediaMetaDir, `${pathInMediaDir}.json`));
              this.$store.dispatch('saveAppData');
              this.fileDetails.meta = defaultMeta;
            } catch (innerErr) {
              this.$store.commit('addToast', { message: `Something went wrong while creating the metadata file: ${innerErr.message}`, type: 'error' });
            }
          }
        }
      }

      this.entityBeingModified = path;
      this.showSplit = true;
      this.fileDetails.errors = new Map(); // clear the errors, they’re not needed since nothing got saved while they were there
      this.fileDetails.width = null; // need to reset these here before the image / file has a chance to load
      this.fileDetails.height = null; // need to reset these here before the image / file has a chance to load
      this.fileDetails.dominantColor = null; // need to reset these here before the image / file has a chance to load
      this.fileDetails.image = imageUrl;
      this.fileDetails.name = pathBasename(path);
      this.fileDetails.type = this.fileDetails.name.slice(this.fileDetails.name.lastIndexOf('.') + 1).toUpperCase();
      this.fileDetails.size = size;
    },
    async handleReplaceFileInput(e) {
      const replacement = e.currentTarget.files[0];
      e.currentTarget.value = '';

      if (!replacement) {
        this.$store.commit('addToast', { message: 'No file was selected, the replacement was aborted', type: 'warning' });
      } else if (getFilenameAndExtension(this.entityBeingModified).extension !== getFilenameAndExtension(replacement.name).extension) {
        this.$store.commit('addToast', { message: 'The file could not be replaced because the selected file isn’t of the same type', type: 'negative' });
      } else {
        try {
          const arrayBuffer = await replacement.arrayBuffer();
          const isImage = this.imageRegExp.test(this.entityBeingModified);
          let newUrl;
          fs.writeFile(this.entityBeingModified, arrayBuffer);
          this.$store.commit('addLocallyChangedFile', this.entityBeingModified);

          if (isImage) {
            newUrl = URL.createObjectURL(replacement);
            this.$refs.fileList.replaceThumbnail(this.entityBeingModified, newUrl);
          }

          if (this.showSplit) {
            if (isImage) {
              this.fileDetails.width = null; // need to reset these here before the image / file has a chance to load
              this.fileDetails.height = null; // need to reset these here before the image / file has a chance to load
              this.fileDetails.dominantColor = null; // need to reset these here before the image / file has a chance to load
              this.fileDetails.image = newUrl;
            }
            this.fileDetails.size = humanReadableSize(replacement.size);
          } else this.entityBeingModified = null;
        } catch (err) {
          this.$store.commit('addToast', { message: `Something went wrong while replacing the file: ${err.message}`, type: 'error' });
        }
      }
    },
    handleReplaceFileInputCancel() {
      this.entityBeingModified = null;
    },
    handleSplitClosed() {
      this.fileDetails = {
        dominantColor: null,
        height: null,
        image: null,
        meta: null,
        name: null,
        size: null,
        type: null,
        width: null,
      };
    },
    handleWindowDragEnter(e) {
      e.preventDefault();
      if ((this.userPermissions.has('everything') || this.userPermissions.has('upload')) && (!this.showEntityCreation || this.type === 'directory')) {
        this.type = 'upload';
        this.showEntityCreation = true;
      }
    },
    handleWindowDragLeave(e) {
      e.preventDefault();

      if (
        this.showEntityCreation && this.type === 'upload'
        && e.clientX === 0 && e.clientY === 0 // clientX and clientY are 0 if outside of the window
      ) this.showEntityCreation = false;
    },
    preventWindowDragEvent(e) {
      e.preventDefault();
    },
    moveEntity(path) {
      this.entityBeingModified = path;
      this.showEntityMove = true;
    },
    async refreshFileList() {
      if (this.$refs.fileList) await this.$refs.fileList.refresh();
    },
    renameEntity(path) {
      this.entityBeingModified = path;
      this.showEntityRename = true;
    },
    replaceFile(path) {
      if (typeof path === 'string') this.entityBeingModified = path;
      this.$refs.replaceFileInput.click();
    },
    showPathTooltip(e) {
      if (!this.fileDetails.name) return;

      const tooltip = {
        message: this.fileDetails.name,
        target: e.currentTarget,
      };
      this.$store.commit('setTooltip', tooltip);
    },
    updateMediaMetaFile: debounce(async function (newMeta) { // eslint-disable-line func-names
      if (this.fileDetails.errors.size > 0) return; // don’t save invalid values
      const { mediaMetaDir } = this;
      const pathInMediaDir = this.entityBeingModified.replace(this.mediaDir, '');
      this.fileDetails.meta = newMeta;
      await fs.writeFile(joinPath(mediaMetaDir, `${pathInMediaDir}.json`), JSON.stringify(newMeta, null, 2), 'utf8');
      this.$store.commit('addLocallyChangedFile', joinPath(mediaMetaDir, `${pathInMediaDir}.json`));
      this.$store.dispatch('saveAppData');
    }, 500),
  },
  mixins: [isPrivilegedUser, setImageResolutionAndColor, updateLocallyChangedFiles],
  props: {
    dark: Boolean,
  },
  watch: {
    entityBeingModified(nv) {
      if (nv === null && this.showSplit) this.showSplit = false;
    },
  },
};
</script>

<style lang="scss" scoped>
  @use '../assets/styles/breakpoints' as *;

  .media-library {
    user-select: none;
    height: 100%;
    display: flex;
    flex-direction: column;
    padding-top: rem(27); // HACK: to align the baseline of the heading with the bottom line of the avatar

    @media #{$tablet} {
      padding-top: 0;
    }

    header {
      display: flex;
      align-items: center;
      margin-bottom: 2rem;
      padding: 0 2rem;

      @media #{$mobile} {
        flex-wrap: wrap;
      }

      h1 {
        margin: 0;

        @media #{$mobile} {
          margin-top: 0.5rem;
          margin-right: 1rem;
        }
      }

      .chip {
        margin-left: 1rem;

        @media #{$mobile} {
          margin-left: 0;
          margin-top: 0.5rem;
        }
      }
    }

    .tab-content {
      flex-grow: 1;

      &:deep(.content-wrapper.right) {
        &.padded {
          padding: 0;
        }

        .close-wrapper {
          .close-button {
            right: 1rem;

            &:not(:hover):not(:focus):not(:active) {
              background-color: color-mix(in srgb, var(--bg) 75%, transparent);

              &.dark {
                background-color: color-mix(in srgb, var(--bg-dark) 75%, transparent);
              }
            }
          }
        }
      }

      .file-list {
        max-width: rem(960);
        margin: 0 auto;
        margin-top: 8rem;
        margin-bottom: 1rem;

        @media #{$tablet} {
          margin-top: 4rem;
        }

        @media #{$mobile} {
          margin-top: 2rem;
        }

        & + .button {
          display: flex;
          margin-left: auto;
          margin-right: auto;
        }
      }

      .unconfigured-state {
        text-align: center;

        &.dark {
          h2,
          p {
            color: var(--text-secondary-dark);
          }
        }

        h2,
        p {
          color: var(--text-secondary);
        }

        h2 {
          margin-top: 8rem;
        }

        p {
          margin-bottom: 2rem;
        }
      }

      input[type=file] {
        display: none;
      }
    }
  }

  .edit-file {
    &.v-enter-active,
    &.v-leave-active {
      transition: opacity 200ms ease;

      &.v-enter-from,
      &.v-leave-to {
        opacity: 0;
      }
    }

    &.dark {
      .thumbnail {
        background-image: linear-gradient(to right, rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.9)), linear-gradient(to right, black 50%, white 50%), linear-gradient(to bottom, black 50%, white 50%);
      }

      .meta {
        background-color: var(--bg-secondary-dark-darkened-2);

        dl {
          dt {
            color: var(--text-secondary-dark);
          }

          dd .color-indicator {
            box-shadow: inset 0 0 0 0.0625rem var(--text-tertiary-dark);
          }
        }
      }
    }

    .thumbnail {
      color: var(--text-dark);
      height: 30rem;
      display: flex;
      align-items: center;
      justify-content: center;
      background-image: linear-gradient(to right, rgba(0, 0, 0, 0.75), rgba(0, 0, 0, 0.75)), linear-gradient(to right, black 50%, white 50%), linear-gradient(to bottom, black 50%, white 50%);
      background-size: 1.5rem 1.5rem;
      background-blend-mode: normal, difference;
      position: relative;

      @media #{$mobile} {
        height: 12rem;
        margin-top: -1rem;
        border-top-left-radius: var(--radius-m);
        border-top-right-radius: var(--radius-m);
      }

      .icon,
      img {
        &.v-enter-active,
        &.v-leave-active {
          position: absolute;
          transition: opacity 200ms ease;

          &.v-enter-from,
          &.v-leave-to {
            opacity: 0;
          }
        }
      }

      .icon {
        margin: 0;
        width: 3rem;
        height: 3rem;
      }

      img {
        max-width: 100%;
        max-height: 100%;

        &.hidden {
          opacity: 0;
        }
      }
    }

    .meta {
      background-color: var(--bg-secondary);
      margin: 0;
      padding: 1rem;
      display: flex;
      justify-content: center;

      dl {
        margin: 0;
        overflow: hidden;
        flex-shrink: 0;

        &:first-child {
          flex-shrink: 1;
        }

        &:not(:last-child) {
          margin-right: 4rem;
        }

        dt,
        dd {
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        dt {
          color: var(--text-secondary);
          font-size: 0.875rem;
        }

        dd {
          .color-indicator {
            vertical-align: middle;
            margin-right: 0.5rem;
            display: inline-block;
            width: 1rem;
            height: 1rem;
            border-radius: 50%;
            box-shadow: inset 0 0 0 0.0625rem var(--text-tertiary);
          }

          .color-code {
            vertical-align: middle;
            user-select: all;
          }
        }
      }

      @media #{$mobile} {
        display: block;
        padding: 1rem;
        border-bottom-left-radius: var(--radius-m);
        border-bottom-right-radius: var(--radius-m);

        dl:not(:last-child) {
          margin-right: 0;
          margin-bottom: 0.5rem;
        }
      }
    }

    .data {
      max-width: 44rem;
      margin-left: auto;
      margin-right: auto;
      padding: 2rem;

      @media #{$mobile} {
        padding-left: 0;
        padding-right: 0;
      }

      .fields-editor {
        margin-bottom: 4rem;
      }

      .highlight-box {
        &.dark:not(.in-modal) {
          background-color: var(--bg-secondary-dark);
        }

        .button {
          display: flex;
          margin-left: auto;
        }
      }

      .replacement {
        margin-bottom: 4rem;
      }
    }
  }
</style>
