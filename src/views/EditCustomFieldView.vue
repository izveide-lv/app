<template>
  <div class="edit-custom-field">
    <header>
      <div class="left">
        <h1 @mouseenter="handleTitleTooltip">{{customFieldName}}</h1>
        <MbChip :color="status.color" :label="status.message" :loading="status.loading" />
      </div>
      <div class="right">
        <MbButton :dark="dark" icon="settings" :tooltip="isTablet ? 'Settings' : null" @click="showCustomFieldSettings = true">{{isTablet ? '' : 'Settings'}}</MbButton>
        <MbButton :dark="dark" icon="eye" :tooltip="isTablet ? 'Preview' : null" @click="showPreview = true">{{isTablet ? '' : 'Preview'}}</MbButton>
        <MbButton :dark="dark" :disabled="!wasChanged" icon="save" :icon-first="true" :loading="saveLoading" :tooltip="isTablet ? 'Save' : `Save <kbd>${isMac ? '⌘' : 'Ctrl'}</kbd>+<kbd>S</kbd>`" type="primary" @click="saveChanges">{{isTablet && !isMobile ? '' : 'Save'}}</MbButton>
      </div>
    </header>
    <SchemaFieldsEditor v-model="customField" :active-tab="0" :dark="dark" :project-id="$route.params.id" :tabs="[]" @update:modelValue="checkForChanges" />
    <MbModal class="edit-custom-field-modal" :dark="dark" slim title="Custom Field Settings" :visible="showCustomFieldSettings" @after-close="resetCustomFieldName" @close="showCustomFieldSettings = false">
      <MbInput v-model.lazy="newCustomFieldName" :dark="dark" :error="nameError" icon="document" label="Name" @blur="validateName" />
      <MbInput v-model.lazy="group" :dark="dark" icon="folder" label="Category" />
      <MbEditor v-model="description" :allow-new-lines="false" :dark="dark" label="Description" />
      <div class="icon-picker-wrapper">
        <span>Custom Field icon:</span>
        <MbIconPicker v-model="icon" :dark="dark" />
      </div>
      <MbHighlightBox color="negative" :dark="dark" label="Danger Zone">
        <p>Deleting a Custom Field will not remove it from Schemas that are referring to it. It will only prevent the addition of new fields of this type.</p>
        <MbButton :dark="dark" icon="trash" type="negative" @click="deleteCustomField">Delete Custom Field</MbButton>
      </MbHighlightBox>
      <template #actions>
        <MbButton :dark="dark" @click="showCustomFieldSettings = false">Cancel</MbButton>
        <MbButton :dark="dark" :disabled="Boolean(nameError)" type="primary" @click="renameCustomField">Save</MbButton>
      </template>
    </MbModal>
    <SchemaPreviewModal :dark="dark" :schema="fakeSchema" :visible="showPreview" @close="showPreview = false" />
  </div>
</template>

<script>
import { cloneDeep, isEqual } from 'lodash-es';
import { status } from 'isomorphic-git';
import slugify from '@sindresorhus/slugify';

import fs, { exists, PlainFS, joinPath, pathBasename, pathDirname } from '../fs'; // eslint-disable-line object-curly-newline, no-unused-vars
import flattenFields from '../assets/js/flattenFields';
import hasAccess from '../assets/js/hasAccess';
import isMac from '../assets/js/isMac';
import loadProject from '../assets/js/loadProject';
import prettifyEntityName from '../assets/js/prettifyEntityName';
import Store from '../store';

import isPrivilegedUser from '../mixins/isPrivilegedUser';

import SchemaFieldsEditor from '../components/utility/SchemaFieldsEditor.vue';
import SchemaPreviewModal from '../components/utility/SchemaPreviewModal.vue';

export default {
  async beforeRouteEnter(to, from, next) {
    try {
      // Check if the user is allowed to edit custom fields in the current project. To do that we currently need to load all users and the project itself if they aren’t currently loaded
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
      let customField;
      let fromBackup = false;

      if (Store.state.application.temporaryCustomFieldStorage) { // if we have a backup
        customField = Store.state.application.temporaryCustomFieldStorage;
        fromBackup = true;
        Store.commit('setAppProperty', { key: 'temporaryCustomFieldStorage', value: null });
      } else {
        customField = JSON.parse(await fs.readFile(path, 'utf8'));
      }
      const fileStatus = await status({ fs: PlainFS, dir: `/projects/${id}`, filepath: path.replace(`/projects/${id}/`, '') }); // filepath needs to be relative

      return next((vm) => {
        // needs to be an array so we can pass it to the fields editor
        vm.customField = [customField]; // eslint-disable-line no-param-reassign
        vm.description = customField.description; // eslint-disable-line no-param-reassign
        vm.group = customField.group; // eslint-disable-line no-param-reassign
        vm.icon = customField.icon; // eslint-disable-line no-param-reassign
        vm.fileStatus = fileStatus; // eslint-disable-line no-param-reassign
        vm.newCustomFieldName = prettifyEntityName(pathBasename(path)); // eslint-disable-line no-param-reassign
        if (fromBackup) vm.checkForChanges([customField]); // eslint-disable-line no-param-reassign
      });
    } catch (err) {
      if (err.code === 'ENOENT') return next({ name: 'NotFound' });
      return next({ name: 'Error', state: { code: err.code, message: err.message, name: err.name } });
    }
  },
  async beforeRouteLeave() {
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
  },
  components: {
    SchemaFieldsEditor,
    SchemaPreviewModal,
  },
  computed: {
    customFieldName() {
      if (!this.$route.params.path) return '';
      return prettifyEntityName(pathBasename(this.$route.params.path));
    },
    fakeSchema() {
      return { fields: this.customField.slice(0, 1), tabs: [{ label: 'fake tab' }] };
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
    status() {
      if (!this.fileStatus) return { color: 'warning', loading: true };
      if (this.fileStatus !== 'unmodified') return { color: 'warning', message: 'local changes' };
      return { color: 'positive', message: 'synchronised' };
    },
  },
  beforeUnmount() {
    window.removeEventListener('beforeunload', this.preventUnintentionalClose);
    window.removeEventListener('keydown', this.handleGlobalKeyUp);
  },
  data() {
    return {
      customField: [],
      description: '',
      fileStatus: null,
      forceNavigation: false,
      group: '',
      icon: '',
      nameError: '',
      newCustomFieldName: '',
      originalField: null,
      saveLoading: false,
      showCustomFieldSettings: false,
      showPreview: false,
      wasChanged: false,
    };
  },
  methods: {
    async checkForChanges(nv) {
      if (!this.originalField) this.originalField = JSON.parse(await fs.readFile(this.$route.params.path, 'utf8'));
      this.wasChanged = !isEqual(this.originalField, nv[0]) || this.group !== this.originalField.group || this.description !== this.originalField.description || this.icon !== this.originalField.icon; // we’re only interested in the first field
    },
    deleteCustomField() {
      const { id, path } = this.$route.params;

      this.showCustomFieldSettings = false;
      if (this.wasChanged) {
        const clone = cloneDeep(this.customField[0]);
        clone.description = this.description;
        clone.group = this.group;
        clone.icon = this.icon;
        this.$store.commit('setAppProperty', { key: 'temporaryCustomFieldStorage', value: clone });
      }
      this.forceNavigation = true;
      this.$store.commit('addToSoftDeleted', path);
      this.$store.commit('addToast', {
        action: () => {
          this.$store.commit('removeFromSoftDeleted', path);
          this.$router.replace({ name: 'Edit Custom Field', params: { id, path } });
        },
        actionLabel: 'Undo',
        message: `The custom field “${this.customFieldName}” was deleted`,
        onClose: async (undone) => {
          if (undone) return;

          try {
            await fs.unlink(path);
            this.$store.commit('addLocallyChangedFile', path);
            this.$store.dispatch('saveAppData');
          } catch (err) {
            this.$store.commit('addToast', { message: `Something went wrong while deleting the Custom Field: ${err.message}`, type: 'error' });
            this.$router.replace({ name: 'Edit Custom Field', params: { id, path } });
          } finally {
            this.$store.commit('removeFromSoftDeleted', path);
            this.$store.commit('setAppProperty', { key: 'temporaryCustomFieldStorage', value: null });
          }
        },
        timeout: 5000,
        type: 'warning',
      });
      this.$router.replace({ name: 'Project.Settings', params: { id }, query: { tab: 'custom-fields' } });
    },
    handleGlobalKeyUp(e) {
      if (e.key === 's' && (isMac() ? e.metaKey : e.ctrlKey) && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        this.saveChanges();
      }
    },
    handleTitleTooltip(e) {
      const tooltip = {
        message: this.customFieldName,
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
    async renameCustomField() {
      if (this.icon !== this.customField[0].icon) this.customField[0].icon = this.icon; // this is here so there’s an immediate change, the other properties get set during saveChanges

      this.checkForChanges(this.customField);
      if (this.newCustomFieldName === this.customFieldName) {
        this.showCustomFieldSettings = false;
        return;
      }
      this.validateName();
      if (this.nameError) return;

      const newName = slugify(this.newCustomFieldName, this.$store.state.currentProject.slugifyOptions || { lowercase: false, decamelize: false, preserveLeadingUnderscore: true });
      const newPath = joinPath(pathDirname(this.$route.params.path), `${newName}.json`);
      const alreadyExists = await exists(newPath);

      if (alreadyExists) {
        this.nameError = 'A Custom Field with this name already exists';
        return;
      }

      await fs.rename(this.$route.params.path, newPath);
      this.$store.commit('addLocallyChangedFile', this.$route.params.path);
      this.$store.commit('addLocallyChangedFile', newPath);
      this.showCustomFieldSettings = false;
      this.forceNavigation = true;
      this.$router.replace({ params: { id: this.$route.params.id, path: newPath } });
    },
    resetCustomFieldName() {
      this.newCustomFieldName = this.customFieldName;
      this.nameError = '';
    },
    async saveChanges() {
      if (this.customField.length > 1) {
        this.$store.commit('addToast', { message: 'Custom fields with more than one root field are not supported. Make sure they are properly grouped in a Field Group, Container, Columns or Rows field.', type: 'negative' });
        return;
      }

      this.saveLoading = true;
      await this.checkForChanges(this.customField);
      if (!this.wasChanged) return;

      const valid = this.validateCustomField();

      if (valid) {
        try {
          const newField = cloneDeep(this.customField[0]);
          if (!newField.version || typeof newField.version !== 'number') newField.version = 1;
          else newField.version += 1;
          newField.description = this.description;
          newField.group = this.group;
          newField.icon = this.icon;
          await fs.writeFile(this.$route.params.path, JSON.stringify(newField, null, 2), 'utf8');
          this.$store.commit('addToast', { message: `“${this.customFieldName}” was saved successfully`, type: 'positive' });
          this.$store.commit('addLocallyChangedFile', this.$route.params.path);
          this.$store.dispatch('saveAppData');
          this.wasChanged = false;
          this.originalField = newField;
        } catch (err) {
          this.$store.commit('addToast', { message: `Something went wrong while saving the file: ${err.message}`, type: 'error' });
        }
      } else {
        this.$store.commit('addToast', { message: 'At least one of the fields has errors, please fix them before saving.', type: 'negative' });
      }
      this.saveLoading = false;
    },
    validateCustomField() {
      const flattenedFields = flattenFields(this.customField);

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
    validateName() {
      if (!this.newCustomFieldName || !this.newCustomFieldName.trim()) this.nameError = 'A name is required';
      else this.nameError = '';
    },
  },
  mixins: [isPrivilegedUser],
  mounted() {
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

  .edit-custom-field  { // 100% minus the height of the app-header
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

    > .schema-fields-editor {
      height: calc(100% - rem(86));

      @media #{$mobile} {
        height: auto;
      }
    }
  }

  .edit-custom-field-modal {
    .input {
      width: 100%;
      margin-bottom: 1rem;

      &.v-enter-active,
      &.v-leave-active {
        transition: opacity 200ms ease;

        &.v-enter-from,
        &.v-leave-to {
          opacity: 0;
        }
      }
    }

    .icon-picker-wrapper {
      display: flex;
      align-items: center;
      margin-top: 2rem;

      > span {
        margin-right: 1rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      > .icon-picker {
        margin-left: auto;
      }
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
</style>
