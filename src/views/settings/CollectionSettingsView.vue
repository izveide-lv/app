<template>
  <TabContent class="collection-settings" :dark="dark" :show-split="showSplit" @split-close="showSplit = false" @split-closed="handleSplitClosed">
    <section class="wrapper wide">
      <h1 class="h2">Collections</h1>
      <MbFileList v-if="initialised" :action="createCollectionAction" :active-file="collectionBeingModified" :dark="dark" :empty-state="emptyStateMessage" :file-actions="collectionActions" file-list-label="Collections" pretty-filenames ref="fileList" :root="collectionDir" @fileclick="$event === collectionBeingModified ? showSplit = false : openCollectionSettings($event)" @list-change="listedFiles = $event.files" />
      <MbButton v-show="listedFiles === 0" :dark="dark" icon="plus" type="positive" @click="showEntityCreation = true">Create one</MbButton>
    </section>
    <template #right>
      <transition mode="out-in">
        <div v-if="!splitLoading" class="edit-collection" :class="{ dark }" :key="collectionBeingModifiedName">
          <header>
            <h2 :class="{ h3: isMobile }">{{collectionBeingModifiedName}}</h2>
            <span>Edit Collection</span>
          </header>
          <section>
            <h3>Content</h3>
            <div class="input-row">
              <span>Content directory:</span>
              <MbFilePicker v-model="collectionDetails.dir" :dark="dark" placeholder="Select the folder with your content…" relative-to-root :root="`/projects/${currentProject.id}`" />
            </div>
            <div class="input-row">
              <span>Content type:</span>
              <MbSelect v-model="collectionDetails.type" :dark="dark" :options="[{ label: 'JSON', value: 'json' }, { label: 'Markdown', value: 'md' }, { label: 'Media', value: 'media' }]" @update:model-value="cleanCollectionDetails" />
            </div>
            <template v-if="collectionDetails.type !== 'media'">
              <div class="input-row schemas">
                <span>Allowed Schemas:</span>
                <MbItemList v-model="collectionDetails.schemas" :dark="dark" :options="availableSchemas" placeholder="Select a Schema…" />
              </div>
              <MbToggle v-if="currentProject.draftsDir" v-model="collectionDetails.draftByDefault" :dark="dark">Create new content as drafts</MbToggle>
              <MbToggle v-if="currentProject.previewUrl" v-model="collectionDetails.disablePreview" :dark="dark">Disable previews for content in this collection</MbToggle>
              <transition>
                <MbToggle v-if="currentProject.previewUrl && !collectionDetails.disablePreview" v-model="collectionDetails.disableComments" :dark="dark">Disable comments in previews for content in this collection</MbToggle>
              </transition>
            </template>
            <template v-else>
              <div class="input-row">
                <span>Maximum file size (MB):</span>
                <MbInput v-model.number="collectionDetails.maxSize" clearable :dark="dark" placeholder="Same as Media Library" type="number" />
              </div>
              <div class="input-row">
                <span>Allowed file extensions (no dot):</span>
                <MbTagInput v-model="collectionDetails.allowedTypes" allow-unsuggested :dark="dark" :placeholder="!collectionDetails.allowedTypes || !collectionDetails.allowedTypes.length ? 'Any' : 'New extension…'" />
              </div>
            </template>
          </section>
          <section>
            <h3>Linking</h3>
            <MbToggle v-model="collectionDetails.linkable" :dark="dark">Allow content in this collection to be linked</MbToggle>
            <transition>
              <div v-if="collectionDetails.linkable && currentProject.languages.length === 0" class="input-row">
                <span>URL Template:</span>
                <MbInput :dark="dark" :model-modifiers="{ lazy: true }" :model-value="currentURLTemplate" placeholder="e.g. /blog/:date[year]/:title\.html" @update:model-value="handleURLTemplateUpdate" />
              </div>
              <div v-else-if="collectionDetails.linkable" class="input-group">
                <p>URL Templates</p>
                <div v-for="lang in currentProject.languages" class="input-row" :key="lang">
                  <span>{{lang}}:</span>
                  <MbInput :dark="dark" :model-modifiers="{ lazy: true }" :model-value="currentURLTemplate[lang]" placeholder="e.g. /blog/:date[year]/:title\.html" @update:model-value="handleURLTemplateUpdate($event, lang)" />
                </div>
              </div>
            </transition>
          </section>
          <section>
            <h3>Permissions</h3>
            <MbPermissionsList v-model="collectionDetails.permissions" :dark="dark" :permissions="permissions" :roles="roles" />
          </section>
        </div>
        <MbLoader :class="{ dark }" v-else />
      </transition>
    </template>
    <EntityCreationModal :dark="dark" :file-content="JSON.stringify(defaultCollectionContent, null, 2)" file-extension="json" only="file" :path="collectionDir" title="Add new Collection" :visible="showEntityCreation" @close="showEntityCreation = false" @entity-created="handleCollectionCreated" />
    <EntityRenameModal :dark="dark" :old-path="collectionBeingModified" title="Rename Collection" :visible="showEntityRename" @close="showEntityRename = false; collectionBeingModified = null" @entity-renamed="handleEntityRenamed" />
  </TabContent>
</template>

<script>
import { cloneDeep } from 'lodash-es';
import fs, { exists, readdirDeep } from '../../fs';

import duplicateEntity from '../../assets/js/duplicateEntity';
import prettifyEntityName from '../../assets/js/prettifyEntityName';

import EntityCreationModal from '../../components/utility/EntityCreationModal.vue';
import EntityRenameModal from '../../components/utility/EntityRenameModal.vue';
import TabContent from '../../components/utility/TabContent.vue';

import availableRoles from '../../data/availableRoles';

export default {
  components: {
    EntityCreationModal,
    EntityRenameModal,
    TabContent,
  },
  computed: {
    currentProject() {
      return this.$store.state.currentProject;
    },
    collectionDir() {
      return `/projects/${this.currentProject.id}/.mattrbld/collections`;
    },
    collectionBeingModifiedName() {
      if (!this.collectionBeingModified) return '';
      return prettifyEntityName(this.collectionBeingModified.split('/').slice(-1)[0]);
    },
    currentURLTemplate() {
      if (this.currentProject.languages.length === 0) {
        if (this.collectionDetails.urlTemplate && typeof this.collectionDetails.urlTemplate === 'object') return Object.values(this.collectionDetails.urlTemplate).find((value) => value);
        if (!this.collectionDetails.urlTemplate) return '';
        return this.collectionDetails.urlTemplate;
      }

      if (!this.collectionDetails.urlTemplate) return {};
      if (typeof this.collectionDetails.urlTemplate === 'string') return { [this.currentProject.languages[0]]: this.collectionDetails.urlTemplate };
      return this.collectionDetails.urlTemplate;
    },
    isMobile() {
      return this.$store.state.application.mobile;
    },
    permissions() {
      const permissions = [
        { label: 'create folders', value: 'createFolder' },
        { label: 'delete content', value: 'deleteContent' },
        { label: 'delete folders', value: 'deleteFolder' },
        { label: 'edit folders', value: 'editFolder' },
        { label: 'do everything', value: 'everything' },
      ];

      if (this.collectionDetails.type !== 'media') {
        permissions.unshift({ label: 'create content', value: 'createContent' });
        permissions.splice(3, 0, { label: 'edit content', value: 'editContent' }); // using splice so it’s right after "delete folders"
        if (this.currentProject.draftsDir) permissions.push({ label: 'publish drafts', value: 'publishDrafts' });
        if (this.currentProject.previewUrl && !this.collectionDetails.disablePreview && !this.collectionDetails.disableComments) permissions.unshift({ label: 'leave comments', value: 'comment' }); // inserting at the top to preserve alphabetical order
      } else {
        permissions.unshift({ label: 'upload content', value: 'upload' });
      }

      return permissions;
    },
    projectDir() {
      return `/projects/${this.currentProject.id}`;
    },
    roles() {
      return [{ label: 'Everybody', value: 'everybody' }, ...availableRoles, ...this.currentProject.customRoles];
    },
  },
  async created() {
    const dirExists = await exists(this.collectionDir);
    if (!dirExists) await fs.mkdir(this.collectionDir);

    try {
      const schemas = (await readdirDeep(`/projects/${this.currentProject.id}/.mattrbld/schemas`)).filter((path) => path.endsWith('.json')); // we are only interested in JSON files
      this.availableSchemas = schemas.map((schema) => ({ label: prettifyEntityName(schema.split('/').slice(-1)[0]), value: schema.replace(this.projectDir, '') }));
    } catch (err) {
      if (err.code !== 'ENOENT') this.$store.commit('addToast', { message: `Something went wrong while trying to get all Schemas: ${err.message}`, type: 'error' }); // it’s okay if /schemas doesn’t exist yet
    }

    this.initialised = true;
  },
  data() {
    return {
      availableSchemas: [],
      collectionActions: [
        {
          action: this.openCollectionSettings,
          label: 'Edit',
          icon: 'pencil',
          filesOnly: true,
        },
        {
          action: this.renameCollection,
          label: 'Rename',
          icon: 'text-input',
        },
        {
          action: this.duplicateCollection,
          label: 'Duplicate',
          icon: 'duplicate',
          filesOnly: true,
        },
        {
          action: this.deleteCollection,
          label: 'Delete',
          icon: 'trash',
          type: 'negative',
        },
      ],
      createCollectionAction: {
        callback: () => { this.showEntityCreation = true; },
        label: 'Add Collection',
        icon: 'plus',
        iconFirst: true,
        type: 'primary',
      },
      collectionBeingModified: null,
      collectionDetails: {
        allowedTypes: null,
        dir: null,
        disableComments: false,
        disablePreview: false,
        draftByDefault: false,
        schemas: [],
        linkable: false,
        maxSize: null,
        permissions: {},
        type: 'json',
        urlTemplate: '',
      },
      defaultCollectionContent: {
        allowedTypes: null,
        dir: null,
        disableComments: false,
        disablePreview: false,
        draftByDefault: false,
        schemas: [],
        linkable: false,
        maxSize: null,
        permissions: {
          everybody: ['everything'],
        },
        type: 'json',
        urlTemplate: '',
      },
      emptyStateMessage: 'There are no Collections yet. <a href="https://mattrbld.com/docs/collections/" target="_blank">What is a Collection?</a>',
      initialised: false,
      listedFiles: 0,
      showEntityCreation: false,
      showEntityRename: false,
      showSplit: false,
      splitLoading: true,
    };
  },
  methods: {
    cleanCollectionDetails(type) {
      if (type === 'media') {
        this.collectionDetails.allowedTypes = ['pdf', 'zip'];
        this.collectionDetails.disableComments = true;
        this.collectionDetails.disablePreview = true;
        this.collectionDetails.draftByDefault = false;
        this.collectionDetails.linkable = true;
        this.collectionDetails.schemas = [];

        if (!this.collectionDetails.urlTemplate) this.collectionDetails.urlTemplate = '/:filepath.content\\.:fileExtension';

        const cleanPermissions = {};
        Object.keys(this.collectionDetails.permissions).forEach((key) => {
          const editPermissionIndex = this.collectionDetails.permissions[key].indexOf('editContent');
          const createPermissionIndex = this.collectionDetails.permissions[key].indexOf('createContent');
          const publishPermissionIndex = this.collectionDetails.permissions[key].indexOf('publishDrafts');

          if (editPermissionIndex > -1) this.collectionDetails.permissions[key].splice(editPermissionIndex, 1);
          if (createPermissionIndex > -1) this.collectionDetails.permissions[key].splice(createPermissionIndex, 1, 'upload');
          if (publishPermissionIndex > -1) this.collectionDetails.permissions[key].splice(publishPermissionIndex, 1);
          if (this.collectionDetails.permissions[key].length) cleanPermissions[key] = this.collectionDetails.permissions[key];
        });
        this.collectionDetails.permissions = cleanPermissions;
      } else {
        this.collectionDetails.maxSize = null;
        this.collectionDetails.allowedTypes = [];

        const cleanPermissions = {};
        Object.keys(this.collectionDetails.permissions).forEach((key) => {
          const uploadPermissionIndex = this.collectionDetails.permissions[key].indexOf('upload');

          if (uploadPermissionIndex > -1) this.collectionDetails.permissions[key].splice(uploadPermissionIndex, 1, 'createContent');
          if (this.collectionDetails.permissions[key].length) cleanPermissions[key] = this.collectionDetails.permissions[key];
        });
        this.collectionDetails.permissions = cleanPermissions;
      }
    },
    deleteCollection(path) {
      if (this.collectionBeingModified === path) this.showSplit = false;
      this.$store.commit('addToSoftDeleted', path);
      this.$store.commit('addToast', {
        action: () => {
          this.$store.commit('removeFromSoftDeleted', path);
        },
        actionLabel: 'Undo',
        message: 'The collection was deleted',
        onClose: async (undone) => {
          if (undone) return;

          try {
            await fs.unlink(path);
            if (this.$refs.fileList) await this.$refs.fileList.refresh(); // we might be somewhere else already
            this.$store.commit('addLocallyChangedFile', path);
            this.$store.dispatch('saveAppData');
          } catch (err) {
            this.$store.commit('addToast', { message: `Something went wrong while deleting the collection: ${err.message}`, type: 'error' });
          } finally {
            this.$store.commit('removeFromSoftDeleted', path);
          }
        },
        timeout: 5000,
        type: 'warning',
      });
    },
    duplicateCollection(path) {
      duplicateEntity(path, this.$refs.fileList, this.openCollectionSettings, 'Collection');
    },
    handleCollectionCreated(name) {
      this.$refs.fileList.refresh();
      this.$store.commit('addLocallyChangedFile', `${this.collectionDir}/${name}`);
      this.$store.dispatch('saveAppData');
      this.openCollectionSettings(`${this.collectionDir}/${name}`);
    },
    handleEntityRenamed({ oldPath, newPath }) {
      this.$refs.fileList.refresh();
      this.collectionBeingModified = null;

      this.$store.commit('removeLocallyChangedFile', oldPath);
      this.$store.commit('addLocallyChangedFile', newPath);
      this.$store.dispatch('saveAppData');

      if (this.currentProject.sidebar && this.currentProject.sidebar.length > 0) {
        // the collection might have been a target in a sidebar entry, so we need to update that
        const sidebarEntries = this.currentProject.sidebar.reduce((acc, entry) => {
          if (entry.target && entry.target.name === 'Project.Collection' && entry.target.params && entry.target.params.path === oldPath) acc.push(entry);
          return acc;
        }, []);

        if (sidebarEntries && sidebarEntries.length > 0) {
          const sidebarClone = cloneDeep(this.currentProject.sidebar);
          sidebarEntries.forEach((entry) => {
            const entryClone = cloneDeep(entry);
            entryClone.target.params.path = newPath;
            sidebarClone.splice(this.currentProject.sidebar.indexOf(entry), 1, entryClone);
          });

          this.$store.commit('setCurrentProjectProperty', { key: 'sidebar', value: sidebarClone });
          this.$store.dispatch('saveCurrentProject');
        }
      }
    },
    handleSplitClosed() {
      if (!this.showEntityRename) this.collectionBeingModified = null; // split closes when whe rename, but we dont want to reset the collectionBeingModified so we still know which one we’re renaming
      this.collectionDetails.dir = null;
      this.collectionDetails.disableComments = false;
      this.collectionDetails.disablePreview = false;
      this.collectionDetails.draftByDefault = false;
      this.collectionDetails.schemas = [];
      this.collectionDetails.linkable = false;
      this.collectionDetails.permissions = {};
      this.collectionDetails.type = 'json';
      this.collectionDetails.urlTemplate = '';
      this.splitLoading = true;
    },
    handleURLTemplateUpdate(newVal, lang) {
      if (!lang) this.collectionDetails.urlTemplate = newVal;
      else if (!this.collectionDetails.urlTemplate || typeof this.collectionDetails.urlTemplate !== 'object') this.collectionDetails.urlTemplate = { [lang]: newVal };
      else this.collectionDetails.urlTemplate[lang] = newVal;
    },
    async openCollectionSettings(path) {
      if (this.collectionBeingModified === path) return;
      this.showSplit = true;
      this.collectionDetails = JSON.parse(await fs.readFile(path, 'utf8'));
      this.$nextTick(() => { this.collectionBeingModified = path; }); // wait a tick so the save handler doesn’t fire immediately
      this.splitLoading = false;
    },
    renameCollection(path) {
      if (this.showSplit) this.showSplit = false;
      this.collectionBeingModified = path;
      this.showEntityRename = true;
    },
  },
  props: {
    dark: Boolean,
  },
  watch: {
    collectionDetails: {
      async handler(nv, ov) {
        if (!this.showEntityRename && this.collectionBeingModified && nv === ov) { // we don’t want to save empty details after the rename modal shows and only want to save if we’re referencing the same object (to avoid overwriting when switching between two files)
          await fs.writeFile(this.collectionBeingModified, JSON.stringify(this.collectionDetails, null, 2), 'utf8');
          this.$store.commit('addLocallyChangedFile', this.collectionBeingModified);
          this.$store.dispatch('saveAppData');
        }
      },
      deep: true,
    },
  },
};
</script>

<style lang="scss" scoped>
  @use '../../assets/styles/breakpoints' as *;

  .collection-settings {
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

  .edit-collection {
    &.dark {

      header span,
      section h3,
      .input-group > p {
        color: var(--text-secondary-dark);
      }

      .file-picker,
      .input,
      .tag-input {
        background-color: var(--bg-tertiary-dark);
      }

      .item-list:deep(.item.dark) {
        background-color: var(--bg-tertiary-dark);
        box-shadow: inset 0 0 0 0.0625rem var(--bg-tertiary-dark-lightened-5);
      }
    }

    > header {
      margin-top: 8rem;
      max-width: 40rem;
      margin-left: auto;
      margin-right: auto;

      @media #{$tablet} {
        margin-top: 4rem;
      }

      @media #{$mobile} {
        margin-top: 0;
        text-align: center;
      }

      h2 {
        margin: 0;
      }

      span {
        color: var(--text-secondary);
      }
    }

    > section {
      max-width: 40rem;
      margin-left: auto;
      margin-right: auto;

      &:not(:last-child) {
        margin-bottom: 4rem;

        @media #{$mobile} {
          margin-bottom: 3rem;
        }
      }

      h3 {
        color: var(--text-secondary);
      }

      .input-row {
        display: flex;
        align-items: center;
        margin-bottom: 1rem;

        &.schemas {
          > span:first-child {
            align-self: flex-start;
            margin-top: 1rem;
          }
        }

        @media #{$mobile} {
          flex-wrap: wrap;
          margin-bottom: 2rem;
        }

         span:first-child {
          margin-right: auto;
          white-space: nowrap;
        }

        > :last-child:not(:only-child) {
          margin-left: 1rem;
          width: 100%;
          max-width: rem(360);

          @media #{$mobile} {
            margin-left: 0;
            margin-top: 0.5rem;
            width: 100%;
          }
        }
      }

      .input,
      .tag-input {
        margin-top: 0;
      }

      .toggle:not(:last-child) {
        margin-bottom: 1rem;
      }

      .input-group {
        > p {
          margin-top: 2rem;
          font-weight: bold;
          color: var(--text-secondary);
        }
      }

      .permissions-list {
        margin-top: 1.5rem;
      }
    }
  }

  .loader {
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    background-color: var(--bg);
    z-index: 1;

    &.dark {
      background-color: var(--bg-secondary-dark);
    }
  }

  .edit-collection,
  .edit-collection > section .input-row,
  .edit-collection > section .input-group,
  .edit-collection > section .toggle,
  .loader {

    &.v-enter-active,
    &.v-leave-active {
      transition: opacity 200ms ease;

      &.v-enter-from,
      &.v-leave-to {
        opacity: 0;
      }
    }
  }
</style>
