<template>
  <div class="edit-schema">
    <header>
      <div class="left">
        <h1 @mouseenter="handleTitleTooltip">{{schemaName}}</h1>
        <MbChip :color="status.color" :label="status.message" :loading="status.loading" />
      </div>
      <div class="right">
        <MbButton :dark="dark" icon="settings" :tooltip="isTablet ? 'Settings' : null" @click="showSchemaSettings = true">{{isTablet ? '' : 'Settings'}}</MbButton>
        <MbButton :dark="dark" icon="eye" :tooltip="isTablet ? 'Preview' : null" @click="showPreview = true">{{isTablet ? '' : 'Preview'}}</MbButton>
        <MbButton :dark="dark" :disabled="!wasChanged" icon="save" :icon-first="true" :loading="saveLoading" :tooltip="isTablet ? 'Save' : `Save <kbd>${isMac ? '⌘' : 'Ctrl'}</kbd>+<kbd>S</kbd>`" type="primary" @click="saveChanges">{{isTablet && !isMobile ? '' : 'Save'}}</MbButton>
      </div>
    </header>
    <MbTabs v-model="activeTab" :dark="dark" :errors="tabErrors" show-add-option :tabs="cleanTabs" @add-tab="resetTabBeingEdited(); showEditTab = true" @contextmenu.prevent="handleTabContextMenu" />
    <SchemaFieldsEditor v-model="schema.fields" :active-tab="activeTab" :dark="dark" :project-id="$route.params.id" show-generate-button :tabs="cleanTabs" @generate-click="generateSchema.show = true" @update:active-tab="activeTab = $event" @update:model-value="wasChanged = true" />
    <MbModal class="edit-tab-modal" :dark="dark" slim :title="tabBeingEdited.index !== null ? 'Edit Tab' : 'Add Tab'" :visible="showEditTab" @close="showEditTab = false" @after-close="resetTabBeingEdited" @after-open="!tabBeingEdited.data.label && $refs.tabLabelInput.focus()">
      <MbInput v-model="tabBeingEdited.data.label" :dark="dark" :error="errors.tabLabel" icon="tag" label="Tab label" ref="tabLabelInput" @blur="showEditTab && validate('tabLabel')" @keyup.ctrl.enter="saveTab" />
      <MbToggle v-model="enableGroupAs" :dark="dark" :icons="['cross', 'check']" @update:model-value="!$event ? tabBeingEdited.data.groupAs = '' : $nextTick(() => $refs.tabGroupAsInput.focus())">Group fields in this tab as an object</MbToggle>
      <transition>
        <MbInput v-show="enableGroupAs" v-model="tabBeingEdited.data.groupAs" :dark="dark" :error="errors.tabGroupAs" icon="group" label="Key to group fields under" ref="tabGroupAsInput" @keyup.ctrl.enter="saveTab" @blur="validate('tabGroupAs')" />
      </transition>
      <MbHighlightBox v-if="tabBeingEdited.index !== null && schema.tabs.length > 1" color="negative" :dark="dark" label="Danger Zone">
        <p>Deleting a tab also removes all fields contained within from the Schema.</p>
        <MbButton class="delete-tab-button" :dark="dark" icon="trash" type="negative" @click="deleteTab">Delete Tab</MbButton>
      </MbHighlightBox>
      <template #actions>
        <MbButton :dark="dark" @click="showEditTab = false">Cancel</MbButton>
        <MbButton :dark="dark" :disabled="Boolean(errors.tabLabel || errors.tabGroupAs)" type="primary" @click="saveTab">{{tabBeingEdited.index !== null ? 'Save' : 'Add'}}</MbButton>
      </template>
    </MbModal>
    <MbModal class="edit-schema-modal" :dark="dark" slim title="Schema Settings" :visible="showSchemaSettings" @close="showSchemaSettings = false" @after-close="resetSchemaName">
      <MbInput v-model="newSchemaName" :dark="dark" :error="errors.schemaName" icon="document" label="Name" @blur="validate('schemaName')" />
      <p><strong>Tabs</strong></p>
      <MbSortableList v-slot="{ activeItem, item }" :items="schema.tabs" key-name="label" @itemclick="handleTabClick" @itemmove="handleTabMove">
        <div class="edit-tab-element" :class="{ 'being-dragged': activeItem === item, dark }" :data-drag-handle="isMobile ? undefined : true">
          <MbIcon data-drag-handle icon="drag-handle" />
          <span>{{item.label}}</span>
          <MbIcon icon="pencil" />
        </div>
      </MbSortableList>
      <MbButton class="add-tab-button" :dark="dark" icon="plus" type="positive" @click="resetTabBeingEdited(); showEditTab = true">Add Tab</MbButton>
      <MbHighlightBox color="negative" :dark="dark" label="Danger Zone">
        <p>Deleting a Schema that is still used for content items will cause them to not be displayed correctly. Please make sure to only delete this Schema, if you know what you’re doing.</p>
        <MbButton class="delete-tab-button" :dark="dark" icon="trash" type="negative" @click="deleteSchema">Delete Schema</MbButton>
      </MbHighlightBox>
      <template #actions>
        <MbButton :dark="dark" @click="showSchemaSettings = false">Cancel</MbButton>
        <MbButton :dark="dark" :disabled="Boolean(errors.schemaName)" type="primary" @click="renameSchema">Save</MbButton>
      </template>
    </MbModal>
    <MbModal class="generate-schema-modal" :dark="dark" title="Schema from Content" :permanent="generateSchema.loading" :visible="generateSchema.show" @close="generateSchema.show = false" @after-close="resetGenerateSchema">
      <MbFilePicker :dark="dark" :empty-state="{ noFolders: 'This directory is empty', empty: 'This directory is empty', noFiles: 'There are no eligible files in this folder' }" :filetypes="['json', 'md']" mode="file" :model-value="generateSchema.file" placeholder="Pick a content file…" :root="`/projects/${$route.params.id}`" @update:model-value="handleFilePick" />
      <MbToggle v-model="generateSchema.tabs" :dark="dark">Convert top level object fields into tabs</MbToggle>
      <div class="field-candidates">
        <h2 v-show="generateSchema.fieldCandidates.length > 0" class="h3">Field Candidates</h2>
        <FieldCandidateItem v-for="candidate in generateSchema.fieldCandidates" :children="candidate.children" :dark="dark" :field-key="candidate.key" :key="candidate.key" :localised="candidate.localised" :type="candidate.type" :type-candidates="candidate.typeCandidates" @typechange="candidate.type = $event" />
      </div>
      <template #actions>
        <MbButton :dark="dark" :disabled="generateSchema.loading" @click="generateSchema.show = false">Cancel</MbButton>
        <MbButton :dark="dark" :disabled="!generateSchema.file" :loading="generateSchema.loading" type="primary" @click="generateSchemaFromFile">Generate</MbButton>
      </template>
    </MbModal>
    <SchemaPreviewModal :dark="dark" :schema="schema" :visible="showPreview" @close="showPreview = false" />
    <MbContextMenu :dark="dark" :options="tabContextMenuOptions" :show="tabContextMenu.show" :target="tabContextMenu.target" :x="tabContextMenu.x" :y="tabContextMenu.y" @close="handleTabContextMenuClose" />
  </div>
</template>

<script>
import { cloneDeep } from 'lodash-es';
import { status } from 'isomorphic-git';
import slugify from '@sindresorhus/slugify';
import matter from 'gray-matter';

import fs, { exists, PlainFS, joinPath, pathBasename, pathDirname } from '../fs'; // eslint-disable-line object-curly-newline
import { generateFieldCandidates, generateSchemaFromCandidates } from '../assets/js/generateSchemaFromFile';
import flattenFields from '../assets/js/flattenFields';
import hasAccess from '../assets/js/hasAccess';
import isMac from '../assets/js/isMac';
import loadProject from '../assets/js/loadProject';
import prettifyEntityName from '../assets/js/prettifyEntityName';
import Store from '../store';

import isPrivilegedUser from '../mixins/isPrivilegedUser';

import FieldCandidateItem from '../components/utility/FieldCandidateItem.vue';
import SchemaFieldsEditor from '../components/utility/SchemaFieldsEditor.vue';
import SchemaPreviewModal from '../components/utility/SchemaPreviewModal.vue';

export default {
  async beforeRouteEnter(to, from, next) {
    try {
      // Check if the user is allowed to edit schemas in the current project. To do that we currently need to load all users and the project itself if they aren’t currently loaded
      if (!Store.state.currentProject.id) { // currentProject is not loaded
        const { project, users, avatarUrl } = await loadProject(to.params.id, fs);
        Store.commit('setCurrentProject', {
          ...Store.state.currentProject,
          ...project,
          users,
          avatarUrl,
        });
      }
      if (!hasAccess(Store.state.user.email, Store.state.currentProject.users, Store.state.currentProject.customRoles)) return next({ name: 'Forbidden', replace: true });

      const { id, path } = to.params;
      let schema;
      let fromBackup = false;

      if (Store.state.application.temporarySchemaStorage) { // if we have a backup
        schema = Store.state.application.temporarySchemaStorage;
        fromBackup = true;
        Store.commit('setAppProperty', { key: 'temporarySchemaStorage', value: null });
      } else {
        schema = JSON.parse(await fs.readFile(path, 'utf8'));
      }
      const fileStatus = await status({ fs: PlainFS, dir: `/projects/${id}`, filepath: path.replace(`/projects/${id}/`, '') }); // filepath needs to be relative

      return next((vm) => {
        vm.schema = { fields: [], tabs: [{ label: 'Untitled Tab', groupAs: null }], ...schema }; // eslint-disable-line no-param-reassign
        vm.fileStatus = fileStatus; // eslint-disable-line no-param-reassign
        vm.newSchemaName = prettifyEntityName(pathBasename(path)); // eslint-disable-line no-param-reassign
        if (fromBackup) vm.wasChanged = true; // eslint-disable-line no-param-reassign
      });
    } catch (err) {
      if (err.code === 'ENOENT') return next({ name: 'NotFound' });
      return next({ name: 'Error', state: { code: err.code, message: err.message, name: err.name } });
    }
  },
  async beforeRouteLeave() {
    // if (this.forceNavigation) {
    //   next();
    //   return;
    // }
    // if (this.wasChanged) {
    //   this.$store.commit('addToast', {
    //     action: next,
    //     actionLabel: 'Discard changes',
    //     message: 'You have unsaved changes, do you want to discard them?',
    //     type: 'warning',
    //   });
    // } else next();
    if (this.forceNavigation) return true;
    if (this.wasChanged) {
      // Massive HACK, but the old way of just running next() as a Toast-Callback is beyond broken in router-next (I’ve created an issue, but apparently it’s the desired behavior)
      let resolvePromise;

      this.$store.commit('addToast', {
        action: () => {
          resolvePromise(true);
        },
        actionLabel: 'Discard changes',
        message: 'You have unsaved changes, do you want to discard them?',
        onClose: (confirmed) => {
          if (confirmed) return;
          resolvePromise(false);
        },
        timeout: 5000,
        type: 'warning',
      });

      const result = await new Promise((resolve) => {
        resolvePromise = resolve;
      });
      return result;
    } else return true; // eslint-disable-line no-else-return
    // return true;
  },
  beforeUnmount() {
    window.removeEventListener('beforeunload', this.preventUnintentionalClose);
    window.removeEventListener('keydown', this.handleGlobalKeyUp);
  },
  components: {
    FieldCandidateItem,
    SchemaFieldsEditor,
    SchemaPreviewModal,
  },
  computed: {
    cleanTabs() {
      if (!this.schema.tabs) return [];
      return this.schema.tabs.map((tab) => tab.label);
    },
    isMac() {
      return isMac();
    },
    isMobile() {
      return this.$store.state.application.mobile;
    },
    isTablet() {
      return this.$store.state.application.tablet;
    },
    schemaName() {
      if (!this.$route.params.path) return '';
      return prettifyEntityName(pathBasename(this.$route.params.path));
    },
    status() {
      if (!this.fileStatus) return { color: 'warning', loading: true };
      if (this.fileStatus !== 'unmodified') return { color: 'warning', message: 'local changes' };
      return { color: 'positive', message: 'synchronised' };
    },
    tabContextMenuOptions() {
      const options = [
        {
          action: () => {
            if (this.tabBeingEdited.data.groupAs) this.enableGroupAs = true;
            this.showEditTab = true;
          },
          label: 'Edit',
          icon: 'pencil',
        },
      ];

      if (this.schema.tabs && this.schema.tabs.length > 1) options.push({ action: this.deleteTab, label: 'Delete', icon: 'trash', type: 'negative' }); // eslint-disable-line object-curly-newline
      return options;
    },
    tabErrors() {
      if (!this.schema.fields || this.schema.fields.length === 0) return new Set();
      const flatFields = flattenFields(this.schema.fields);
      return flatFields.reduce((acc, field) => {
        let tabIndex = this.cleanTabs.indexOf(field.tab);
        if (tabIndex === -1) tabIndex = 0; // fields without a tab are shown in the firs tab

        if (field.errors) acc.add(tabIndex);
        return acc;
      }, new Set());
    },
  },
  data() {
    return {
      activeTab: -1,
      enableGroupAs: false,
      errors: {
        schemaName: '',
        tabGroupAs: '',
        tabLabel: '',
      },
      fieldErrors: {
        key: '',
        label: '',
        regex: '',
      },
      fileStatus: null,
      forceNavigation: false,
      generateSchema: {
        fieldCandidates: [],
        file: null,
        loading: false,
        show: false,
        tabs: false,
      },
      initialised: false,
      newSchemaName: '',
      saveLoading: false,
      schema: {},
      showEditTab: false,
      showPreview: false,
      showSchemaSettings: false,
      tabBeingEdited: {
        index: null,
        data: {
          label: '',
          groupAs: '',
        },
      },
      tabContextMenu: {
        show: false,
        target: null,
        x: 0,
        y: 0,
      },
      wasChanged: false,
    };
  },
  methods: {
    changeTabOfFields(fields, newTab) {
      fields.forEach((field) => {
        field.tab = newTab; // eslint-disable-line no-param-reassign
        if (Array.isArray(field.value)) this.changeTabOfFields(field.value, newTab);
      });
    },
    deleteSchema() {
      const { id, path } = this.$route.params;

      this.showSchemaSettings = false;
      if (this.wasChanged) this.$store.commit('setAppProperty', { key: 'temporarySchemaStorage', value: cloneDeep(this.schema) });
      this.forceNavigation = true;
      this.$store.commit('addToSoftDeleted', path);
      this.$store.commit('addToast', {
        action: () => {
          this.$store.commit('removeFromSoftDeleted', path);
          this.$router.replace({ name: 'Edit Schema', params: { id, path } });
        },
        actionLabel: 'Undo',
        message: `The schema “${this.schemaName}” was deleted`,
        onClose: async (undone) => {
          if (undone) return;

          try {
            await fs.unlink(path);
            this.$store.commit('addLocallyChangedFile', path);
            this.$store.dispatch('saveAppData');
          } catch (err) {
            this.$store.commit('addToast', { message: `Something went wrong while deleting the schema: ${err.message}`, type: 'error' });
            this.$store.commit('removeLocallyChangedFile', path);
            this.$router.replace({ name: 'Edit Schema', params: { id, path } });
          } finally {
            this.$store.commit('removeFromSoftDeleted', path);
            this.$store.commit('setAppProperty', { key: 'temporarySchemaStorage', value: null });
          }
        },
        timeout: 5000,
        type: 'warning',
      });
      this.$router.replace({ name: 'Project.Settings', params: { id }, query: { tab: 'schemas' } });
    },
    deleteTab() {
      if (this.tabBeingEdited.index === null || this.schema.tabs.length === 1) return;
      const { data: backup, index } = this.tabBeingEdited;
      const lastActiveTab = this.activeTab;

      this.schema.tabs.splice(this.tabBeingEdited.index, 1);

      this.showEditTab = false;
      this.$store.commit('addToast', {
        action: () => {
          this.schema.tabs.splice(index, 0, backup);
          this.activeTab = lastActiveTab;
        },
        actionLabel: 'Undo',
        message: `The tab “${backup.label}” and all its fields were deleted`,
        onClose: (undone) => {
          if (undone) return;
          this.schema.fields = this.schema.fields.filter((field) => field.tab !== backup.label);
        },
        timeout: 5000,
        type: 'warning',
      });
      this.wasChanged = true;
    },
    generateSchemaFromFile() {
      this.generateSchema.loading = true;
      this.schema = generateSchemaFromCandidates(this.generateSchema.fieldCandidates, this.generateSchema.tabs);
      this.wasChanged = true;
      this.generateSchema.loading = false;
      this.generateSchema.show = false;
    },
    async handleFilePick(file) {
      this.generateSchema.loading = true;
      try {
        const rawFile = await fs.readFile(file, 'utf8');
        const fileContent = file.endsWith('.json') ? JSON.parse(rawFile) : { ...matter(rawFile).data, content: '### Some fake markdown\n\n' }; // so the content field can be generated as Rich Text
        this.generateSchema.fieldCandidates = generateFieldCandidates(fileContent);
      } catch (err) {
        if (err.name === 'SyntaxError') {
          this.$store.commit('addToast', { message: 'The file you selected is not a valid JSON file', type: 'error' });
          this.generateSchema.loading = false;
          return;
        }
        this.$store.commit('addToast', { message: `Something went wrong while reading the selected file: ${err.message}`, type: 'error' });
      }
      this.generateSchema.loading = false;
      this.generateSchema.file = file;
    },
    handleGlobalKeyUp(e) {
      if (e.key === 's' && (isMac() ? e.metaKey : e.ctrlKey) && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        this.saveChanges();
      }
    },
    handleTabClick(index) {
      const data = this.schema.tabs[index];
      this.tabBeingEdited = {
        index,
        data: { ...data },
      };
      if (data.groupAs) this.enableGroupAs = true;
      this.showEditTab = true;
    },
    handleTabContextMenu(e) {
      if (!e.target || typeof e.target.dataset.index === 'undefined') return;

      const index = Number.parseInt(e.target.dataset.index, 10);
      const data = this.schema.tabs[index];
      this.tabBeingEdited = {
        index,
        data: { ...data },
      };

      this.tabContextMenu.target = e.target;
      this.tabContextMenu.x = e.clientX;
      this.tabContextMenu.y = e.clientY;
      this.tabContextMenu.show = true;
    },
    async handleTabContextMenuClose() {
      await this.$nextTick(); // wait a tick so the context menu handler has time to fire
      // this.resetTabBeingEdited();
      this.tabContextMenu.target = null;
      this.tabContextMenu.x = 0;
      this.tabContextMenu.y = 0;
      this.tabContextMenu.show = false;
    },
    handleTabMove({ activeItem, index, isBottomHalf }) {
      let newIndex;
      const currentIndex = this.schema.tabs.indexOf(activeItem);

      if ((currentIndex < index && isBottomHalf) || (currentIndex > index && !isBottomHalf)) newIndex = index;
      else if (currentIndex < index && !isBottomHalf) newIndex = Math.max(0, index - 1);
      else if (currentIndex > index && isBottomHalf) newIndex = Math.min(index + 1, this.schema.tabs.length - 1);

      if (currentIndex === this.activeTab) this.activeTab = newIndex;
      else if (currentIndex > this.activeTab && newIndex <= this.activeTab) this.activeTab += 1;
      else if (currentIndex < this.activeTab && newIndex >= this.activeTab) this.activeTab -= 1;

      this.schema.tabs.splice(newIndex, 0, this.schema.tabs.splice(currentIndex, 1)[0]);

      this.wasChanged = true;
    },
    handleTitleTooltip(e) {
      const tooltip = {
        message: this.schemaName,
        target: e.currentTarget,
      };
      this.$store.commit('setTooltip', tooltip);
    },
    preventUnintentionalClose(e) {
      if (this.forceNavigation) return;
      if (this.wasChanged) {
        this.$store.commit('addToast', {
          message: 'You have unsaved changes, save them before exiting if you don’t want to lose them.',
          type: 'warning',
          timeout: 10000,
        });
        e.preventDefault();
        e.returnValue = ''; // for chrome
      }
    },
    async renameSchema() {
      if (this.newSchemaName === this.schemaName) {
        this.showSchemaSettings = false;
        return;
      }
      this.validate('schemaName');
      if (this.errors.schemaName) return;

      const newName = slugify(this.newSchemaName, this.$store.state.currentProject.slugifyOptions || { lowercase: false, decamelize: false, preserveLeadingUnderscore: true });
      const newPath = joinPath(pathDirname(this.$route.params.path), `${newName}.json`);
      const alreadyExists = await exists(newPath);

      if (alreadyExists) {
        this.errors.schemaName = 'A schema with this name already exists';
        return;
      }

      await fs.rename(this.$route.params.path, newPath);
      this.$store.commit('removeLocallyChangedFile', this.$route.params.path);
      this.$store.commit('addLocallyChangedFile', newPath);
      this.showSchemaSettings = false;
      this.forceNavigation = true;
      this.$router.replace({ params: { id: this.$route.params.id, path: newPath } });
    },
    resetGenerateSchema() {
      this.generateSchema = {
        fieldCandidates: [],
        file: null,
        loading: false,
        tabs: false,
        show: false,
      };
    },
    resetSchemaName() {
      this.newSchemaName = this.schemaName;
      this.errors.schemaName = '';
    },
    resetTabBeingEdited() {
      this.tabBeingEdited = {
        index: null,
        data: {
          label: '',
          groupAs: '',
        },
      };
      this.enableGroupAs = false;
      this.errors.tabLabel = '';
      this.errors.tabGroupAs = '';
    },
    async saveChanges() {
      this.saveLoading = true;
      const valid = this.validateSchema();

      if (valid) {
        try {
          await fs.writeFile(this.$route.params.path, JSON.stringify(this.schema, null, 2), 'utf8');
          this.$store.commit('addToast', { message: `“${this.schemaName}” was saved successfully`, type: 'positive' });
          this.$store.commit('addLocallyChangedFile', this.$route.params.path);
          this.$store.dispatch('saveAppData');
          this.wasChanged = false;
        } catch (err) {
          this.$store.commit('addToast', { message: `Something went wrong while saving the file: ${err.message}`, type: 'error' });
        }
      } else {
        this.$store.commit('addToast', { message: 'At least one of the fields has errors, please fix them before saving.', type: 'negative' });
      }
      this.saveLoading = false;
    },
    saveTab() {
      this.validate('tabLabel');
      this.validate('tabGroupAs');
      if (this.errors.tabLabel || this.errors.tabGroupAs) return;

      const cleanTab = {
        label: this.tabBeingEdited.data.label.trim(),
        groupAs: this.tabBeingEdited.data.groupAs || null,
      };

      if (this.tabBeingEdited.index !== null) {
        const { label: oldLabel } = this.schema.tabs[this.tabBeingEdited.index];
        this.changeTabOfFields(this.schema.fields.filter((field) => field.tab === oldLabel), cleanTab.label);
        this.schema.tabs.splice(this.tabBeingEdited.index, 1, cleanTab);
        const lastActiveTab = this.activeTab;
        this.$nextTick(() => { this.activeTab = lastActiveTab; });
      } else {
        this.schema.tabs.push(cleanTab);
        this.activeTab = this.schema.tabs.length - 1;
      }
      this.showEditTab = false;
      this.wasChanged = true;
    },
    validate(field) {
      let error = '';
      switch (field) {
        case 'schemaName':
          if (!this.newSchemaName || !this.newSchemaName.trim()) error = 'A name is required';
          break;
        case 'tabLabel':
          if (!this.tabBeingEdited.data.label) error = 'A label is required';
          else if (
            ((this.tabBeingEdited.index !== null && this.tabBeingEdited.data.label !== this.schema.tabs[this.tabBeingEdited.index].label) || this.tabBeingEdited.index === null)
            && this.schema.tabs.find((tab) => tab.label === this.tabBeingEdited.data.label)) error = 'A tab with this label already exists';
          break;
        case 'tabGroupAs':
          if (
            this.tabBeingEdited.data.groupAs
            && ((this.tabBeingEdited.index !== null && this.tabBeingEdited.data.groupAs !== this.schema.tabs[this.tabBeingEdited.index].groupAs) || this.tabBeingEdited.index === null)
            && this.schema.tabs.find((tab) => tab.groupAs === this.tabBeingEdited.data.groupAs)) error = 'A tab with this key already exists';
          break;
        default:
          // no op
      }
      this.errors[field] = error;
    },
    validateSchema() {
      const flattenedFields = flattenFields(this.schema.fields);

      for (let index = 0; index < flattenedFields.length; index += 1) {
        const field = flattenedFields[index];
        if (field.errors && field.errors.size > 0) return false;
        if (!field.key) {
          field.errors = new Map(['key', 'A key is required']);
          return false;
        }
        if (field.errors) delete field.errors; // clear empty errors properties
      }
      return true;
    },
  },
  mixins: [isPrivilegedUser],
  mounted() {
    this.$nextTick(() => { // needed so the active indicator looks right
      this.activeTab = 0;
      this.initialised = true;
    });

    window.addEventListener('keydown', this.handleGlobalKeyUp);
  },
  props: {
    dark: Boolean,
  },
  watch: {
    isPrivilegedUser(nv) {
      if (!nv) this.$router.replace({ name: 'Project' });
    },
    wasChanged(nv) {
      if (nv) {
        window.addEventListener('beforeunload', this.preventUnintentionalClose);
        if (this.fileStatus === 'unmodified') this.fileStatus = '*modified';
      } else {
        window.removeEventListener('beforeunload', this.preventUnintentionalClose);
      }
    },
  },
};
</script>

<style lang="scss" scoped>
  @use '../assets/styles/breakpoints' as *;

  .edit-schema  {
    height: calc(100vh - rem(116));
    user-select: none;

    @media #{$tablet} {
      height: calc(100vh - rem(84));
    }

    @media #{$mobile} {
      height: auto;
    }

    > header {
      display: flex;
      padding: 0 2rem 2rem 2rem;

      @media #{$tablet} {
        padding: 1rem;
        padding-top: 0;
      }

      @media #{$mobile} {
        display: block;
      }

      .left {
        display: flex;
        align-items: center;
        margin-right: auto;
        overflow: hidden;

        @media #{$tablet} {
          margin-left: 1rem;
        }

        @media #{$mobile} {
          margin-bottom: 1rem;
          margin-left: 0;
        }

        h1 {
          margin: 0;
          margin-right: 1.5rem;
          margin-left: 1rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;

          @media #{$tablet} {
            margin-left: 0;
            margin-right: 1rem;
          }

          @media #{$mobile} {
            font-size: 1.5rem;
            margin-right: 0.5rem;
          }
        }

        .chip {
          flex-shrink: 0;

          @media #{$mobile} {
            order: -1;
            width: 1rem;
            height: 1rem;
            padding: 0;
            margin-right: 0.5rem;

            &:deep(span) {
              display: none;
            }
          }
        }
      }

      .right {
        display: flex;
        align-items: center;
        overflow: hidden;
        flex-shrink: 0;
        margin-left: 1rem;
        padding-bottom: 0.125rem;

        @media #{$mobile} {
          margin-left: 0;
        }

        .button {
          &:not(:last-child) {
            margin-right: 1rem;
          }
        }
      }
    }

    .tabs {
      position: sticky;
      top: 0;
      z-index: 1;
    }
  }

  .edit-tab-modal,
  .edit-schema-modal {
    .input {
      width: 100%;

      &.v-enter-active,
      &.v-leave-active {
        transition: opacity 200ms ease;

        &.v-enter-from,
        &.v-leave-to {
          opacity: 0;
        }
      }
    }

    .toggle {
      margin-top: 1.5rem;
    }

    .highlight-box {
      margin-top: 2rem;

      .button {
        display: flex;
        margin-left: auto;

        @media #{$mobile} {
          width: 100%;
        }
      }
    }
  }

  .edit-schema-modal {
    .input {
      margin-bottom: 1rem;
    }

    .sortable-list {
      &:deep(.drag-item) {
        margin-bottom: 0.5rem;
      }
    }

    .add-tab-button {
      display: flex;
      margin-left: auto;

      @media #{$mobile} {
        width: 100%;
      }

      &.dark {
        margin-top: 0.75rem;
      }
    }
  }

  .generate-schema-modal {
    .file-picker {
      display: flex;
      margin-bottom: 2rem;
    }

    .field-candidates {
      .field-candidate-item {
        margin-bottom: 0.125rem;

        &:not(:last-child) {
          margin-bottom: 1rem;
        }
      }
    }
  }

  // needs to be toplevel so dragging clone can have its styles
  .edit-tab-element {
    padding: 1rem;
    box-shadow: inset 0 0 0 0.0625rem var(--text-tertiary);
    border-radius: var(--radius-m);
    display: flex;
    align-items: center;
    background-color: var(--bg);
    cursor: pointer;

    &:hover {
      background-color: var(--bg-secondary);
    }

    &.dark {
      background-color: var(--bg-secondary-dark);
      box-shadow: inset 0 0 0 0.0625rem var(--bg-tertiary-dark);
    }

    .icon {
      flex-shrink: 0;

      &:first-child {
        margin-right: 1rem;
        cursor: move;
      }

      &:last-child {
        margin-right: 0;
      }
    }

    span {
      margin-right: auto;
      text-overflow: ellipsis;
      white-space: nowrap;
      overflow: hidden;
    }

    &.being-dragged {
      opacity: 0.25;
    }
  }
</style>
