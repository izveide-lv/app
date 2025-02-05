<template>
  <TabContent class="custom-field-settings" :class="{ dark }" :dark="dark">
    <section class="wrapper wide">
      <h1 class="h2">Custom Fields</h1>
      <MbFileList v-if="initialised" :action="createCustomFieldAction" :dark="dark" :empty-state="emptyStateMessage" :file-actions="customFieldActions" file-list-label="Custom Fields" :initial-path="resolvedLastDir" pretty-filenames ref="fileList" :root="customFieldDir" @fileclick="openCustomField" @list-change="listedFiles = $event.files" @path-change="currentPath = $event" />
      <MbButton v-show="listedFiles === 0" :dark="dark" icon="plus" type="positive" @click="showEntityCreation = true">Create one</MbButton>
    </section>
    <EntityCreationModal :dark="dark" :file-content="JSON.stringify(defaultCustomFieldContent, null, 2)" file-extension="json" :path="currentPath" title="Add new…" :visible="showEntityCreation" @close="showEntityCreation = false" @entity-created="handleEntityCreated" />
    <EntityMoveModal v-if="initialised" :dark="dark" :old-path="entityBeingModified" pretty-filenames :root="customFieldDir" :visible="showEntityMove" @close="showEntityMove = false; entityBeingModified = null" @entity-moved="handleEntityMoved" />
    <EntityRenameModal :dark="dark" :old-path="entityBeingModified" :visible="showEntityRename" @close="showEntityRename = false; entityBeingModified = null" @entity-renamed="handleEntityRenamed" />
  </TabContent>
</template>

<script>
import fs, { exists } from '../../fs';
import { rmrf } from '../../fs/workerFS';

import duplicateEntity from '../../assets/js/duplicateEntity';

import updateLocallyChangedFiles from '../../mixins/updateLocallyChangedFiles';

import EntityCreationModal from '../../components/utility/EntityCreationModal.vue';
import EntityMoveModal from '../../components/utility/EntityMoveModal.vue';
import EntityRenameModal from '../../components/utility/EntityRenameModal.vue';
import TabContent from '../../components/utility/TabContent.vue';

export default {
  components: {
    EntityCreationModal,
    EntityMoveModal,
    EntityRenameModal,
    TabContent,
  },
  computed: {
    currentProject() {
      return this.$store.state.currentProject;
    },
    customFieldDir() {
      return `/projects/${this.currentProject.id}/.mattrbld/custom-fields`;
    },
    resolvedLastDir() {
      if (!this.lastDir || !this.lastDir.startsWith(this.customFieldDir)) return null;
      return this.lastDir;
    },
  },
  async created() {
    const dirExists = await exists(this.customFieldDir);
    if (!dirExists) await fs.mkdir(this.customFieldDir);
    this.currentPath = this.customFieldDir;
    this.initialised = true;
  },
  data() {
    return {
      createCustomFieldAction: {
        callback: () => { this.showEntityCreation = true; },
        label: 'Add',
        icon: 'plus',
        iconFirst: true,
        type: 'primary',
      },
      currentPath: null,
      customFieldActions: [
        {
          action: this.openCustomField,
          label: 'Edit',
          icon: 'pencil',
          filesOnly: true,
        },
        {
          action: this.renameFolder,
          label: 'Rename',
          icon: 'text-input',
        },
        {
          action: this.moveEntity,
          label: 'Move',
          icon: 'arrow-right',
        },
        {
          action: this.duplicateCustomField,
          label: 'Duplicate',
          icon: 'duplicate',
          filesOnly: true,
        },
        {
          action: this.deleteEntity,
          label: 'Delete',
          icon: 'trash',
          type: 'negative',
        },
      ],
      defaultCustomFieldContent: { // custom fields are groups by default
        type: 'group',
        customField: null, // this needs to be set to the path of the newly created field by EditCustomField.vue
        description: '',
        displayField: null,
        group: 'custom fields',
        icon: 'group',
        key: 'custom-field',
        label: 'Custom Field',
        tab: null,
        value: [],
        version: 1,
        visibility: { hidden: false, showByValue: { field: null } },
      },
      emptyStateMessage: 'There are no custom fields in this folder. <a href="https://mattrbld.com/docs/custom-fields/" target="_blank">What is a custom field?</a>',
      entityBeingModified: null,
      initialised: false,
      listedFiles: 0,
      showEntityCreation: false,
      showEntityMove: false,
      showEntityRename: false,
    };
  },
  methods: {
    async deleteEntity(path) {
      const isFile = (await fs.stat(path)).isFile();
      this.$store.commit('addToSoftDeleted', path);
      this.$store.commit('addToast', {
        action: () => {
          this.$store.commit('removeFromSoftDeleted', path);
        },
        actionLabel: 'Undo',
        message: `The ${isFile ? 'custom field was' : 'folder and all custom fields within have been'} deleted`,
        onClose: async (undone) => {
          if (undone) return;

          try {
            if (isFile) this.$store.commit('addLocallyChangedFile', path); // adding the files as changed, might be wrong if they are absent on the index, but checking for that is expensive
            else await this.updateLocallyChangedFiles(path); // adding the files as changed, might be wrong if they are absent on the index, but checking for that is expensive
            await rmrf(path);
            if (this.$refs.fileList) await this.$refs.fileList.refresh();
            this.$store.dispatch('saveAppData');
          } catch (err) {
            this.$store.commit('addToast', { message: `Something went wrong while deleting the ${isFile ? 'custom field' : 'folder'}: ${err.message}`, type: 'error' });
          } finally {
            this.$nextTick(() => { // wait a tick to avoid flicker
              this.$store.commit('removeFromSoftDeleted', path);
            });
          }
        },
        timeout: 5000,
        type: 'warning',
      });
    },
    duplicateCustomField(path) {
      duplicateEntity(path, this.$refs.fileList, this.openCustomField, 'Custom Field');
    },
    handleEntityCreated(name) {
      if (!name.endsWith('.json')) this.$refs.fileList.refresh();
      else {
        this.$store.commit('addLocallyChangedFile', `${this.currentPath}/${name}`);
        this.$store.dispatch('saveAppData');
        this.openCustomField(`${this.currentPath}/${name}`);
      }
    },
    async handleEntityMoved({ oldPath, newPath }) {
      this.$refs.fileList.refresh();
      this.entityBeingModified = null;

      if (oldPath.endsWith('.json')) {
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
    },
    handleEntityRenamed({ oldPath, newPath }) {
      this.$refs.fileList.refresh();
      this.entityBeingModified = null;

      this.$store.state.application.locallyChangedFiles.forEach((path) => {
        if (path.startsWith(oldPath)) {
          this.$store.commit('removeLocallyChangedFile', path);
          this.$store.commit('addLocallyChangedFile', path.replace(oldPath, newPath));
        }
      });
      this.$store.dispatch('saveAppData');
    },
    moveEntity(path) {
      this.entityBeingModified = path;
      this.showEntityMove = true;
    },
    openCustomField(path) {
      this.$router.push({ name: 'Edit Custom Field', params: { id: this.currentProject.id, path } });
    },
    renameFolder(path) {
      this.entityBeingModified = path;
      this.showEntityRename = true;
    },
  },
  mixins: [updateLocallyChangedFiles],
  props: {
    dark: Boolean,
    lastDir: String,
  },
};
</script>

<style lang="scss" scoped>
  @use '../../assets/styles/breakpoints' as *;

  .custom-field-settings {
    user-select: none;

    .wrapper {
      max-width: 40rem;
      margin-left: auto;
      margin-right: auto;

      &.wide {
        max-width: rem(960);
        margin-bottom: 8rem;

        @media #{$mobile} {
          margin-bottom: 4rem;
        }
      }

      .file-list {
        &:deep(.empty-state) {
          text-align: center;
          margin: 2rem 0;
        }

        & + .button {
          display: flex;
          margin-left: auto;
          margin-right: auto;
        }
      }
    }
  }
</style>
