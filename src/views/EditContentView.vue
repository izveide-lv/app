<template>
  <div class="edit-content">
    <header>
      <div class="left">
        <h1 @mouseenter="handleTitleTooltip">{{contentName}}</h1>
        <MbChip :color="status.color" :label="status.message" :loading="status.loading" />
        <transition>
          <MbChip v-if="!isTablet && isDraft" label="draft" />
        </transition>
      </div>
      <div class="right">
        <MbToggle v-if="draftsDir && canToggleDraft" v-model="isDraft" :dark="dark" :disabled="isDraft && (!content.___mb_schema || errors.fields.size > 0)" :icons="['cross', 'check']">Draft</MbToggle>
        <MbButton :class="{ 'push-right': draftsDir }" :dark="dark" icon="settings" :tooltip="isTablet ? 'Settings' : null" @click="showSettings = true">{{isTablet ? '' : 'Settings'}}</MbButton>
        <MbButton v-if="canPreview" :dark="dark" :disabled="noSchema" :icon="showPreview ? 'hide' : 'eye'" :tooltip="isTablet ? showPreview ? previewInNewTab ? 'Hide Preview Controls' : 'Hide Preview' : 'Preview' : null" @click.left="togglePreview" @click.middle="openPreviewInNewTab">{{isTablet ? '' : showPreview ? previewInNewTab ? 'Hide Preview Controls' : 'Hide Preview' : 'Preview'}}</MbButton>
        <MbButton :dark="dark" :disabled="!wasChanged || (errors.fields.size > 0 && !isDraft)" icon="save" :icon-first="true" :loading="saveLoading" :tooltip="isTablet ? 'Save' : `Save <kbd>${isMac ? '⌘' : 'Ctrl'}</kbd>+<kbd>S</kbd>`" type="primary" @click="saveChanges">{{isTablet ? '' : 'Save'}}</MbButton>
      </div>
    </header>
    <MbTabs v-if="schema.tabs && schema.tabs.length > 1" v-model="activeTab" :dark="dark" :errors="tabErrors" :tabs="cleanTabs" />
    <TabContent :dark="dark" :padded="!showPreview" :show-split="showSplit" @split-close="showSplit = false" @split-closed="handleSplitClosed">
      <transition mode="out-in">
        <div v-if="initialised && noSchema" class="no-schema" :class="{ dark }">
          <h2>No Schema</h2>
          <p>This {{contentType}} doesn’t have a valid Schema assigned to it yet. Please select one from the list below.</p>
          <ul>
            <li v-for="schema in allowedSchemas" :key="schema.value">
              <MbButton :dark="dark" icon="document" @click="loadAndAssignSchema(schema.value)">{{schema.label}}</MbButton>
            </li>
          </ul>
        </div>
        <MbFieldsEditor v-else v-model="contentForTab" v-model:error="errors.fields" v-model:split-visible="showSplit" :class="{ 'preview-open': showPreview && !isMobile }" :compact="!showPreview" :dark="dark" :fields="fieldsForTab" :key="activeTab" :languages="contentLanguages" :split-target="!showPreview ? '#splitTarget' : null" @image-load="addPreviewImage" />
      </transition>

      <template #right="{ isModal }">
        <div v-if="showPreview" class="preview">
          <div v-if="errors.preview === 'offline'" class="error-state" :class="{ dark }">
            <MbIcon icon="offline-alt" />
            <h2>Could not open preview…</h2>
            <p>It looks like you are offline at the moment. Please establish an internet connection, so the preview can be displayed.</p>
            <MbButton :dark="dark">Try again</MbButton>
          </div>
          <div v-else-if="previewInNewTab" class="error-state" :class="{ dark }">
            <MbIcon icon="open-new-window" />
            <h2>Preview open in a different tab</h2>
            <p>It looks like the preview is open in a different tab or window.</p>
            <MbButton :dark="dark" @click="closeOpenPreview">Close Tab</MbButton>
            <MbButton :dark="dark" @click="focusOpenPreview" type="primary">Focus Tab</MbButton>
          </div>
          <teleport v-else :disabled="!fullscreenPreview" to="body">
            <div class="preview-frame" :class="{ fullscreen: fullscreenPreview, 'mobile-preview': mobilePreview }">
              <header :class="{ dark }">
                <MbButton :dark="dark" icon="open-new-window" tooltip="Open preview in new tab / window" @click="openPreviewInNewTab" />
                <MbButton :dark="dark" :icon="fullscreenPreview ? 'fullscreen-reverse' : 'fullscreen'" tooltip="Toggle fullscreen" @click="toggleFullscreenPreview" />
                <MbButton v-if="!isMobile" :dark="dark" :icon="mobilePreview ? 'monitor' : 'phone'" tooltip="Toggle mobile preview" @click="mobilePreview = !mobilePreview" />
                <MbButton v-if="canShowComments" :dark="dark" icon="comment-stack-alt" :loading="previewCommentsLoading" tooltip="Toggle comments" :type="previewCommentsActive ? 'primary' : null" @click="togglePreviewComments" />
              </header>
              <transition>
                <MbLoader v-if="!previewConnected" :class="{ dark }" />
              </transition>
              <iframe :class="{ mobile: mobilePreview }" name="preview" ref="preview" referrer="no-referrer" sandbox="allow-same-origin allow-scripts" :src="actualPreviewUrl" @load="handlePreviewLoaded" />
            </div>
          </teleport>
        </div>
        <div v-else :class="{ 'in-modal': isModal }" id="splitTarget" />
      </template>
    </TabContent>
    <MbModal class="edit-content-modal" :dark="dark" slim title="Content Settings" :visible="showSettings" @close="showSettings = false" @after-close="resetContentName">
      <MbInput v-model="newContentName" :dark="dark" :error="errors.name" icon="document" label="Name" @blur="validateNewContentName" />
      <div class="select-wrapper">
        <span>Content Schema:</span>
        <MbSelect :dark="dark" :disabled="allowedSchemas.length < 2" :model-value="newContentSchema || content.___mb_schema" :options="allowedSchemas" placeholder="Select a Schema…" @update:model-value="newContentSchema = $event" />
      </div>
      <MbHighlightBox v-if="canDelete" color="negative" :dark="dark" label="Danger Zone">
        <MbButton class="delete-button" :dark="dark" icon="trash" type="negative" @click="deleteContent">Delete “{{contentName}}”</MbButton>
      </MbHighlightBox>
      <template #actions>
        <MbButton :dark="dark" @click="showSettings = false">Cancel</MbButton>
        <MbButton :dark="dark" :disabled="Boolean(errors.name)" type="primary" @click="saveSettings">Save</MbButton>
      </template>
    </MbModal>
    <MbPopover class="add-preview-comment" :dark="dark" no-content-padding use-capture-on-outside-click :visible="addPreviewCommentPopover.visible" :x="addPreviewCommentPopover.x" :y="addPreviewCommentPopover.y" @after-close="handleAddPreviewCommentPopoverClosed" @close="addPreviewCommentPopover.visible = false">
      <template #header>
        <div class="header-wrapper">
          <span v-if="addPreviewCommentPopover.comment" class="author"><strong>{{addPreviewCommentPopover.comment.author}}</strong></span>
          <span v-if="addPreviewCommentPopover.comment" class="timestamp">{{formattedTimestamp(addPreviewCommentPopover.comment.created)}}</span>
        </div>
      </template>
      <MbEditor v-if="addPreviewCommentPopover.comment" v-model="addPreviewCommentPopover.comment.content" :dark="dark" :format-options="{}" :formats="{ block: ['blockquote', 'orderedList', 'unorderedList'], inline: ['code', 'em', 'strike', 'strong'] }"  output-format="html" placeholder="Your comment…" ref="commentEditor" @keyup.ctrl.enter="addPreviewComment(addPreviewCommentPopover.comment, true)" />
      <template #footer>
        <MbButton :dark="dark" @click="addPreviewCommentPopover.visible = false">Cancel</MbButton>
        <MbButton :dark="dark" :disabled="!addPreviewCommentPopover.comment || !addPreviewCommentPopover.comment.content || addPreviewCommentPopover.comment.content === '<p></p>'" :loading="addPreviewCommentPopover.loading" icon="plus" type="positive" @click="addPreviewComment(addPreviewCommentPopover.comment, true)">Add Comment</MbButton>
      </template>
    </MbPopover>
    <PreviewCommentThread :can-comment="canComment" :comments="previewCommentThreadPopover.comments" :dark="dark" :visible="previewCommentThreadPopover.visible" :x="previewCommentThreadPopover.x" :y="previewCommentThreadPopover.y" @add-reply="addPreviewComment($event)" @after-close="handlePreviewCommentThreadPopoverClosed" @close="previewCommentThreadPopover.visible = false" @delete-comment="deletePreviewComment($event.id, $event.toplevel)" @update-comment="updatePreviewComment($event.id, $event.changes)" />
  </div>
</template>

<script>
import {
  cloneDeep as _cloneDeep, debounce, get as _get, set as _set, isEqual,
} from 'lodash-es';
import { status } from 'isomorphic-git';
import pluralize from 'pluralize';
import slugify from '@sindresorhus/slugify';
import matter from 'gray-matter';
import { formatISO } from 'date-fns';

import fs, { exists, PlainFS, joinPath, mkdirp, pathBasename, pathDirname, rmrf } from '../fs'; // eslint-disable-line object-curly-newline

import assembleUrlFromTemplate from '../assets/js/assembleUrlFromTemplate';
import formatTimestamp from '../assets/js/formatTimestamp';
import generateDefaultContentFromSchema from '../assets/js/generateDefaultContentFromSchema';
import generateDefaultFilePathFields from '../assets/js/generateDefaultFilePathFields';
import getFieldsByPredicate from '../assets/js/getFieldsByPredicate';
import getContentLanguages from '../assets/js/getContentLanguages';
import isMac from '../assets/js/isMac';
import loadProject from '../assets/js/loadProject';
import prettifyEntityName from '../assets/js/prettifyEntityName';
import validateContent from '../assets/js/validateContent';
import Store from '../store';

import TabContent from '../components/utility/TabContent.vue';
import PreviewCommentThread from '../components/utility/PreviewCommentThread.vue';

function hasAccess(role, permissions) {
  if (!role || !permissions) return false;
  if (permissions.everybody && (permissions.everybody.includes('editContent') || permissions.everybody.includes('everything'))) return true;
  if (permissions[role] && (permissions[role].includes('editContent') || permissions[role].includes('everything'))) return true;
  return false;
}

// Features that the live preview can optionally support, used to validate the "supports"
const PREVIEW_FEATURES = ['comments'];

export default {
  async beforeRouteEnter(to, from, next) {
    const { collection: collectionFile, id, path } = to.params;

    try {
      // Check if the user is allowed to edit content in the current project. To do that we currently need to load all users and the project itself if they aren’t currently loaded
      if (!Store.state.currentProject.id) { // currentProject is not loaded
        const { project, users, avatarUrl } = await loadProject(id, fs);
        Store.commit('setCurrentProject', {
          ...Store.state.currentProject,
          ...project,
          users,
          avatarUrl,
        });
      }

      const collection = JSON.parse(await fs.readFile(joinPath('/projects', Store.state.currentProject.id, '.mattrbld', 'collections', collectionFile), 'utf8'));
      let canAccess;

      if (!Store.getters.userInCurrentProject || (!path.startsWith(joinPath('/projects', id, collection.dir)) && !path.startsWith(joinPath('/projects', id, Store.state.currentProject.draftsDir, pathBasename(collection.dir))))) canAccess = false; // somebody might try to pass a collection where they have edit rights, so we make sure the collection dir matches the content path
      else canAccess = hasAccess(Store.getters.userInCurrentProject.role, collection.permissions);

      if (!canAccess) return next({ name: 'Forbidden', replace: true });

      // load the content of the file
      let content;
      let fromBackup = false;

      if (Store.state.application.temporaryContentStorage) { // if we have a backup
        content = Store.state.application.temporaryContentStorage;
        fromBackup = true;
        Store.commit('setAppProperty', { key: 'temporaryContentStorage', value: null });
      } else {
        const rawFile = await fs.readFile(path, 'utf8');
        if (collection.type === 'json') content = JSON.parse(rawFile);
        else if (collection.type === 'md') {
          const { content: fileContent, data } = matter(rawFile);
          content = { ...data, content: fileContent.trim() }; // fileContent might have leading / trailing newline characters which we’ll strip out here
        }
      }
      const fileStatus = await status({ fs: PlainFS, dir: `/projects/${id}`, filepath: path.replace(`/projects/${id}/`, '') }); // filepath needs to be relative

      // check if the content already has a Schema assigned and load that as well
      let schema;
      if (content.___mb_schema) {
        if (collection.schemas.includes(content.___mb_schema)) {
          try {
            schema = JSON.parse(await fs.readFile(joinPath('/projects', id, content.___mb_schema), 'utf8'));
          } catch (err) {
            if (err.code !== 'ENOENT') throw err;
            else Store.commit('addToast', { message: `The Schema “${prettifyEntityName(pathBasename(content.___mb_schema))}” could not be found in this project`, type: 'warning' });
          }
        } else Store.commit('addToast', { message: `The Schema “${prettifyEntityName(pathBasename(content.___mb_schema))}” is not allowed in this Collection`, type: 'warning' });
      }

      return next((vm) => {
        vm.collection = collection; // eslint-disable-line no-param-reassign
        vm.content = content; // eslint-disable-line no-param-reassign
        vm.fileStatus = fileStatus; // eslint-disable-line no-param-reassign
        vm.newContentName = prettifyEntityName(pathBasename(path)); // eslint-disable-line no-param-reassign

        if (schema) {
          vm.schema = schema; // eslint-disable-line no-param-reassign

          // OPTIMIZE: it seems a bit wasteful to iterate through all schemas and content values multiple times even when nothing has changed in the Schema, but there’s no way to know when the Schema has changed and the defaults in this file need updating
          const defaults = generateDefaultContentFromSchema(schema, vm.filepath);
          vm.content = { ...content, ...vm.assignSchemaDefaults(content, defaults) }; // eslint-disable-line no-param-reassign
          vm.findAndSetFilepathIds(schema);
          vm.findAndSetTemplateIds(schema);
        }

        if (fromBackup) vm.wasChanged = true; // eslint-disable-line no-param-reassign

        if (!schema && !content.___mb_schema && collection.schemas && collection.schemas.length === 1) {
          const firstSchema = collection.schemas[0];
          vm.loadAndAssignSchema(firstSchema);
          vm.$store.commit('addToast', { message: `Automatically assigned the Schema “${prettifyEntityName(pathBasename(firstSchema))}” to this ${vm.contentType}`, type: 'positive' });
        }
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
  beforeUnmount() {
    if (this.previewInNewTab) this.closeOpenPreview();
    if (this.previewConnected) window.removeEventListener('message', this.handlePreviewMessage, false);
    window.removeEventListener('beforeunload', this.preventUnintentionalClose);
    window.removeEventListener('keydown', this.handleGlobalKeyUp);
  },
  components: {
    TabContent,
    PreviewCommentThread,
  },
  computed: {
    allowedSchemas() {
      if (!this.collection.schemas) return [];
      return this.collection.schemas.map((schema) => ({ label: prettifyEntityName(pathBasename(schema)), value: schema }));
    },
    canComment() {
      const { disableComments, permissions } = this.collection;
      if (disableComments || !this.canPreview || !this.previewSupports.includes('comments')) return false;
      if (!this.currentUser) return false;
      if (!this.currentUser.role || !permissions) return false;
      if (permissions.everybody && (permissions.everybody.includes('comment') || permissions.everybody.includes('everything'))) return true;
      if (permissions[this.currentUser.role] && (permissions[this.currentUser.role].includes('comment') || permissions[this.currentUser.role].includes('everything'))) return true;
      return false;
    },
    canDelete() {
      const { permissions } = this.collection;
      if (!this.currentUser) return false;
      if (!this.currentUser.role || !permissions) return false;
      if (permissions.everybody && (permissions.everybody.includes('deleteContent') || permissions.everybody.includes('everything'))) return true;
      if (permissions[this.currentUser.role] && (permissions[this.currentUser.role].includes('deleteContent') || permissions[this.currentUser.role].includes('everything'))) return true;
      return false;
    },
    canPreview() {
      return this.previewUrl && !this.collection.disablePreview;
    },
    canShowComments() {
      const { disableComments } = this.collection;
      if (disableComments || !this.canPreview || !this.previewSupports.includes('comments')) return false;
      return true;
    },
    canToggleDraft() {
      const { permissions } = this.collection;
      if (!this.currentUser) return false;
      if (!this.currentUser.role || !permissions) return false;
      if (permissions.everybody && (permissions.everybody.includes('publishDrafts') || permissions.everybody.includes('everything'))) return true;
      if (permissions[this.currentUser.role] && (permissions[this.currentUser.role].includes('publishDrafts') || permissions[this.currentUser.role].includes('everything'))) return true;
      return false;
    },
    cleanTabs() {
      if (!this.schema.tabs) return [];
      return this.schema.tabs.map((tab) => tab.label);
    },
    commentsDir() {
      if (!this.collection.dir) return joinPath(this.projectDir, '.mattrbld', 'comments');
      const path = joinPath(this.projectDir, '.mattrbld', 'comments', this.filepath.replace(this.collection.dir, pathBasename(this.collection.dir)));
      return path.substring(0, path.lastIndexOf('.')); // we need the filename without an extension, and it is safe to assume that this filepath always ends with an extension
    },
    contentDir() {
      if (!this.collection.dir) return this.projectDir;
      return joinPath(this.projectDir, this.collection.dir);
    },
    contentForTab: {
      get() {
        if (this.activeTab < 0 || !this.schema.tabs) return this.content;
        const { groupAs } = this.schema.tabs[this.activeTab];
        if (groupAs) return this.content[groupAs] || {};
        return this.content;
      },
      set(v) {
        if (!this.wasChanged) this.wasChanged = true;
        const { groupAs } = this.schema.tabs[this.activeTab];
        if (groupAs) this.content[groupAs] = v;
        else this.content = v;
        if (this.previewConnected) this.sendPreviewData();
        this.$nextTick(() => this.findAndSetTemplateIds(this.schema)); // we need to wait a tick for the value to update in the input because of the internal / external change flags in FieldsEditor
      },
    },
    contentLanguages() {
      return getContentLanguages(this.content, this.schema, this.$store.state.currentProject.languages);
    },
    contentName() {
      return prettifyEntityName(pathBasename(this.$route.params.path));
    },
    contentType() {
      return pluralize.singular(prettifyEntityName(this.$route.params.collection));
    },
    currentUser() {
      return this.$store.getters.userInCurrentProject;
    },
    draftsDir() {
      if (!this.collection.dir || !this.$store.state.currentProject.draftsDir) return null;
      return joinPath(this.projectDir, this.$store.state.currentProject.draftsDir, pathBasename(this.contentDir));
    },
    fieldsForTab() {
      if (!this.schema.fields) return [];
      if (this.activeTab === 0) return this.schema.fields.filter((field) => field.tab === this.cleanTabs[0] || !field.tab); // first tab shows all fields without tab, too
      return this.schema.fields.filter((field) => field.tab === this.cleanTabs[this.activeTab]);
    },
    filepath() {
      // we always want the final path, even if it is a draft
      if (this.isDraft) return joinPath(this.contentDir.replace(this.projectDir, ''), this.$route.params.path.replace(this.draftsDir, ''));
      return this.$route.params.path.replace(this.projectDir, '');
    },
    isDraft: {
      get() {
        if (!this.draftsDir) return false;
        return this.$route.params.path.startsWith(this.draftsDir);
      },
      async set(toDraft) {
        const { path } = this.$route.params;
        let newPath;
        if (!toDraft) { // we’re trying to publish, let’s make sure there are no errors
          const valid = this.validateContent();
          if (!valid) { // if it’s not valid, warn and abort
            this.$store.commit('addToast', { message: 'At least one of the fields has errors, please fix them before publishing.', type: 'negative' });
            return;
          }
          newPath = path.replace(this.draftsDir, this.contentDir); // we do not need to ensure that newPath exists here, because a draft in a folder that only exists in draftsDir wouldn’t show up here
        } else {
          newPath = joinPath(this.draftsDir, path.replace(this.contentDir, ''));
          await mkdirp(pathDirname(newPath)); // ensure new path exists in the draftsDir
        }
        const existsAlready = await exists(newPath);

        if (existsAlready) {
          this.$store.commit('addToast', { message: `A ${toDraft ? 'draft' : this.contentType} with this name exists already, please rename it and try again`, type: 'warning' });
        } else {
          await fs.rename(path, newPath);
          this.handleEntityMoved(newPath);
        }
      },
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
    noSchema() {
      return !this.content.___mb_schema || Object.keys(this.schema).length === 0;
    },
    previewUrl() {
      return this.$store.state.currentProject.previewUrl;
    },
    projectDir() {
      return `/projects/${this.$route.params.id}`;
    },
    status() {
      if (!this.fileStatus) return { color: 'warning', loading: true };
      if (this.fileStatus !== 'unmodified') return { color: 'warning', message: 'local changes' };
      return { color: 'positive', message: 'synchronised' };
    },
    tabErrors() {
      const errors = new Set();
      this.errors.fields.forEach((value, key) => {
        const schemaField = this.schema.fields.find((field) => field.key === key);
        if (!schemaField) return;
        let tabIndex = this.cleanTabs.indexOf(schemaField.tab);
        if (tabIndex === -1) tabIndex = 0; // fields without a tab are shown in the firs tab
        errors.add(tabIndex);
      });
      return errors;
    },
  },
  data() {
    return {
      activeTab: -1,
      actualPreviewUrl: null,
      addPreviewCommentPopover: {
        comment: null,
        loading: false,
        visible: false,
        x: 0,
        y: 0,
      },
      cachedTemplateIdFields: null,
      content: {},
      collection: {},
      errors: {
        name: '',
        fields: new Map(),
      },
      fileStatus: null,
      forceNavigation: false,
      fullscreenPreview: false,
      initialised: false,
      newContentName: '',
      newContentSchema: null,
      mobilePreview: false,
      previewComments: null,
      previewCommentsByCurrentUser: null,
      previewCommentsActive: false,
      previewCommentsLoading: false,
      previewCommentThreadPopover: {
        comments: null,
        visible: false,
        x: 0,
        y: 0,
      },
      previewConnected: false,
      previewImages: new Map(),
      previewInNewTab: null,
      previewInNewTabTimeout: null,
      previewSupports: [],
      saveLoading: false,
      schema: {},
      showPreview: false,
      showSettings: false,
      showSplit: false,
      wasChanged: false,
    };
  },
  methods: {
    async addPreviewComment(comment, toplevel) {
      if (!comment.content || !comment.content.length || comment.content === '<p></p>') return;

      this.previewComments.push(comment);
      this.previewCommentsByCurrentUser.push(comment);

      if (toplevel) this.addPreviewCommentPopover.loading = true;
      else this.previewCommentThreadPopover.comments.push(comment);

      try {
        await this.savePreviewCommentsByCurrentUser();
        if (toplevel) this.sendMessageToPreview({ feature: 'comments', type: 'addCommentMarker', payload: { comment: _cloneDeep(comment) } });
        this.addPreviewCommentPopover.visible = false;
      } catch (err) {
        this.$store.commit('addToast', { message: `Something went wrong while saving the comment: ${err.message}`, type: 'error' });
        // reset the pushed comments, its the ones pushed last
        this.previewComments.pop();
        this.previewCommentsByCurrentUser.pop();
      }

      if (toplevel) this.addPreviewCommentPopover.loading = false;
    },
    addPreviewImage({ detail }) {
      const { path, image } = detail;
      this.previewImages.set(path, image);
      if (this.previewConnected) this.sendPreviewData(); // since images load asynchronously we need to send the data again here so it shows up
    },
    assignSchemaDefaults(content, defaults) {
      return Object.entries(defaults).reduce((acc, [key, value]) => {
        if (!content[key]) acc[key] = value;
        else if (value && !Array.isArray(content[key]) && !(content[key] instanceof Date) && typeof content[key] === 'object') acc[key] = this.assignSchemaDefaults(content[key], value); // some values might end up as dates and we don’t want to handle those
        else acc[key] = content[key];
        return acc;
      }, {});
    },
    closeOpenPreview() {
      if (this.previewInNewTabTimeout) {
        window.clearTimeout(this.previewInNewTabTimeout);
        this.previewInNewTabTimeout = null;
      }
      window.removeEventListener('message', this.handleNewTabPreviewLoaded, false);
      this.$options.winref.close();
      this.$options.winref = null;
      this.previewInNewTab = false;
      this.previewConnected = false;
    },
    deleteContent() {
      if (!this.canDelete) return;

      const { collection, id, path } = this.$route.params;
      const { commentsDir } = this;

      this.showSettings = false;
      if (this.wasChanged) this.$store.commit('setAppProperty', { key: 'temporaryContentStorage', value: _cloneDeep(this.content) });
      this.forceNavigation = true;
      this.$store.commit('addToSoftDeleted', path);
      this.$store.commit('addToast', {
        action: () => {
          this.$store.commit('removeFromSoftDeleted', path);
          this.$router.replace({ name: 'Edit Content', params: { collection, id, path } });
        },
        actionLabel: 'Undo',
        message: `The ${this.contentType} “${this.contentName}” was deleted`,
        onClose: async (undone) => {
          if (undone) return;
          try {
            await fs.unlink(path);
            this.$store.commit('removeLocallyChangedFile', path);

            const commentsFolderExists = await exists(commentsDir);

            if (commentsFolderExists) {
              await rmrf(commentsDir);
              this.$store.state.application.locallyChangedFiles.forEach((changedPath) => {
                if (changedPath.startsWith(commentsDir)) {
                  this.$store.commit('removeLocallyChangedFile', changedPath);
                }
              });
            }

            this.$store.dispatch('saveAppData');
          } catch (err) {
            this.$store.commit('addToast', { message: `Something went wrong while deleting the ${this.contentType}: ${err.message}`, type: 'error' });
            this.$router.replace({ name: 'Edit Content', params: { collection, id, path } });
          } finally {
            this.$store.commit('removeFromSoftDeleted', path);
            this.$store.commit('setAppProperty', { key: 'temporaryContentStorage', value: null });
          }
        },
        timeout: 5000,
        type: 'warning',
      });
      const collectionPath = joinPath('/.mattrbld', 'collections', collection);
      this.$router.replace({ name: 'Project.Collection', params: { id, path: collectionPath } });
    },
    deletePreviewComment(id, toplevel) {
      const commentIndex = this.previewComments.findIndex((existingComment) => existingComment.id === id);
      const commentByCurrentUserIndex = this.previewCommentsByCurrentUser.findIndex((existingComment) => existingComment.id === id);
      if (commentIndex > -1) {
        const commentBackup = _cloneDeep(this.previewComments[commentIndex]);

        if (toplevel) this.sendMessageToPreview({ feature: 'comments', type: 'deleteCommentMarker', payload: { comment: commentBackup } });
        if (!toplevel) this.previewComments.splice(commentIndex, 1);
        if (this.previewCommentThreadPopover.visible) {
          this.previewCommentThreadPopover.comments = this.previewComments.filter((comment) => {
            let commentId = id;
            if (!toplevel) commentId = this.previewCommentThreadPopover.comments[0].id;
            return comment.id === commentId || comment.parent === commentId;
          });
        }

        this.$store.commit('addToast', {
          action: () => {
            if (toplevel) this.sendMessageToPreview({ feature: 'comments', type: 'addCommentMarker', payload: { comment: commentBackup } });
            else this.previewComments.splice(commentIndex, 0, commentBackup);
            if (this.previewCommentThreadPopover.visible) {
              this.previewCommentThreadPopover.comments = this.previewComments.filter((comment) => {
                let commentId = id;
                if (!toplevel) commentId = this.previewCommentThreadPopover.comments[0].id;
                return comment.id === commentId || comment.parent === commentId;
              });
            }
          },
          actionLabel: 'Undo',
          closeOnRouteChange: true,
          message: 'The comment was deleted',
          onClose: async (undone) => {
            if (undone) return;
            try {
              if (commentByCurrentUserIndex > -1 && !toplevel) this.previewCommentsByCurrentUser.splice(commentByCurrentUserIndex, 1);
              else if (commentByCurrentUserIndex > -1) this.previewCommentsByCurrentUser = this.previewCommentsByCurrentUser.filter((comment) => comment.id !== id && comment.parent !== id); // if toplevel, we need to delete children as well
              await this.savePreviewCommentsByCurrentUser(); // will also delete the file if empty
            } catch (err) {
              this.$store.commit('addToast', { message: `Something went wrong while deleting the comment: ${err.message}`, type: 'error' });
              this.previewComments.splice(commentIndex, 0, commentBackup);
              this.previewCommentsByCurrentUser.splice(commentByCurrentUserIndex, 0, commentBackup);
              if (this.previewCommentThreadPopover.visible) {
                this.previewCommentThreadPopover.comments = this.previewComments.filter((comment) => {
                  let commentId = id;
                  if (!toplevel) commentId = this.previewCommentThreadPopover.comments[0].id;
                  return comment.id === commentId || comment.parent === commentId;
                });
              }
              if (toplevel) this.sendMessageToPreview({ feature: 'comments', type: 'addCommentMarker', payload: { comment: commentBackup } });
            }
          },
          timeout: 5000,
          type: 'warning',
        });
      }
    },
    exchangePreviewHandshake() {
      let handshake;
      let handshakeTimeout;
      let targetOrigin;
      const vm = this;
      function handshakeListener(e) {
        if (e.origin !== targetOrigin) vm.$store.commit('addToast', { message: 'Could not exchange handshakes with the preview: the origin changed', type: 'warning' });
        else if (!e.data || !e.data.handshake) vm.$store.commit('addToast', { message: 'The preview didn’t return the connection handshake, does it implement the Preview Protocol correctly?', type: 'warning' });
        else if (e.data.handshake !== handshake) vm.$store.commit('addToast', { message: 'Could not exchange handshakes with the preview: the returned handshake didn’t match ours', type: 'warning' });
        else {
          window.clearTimeout(handshakeTimeout);
          if (Array.isArray(e.data.supports)) vm.previewSupports = e.data.supports.filter((feature) => PREVIEW_FEATURES.includes(feature));
          vm.previewConnected = true;
          vm.$store.commit('addToast', { message: 'Communication with the preview has been set up successfully', id: 'preview-connection-established', type: 'positive' });
          vm.sendPreviewData();
        }
        window.removeEventListener('message', handshakeListener, false);
      }
      try {
        targetOrigin = new URL(this.previewUrl).origin;
        handshake = Math.random().toString(36).substring(2, 9); // we just need something pseudo-random here to verify that the previewUrl implements the protocol
        if (this.previewInNewTab) this.$options.winref.postMessage({ handshake }, targetOrigin);
        else this.$refs.preview?.contentWindow.postMessage({ handshake }, targetOrigin);
        window.addEventListener('message', handshakeListener, false);
        handshakeTimeout = window.setTimeout(() => {
          // send again in case the first message wasn’t received
          if (this.previewInNewTab) this.$options.winref.postMessage({ handshake }, targetOrigin);
          else this.$refs.preview?.contentWindow.postMessage({ handshake }, targetOrigin);

          handshakeTimeout = window.setTimeout(() => { // if the first retry didn’t work, let the user decide
            window.removeEventListener('message', handshakeListener, false);
            this.$store.commit('addToast', {
              action: this.exchangePreviewHandshake,
              actionLabel: 'Retry',
              closeOnRouteChange: true,
              message: 'The preview didn’t return the connection handshake, does it implement the Preview Protocol correctly?',
              onClose: (actionHandled) => { if (!actionHandled) this.showSplit = false; },
              timeout: false,
              type: 'warning',
            });
          }, 500);
        }, 500);
      } catch (err) {
        window.clearTimeout(handshakeTimeout);
        this.$store.commit('addToast', {
          message: `Something went wrong while exchanging the preview handshake: ${err.message}`,
          onClose: (actionHandled) => { if (!actionHandled) this.showSplit = false; },
          type: 'error',
        });
      }
    },
    findAndSetFilepathIds(schema) {
      const idFields = getFieldsByPredicate(schema, (field) => field.type === 'id' && field.options && field.options.type === 'filepath');
      idFields.forEach((fieldData) => {
        const { field, contentpath } = fieldData;
        const currentValue = _get(this.content, contentpath);

        if (!currentValue || (currentValue !== this.filepath && !field.options.editable)) {
          _set(this.content, contentpath, this.filepath);
          this.$store.commit('addToast', { message: `Updated “${field.label}” to contain the current filepath`, type: 'positive' });
          this.wasChanged = true;
        }
      });
    },
    findAndSetTemplateIds(schema) {
      if (!this.cachedTemplateIdFields) this.cachedTemplateIdFields = getFieldsByPredicate(schema, (field) => field.type === 'id' && field.options && field.options.type === 'template');
      this.cachedTemplateIdFields.forEach(({ field, contentpath }) => {
        const newId = assembleUrlFromTemplate((field.options && field.options.idTemplate) || '', this.content, null, true, this.$store.state.currentProject.slugifyOptions || { lowercase: true, decamelize: true, preserveLeadingUnderscore: true });
        const oldId = _get(this.content, contentpath);
        if (newId !== oldId) {
          _set(this.content, contentpath, newId);
          if (!this.wasChanged) this.wasChanged = true;
        }
      });
    },
    focusOpenPreview() {
      this.$options.winref.focus();
    },
    formattedTimestamp(timestamp) {
      return formatTimestamp(timestamp);
    },
    handleAddPreviewCommentPopoverClosed() {
      this.addPreviewCommentPopover.comment = null;
      this.addPreviewCommentPopover.loading = false;
      this.addPreviewCommentPopover.visible = false;
      this.addPreviewCommentPopover.x = 0;
      this.addPreviewCommentPopover.y = 0;
    },
    handlePreviewCommentThreadPopoverClosed() {
      this.previewCommentThreadPopover.comments = null;
      this.previewCommentThreadPopover.visible = false;
      this.previewCommentThreadPopover.x = 0;
      this.previewCommentThreadPopover.y = 0;
    },
    async handleEntityMoved(newPath) {
      const newCommentsPath = newPath.substring(0, newPath.lastIndexOf('.')).replace((this.draftsDir && newPath.startsWith(this.draftsDir)) ? this.draftsDir : this.contentDir, joinPath(this.projectDir, '.mattrbld', 'comments', pathBasename(this.collection.dir)));

      if (this.commentsDir !== newCommentsPath) {
        const commentsFolderExists = await exists(this.commentsDir);

        if (commentsFolderExists) {
          try {
            await mkdirp(pathDirname(newCommentsPath));
            await fs.rename(this.commentsDir, newCommentsPath);
            this.$store.state.application.locallyChangedFiles.forEach((path) => {
              if (path.startsWith(this.commentsDir)) {
                this.$store.commit('removeLocallyChangedFile', path);
                this.$store.commit('addLocallyChangedFile', path.replace(this.commentsDir, newCommentsPath));
              }
            });
          } catch (err) {
            this.$store.commit('addToast', { message: `Something went wrong while renaming or moving the comments for this file: ${err.message}`, type: 'error' });
          }
        }
      }

      this.$store.commit('removeLocallyChangedFile', this.$route.params.path);
      this.$store.commit('addLocallyChangedFile', newPath);
      await this.$router.replace({ params: { collection: this.$route.params.collection, id: this.$route.params.id, path: newPath } });
      this.findAndSetFilepathIds(this.schema);
    },
    handleGlobalKeyUp(e) {
      if (e.key === 's' && (isMac() ? e.metaKey : e.ctrlKey) && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        this.saveChanges();
      }
    },
    handleNewTabPreviewLoaded(e) {
      if (this.previewInNewTabTimeout) {
        window.clearTimeout(this.previewInNewTabTimeout);
        this.previewInNewTabTimeout = null;
      }
      const targetOrigin = new URL(this.previewUrl).origin;
      if (e.origin !== targetOrigin || !e.data.loaded) this.$store.commit('addToast', { message: 'Could not establish a connection with the preview in the new tab: the origins didn’t match, or the loaded message was not present', type: 'warning' });
      else this.exchangePreviewHandshake();
      window.removeEventListener('message', this.handleNewTabPreviewLoaded, false);
    },
    handlePreviewLoaded(e) {
      if (!e.target.src) return; // we need to skip the first load event when the iframe is added to the DOM empty
      this.exchangePreviewHandshake();
    },
    handlePreviewMessage(e) {
      const { data, origin } = e;
      const targetOrigin = new URL(this.previewUrl).origin;

      if (origin !== targetOrigin) {
        this.$store.commit('addToast', { message: `The preview sent a message from an unexpected origin: ${origin}. The message will not be handled.`, type: 'warning' });
        return;
      }

      switch (data.feature) {
        case 'comments':
          if (!data.type || !data.payload) break;
          if (data.type === 'pageClick') {
            if (this.addPreviewCommentPopover.visible) { // if it's already visible we hide it to conform to user expectations regarding popovers
              this.addPreviewCommentPopover.visible = false;
              return;
            }
            if (this.previewCommentThreadPopover.visible) { // if we are viewing a comment thread we hide it to conform to user expectations regarding popovers
              this.previewCommentThreadPopover.visible = false;
              return;
            }
            if (!this.canComment) return; // we don't need to do anyhting if the user isn't allowed to comment

            const previewContainer = this.$refs.preview.getBoundingClientRect();
            this.addPreviewCommentPopover.x = data.payload.clientX + previewContainer.left;
            this.addPreviewCommentPopover.y = data.payload.clientY + previewContainer.top;
            this.addPreviewCommentPopover.comment = {
              id: Math.random().toString(36).substring(2, 9),
              author: this.currentUser.name,
              parent: null,
              content: '',
              position: { x: data.payload.pageX, y: data.payload.pageY },
              status: null,
              created: Date.now(),
              updated: null,
            };
            this.addPreviewCommentPopover.visible = true;

            this.$nextTick(() => this.$refs.commentEditor && this.$refs.commentEditor.editorView.focus());
          } else if (data.type === 'commentClick') {
            if (this.addPreviewCommentPopover.visible) this.addPreviewCommentPopover.visible = false;
            if (this.previewCommentThreadPopover.visible) {
              this.previewCommentThreadPopover.visible = false;
              return;
            }
            const previewContainer = this.$refs.preview.getBoundingClientRect();
            this.previewCommentThreadPopover.x = data.payload.clientX + previewContainer.left;
            this.previewCommentThreadPopover.y = data.payload.clientY + previewContainer.top;
            this.previewCommentThreadPopover.comments = this.previewComments.filter((comment) => comment.id === data.payload.id || comment.parent === data.payload.id);
            this.previewCommentThreadPopover.visible = true;
          } else if (data.type === 'commentMoved') {
            const { comment: movedCommentId, position } = data.payload;
            this.updatePreviewComment(movedCommentId, position);
          }
          break;
        default:
          break;
      }
    },
    handleSplitClosed() {
      if (this.showPreview) {
        this.showPreview = false;
        if (!this.previewInNewTab) {
          this.previewConnected = false;
        }
      }
    },
    handleTitleTooltip(e) {
      const tooltip = {
        message: this.contentName,
        target: e.currentTarget,
      };
      this.$store.commit('setTooltip', tooltip);
    },
    async loadAndAssignSchema(schema) {
      try {
        this.schema = JSON.parse(await fs.readFile(joinPath('/projects', this.$route.params.id, schema), 'utf8'));
        const defaults = generateDefaultContentFromSchema(this.schema, this.filepath);
        this.content = { ...this.content, ...this.assignSchemaDefaults(this.content, defaults) };
        this.content.___mb_schema = schema;
        this.findAndSetFilepathIds(this.schema);
        this.findAndSetTemplateIds(this.schema);
        this.wasChanged = true;
      } catch (err) {
        if (err.code !== 'ENOENT') this.$store.commit('addToast', { message: `Something went wrong while loading the Schema: ${err.message}`, type: 'error' });
        else this.$store.commit('addToast', { message: `The Schema “${prettifyEntityName(pathBasename(schema))}” could not be found in this project, please select a different one`, type: 'warning' });
      }
    },
    openPreviewInNewTab() {
      if (this.previewConnected) this.previewConnected = false; // in case the preview was already showing
      this.$options.winref = window.open(this.previewUrl, `com.mattrbld.app.Project/preview/${this.$route.params.id}`); // this will focus a window of the same name (reverse domain to avoid duplicates) or open a blank new one
      // this.$options.winref.addEventListener('load', this.exchangePreviewHandshake, false); // doesn’t work because we don’t have access to that origin
      window.addEventListener('message', this.handleNewTabPreviewLoaded, false);
      this.previewInNewTab = true;
      this.previewInNewTabTimeout = window.setTimeout(() => {
        this.$store.commit('addToast', { message: 'The new tab never signalled that it stopped loading, does it implement the Preview Protocol correctly?', type: 'warning' });
        this.previewInNewTabTimeout = null;
      }, 5000);
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
    async renameContent() {
      if (this.newContentName === this.contentName) {
        this.showSettings = false;
        return;
      }
      this.validateNewContentName();
      if (this.errors.name) return;

      const oldName = pathBasename(this.$route.params.path);
      const extension = oldName.slice((Math.max(0, oldName.lastIndexOf('.')) || Infinity) + 1); // based on https://stackoverflow.com/questions/190852/how-can-i-get-file-extensions-with-javascript/12900504#12900504
      const newName = slugify(this.newContentName, this.$store.state.currentProject.slugifyOptions || { lowercase: false, decamelize: false, preserveLeadingUnderscore: true });
      const newPath = joinPath(pathDirname(this.$route.params.path), `${newName}.${extension}`);
      const alreadyExists = await exists(newPath);

      if (alreadyExists) {
        this.errors.name = 'A content item with this name already exists';
        return;
      }

      await fs.rename(this.$route.params.path, newPath);
      this.showSettings = false;
      this.handleEntityMoved(newPath);
    },
    resetContentName() {
      this.newContentName = this.contentName;
      this.newContentSchema = null;
      this.errors.name = '';
    },
    async saveChanges() {
      this.saveLoading = true;
      const valid = this.validateContent();

      if (!valid && this.isDraft) this.$store.commit('addToast', { message: 'At least one of the fields has errors. You won’t be able to publish this content item until you fix the errors', type: 'warning' });

      if (!this.content.___mb_unedited && !this.isDraft) this.setUpdatedAt();

      if (valid || this.isDraft) { // allow saving with errors, if this is a draft
        if (this.content.___mb_unedited) delete this.content.___mb_unedited; // mark this content item as having been edited once
        try {
          let transformedContent;
          if (this.collection.type === 'json') transformedContent = JSON.stringify(this.content, null, 2);
          else if (this.collection.type === 'md') {
            const shallowClone = { ...this.content };
            delete shallowClone.content; // not needed in the frontmatter
            transformedContent = matter.stringify(this.content.content || '', shallowClone);
          }
          await fs.writeFile(this.$route.params.path, transformedContent, 'utf8');
          this.$store.commit('addToast', { message: `“${this.contentName}” was saved successfully`, timeout: 2000, type: 'positive' });
          this.$store.commit('addLocallyChangedFile', this.$route.params.path);
          this.wasChanged = false;
        } catch (err) {
          this.$store.commit('addToast', { message: `Something went wrong while saving the file: ${err.message}`, type: 'error' });
        }
      } else {
        this.$store.commit('addToast', { message: 'At least one of the fields has errors, please fix them before saving.', type: 'negative' });
      }
      this.saveLoading = false;
    },
    async savePreviewCommentsByCurrentUser() {
      const path = joinPath(this.commentsDir, `${this.currentUser.id}.json`);
      if (this.previewCommentsByCurrentUser.length) await fs.writeFile(path, JSON.stringify(this.previewCommentsByCurrentUser, null, 2), 'utf8');
      else fs.unlink(path);
      this.$store.commit('addLocallyChangedFile', path);
    },
    async saveSettings() {
      if (this.newContentSchema) await this.loadAndAssignSchema(this.newContentSchema);
      if (this.newContentName !== this.contentName) this.renameContent();
      else this.showSettings = false;
    },
    sendMessageToPreview(data) {
      const targetOrigin = new URL(this.previewUrl).origin;
      if (this.previewInNewTab && this.$options.winref) this.$options.winref.postMessage(data, targetOrigin);
      else if (this.$refs.preview.contentWindow) this.$refs.preview.contentWindow.postMessage(data, targetOrigin);
    },
    sendPreviewData: debounce(function debouncedSend() { // OPTIMIZE: this could probably be optimized to only send deltas instead of the full object every time if a "full" param is false (we still need to send the full object upon initial connection)
      const targetOrigin = new URL(this.previewUrl).origin;
      const defaultUrl = this.$route.params.path.substring(0, this.$route.params.path.lastIndexOf('.')).replace(this.projectDir, '').replace(pathDirname(this.collection.dir), '');
      const defaultFields = generateDefaultFilePathFields(this.$route.params.path, this.projectDir, this.contentDir, this.draftsDir);
      const urlFields = { ...this.content, ...defaultFields };
      let url;

      if (this.collection.urlTemplate && this.contentLanguages && this.contentLanguages.length > 0) {
        url = {};
        this.contentLanguages.forEach((lang) => {
          const template = this.collection.urlTemplate[lang] || Object.values(this.collection.urlTemplate).find((existingTemplate) => existingTemplate);
          url[lang] = template ? assembleUrlFromTemplate(template, urlFields, lang, true, this.$store.state.currentProject.slugifyOptions || { lowercase: true, decamelize: true, preserveLeadingUnderscore: true }).replace(/\\\./g, '.') : defaultUrl; // we’re replacing escaped dots here since that’s the only way to separate a dot from a property-path
        });
      } else url = this.collection.urlTemplate ? assembleUrlFromTemplate(this.collection.urlTemplate, urlFields, null, true, this.$store.state.currentProject.slugifyOptions || { lowercase: true, decamelize: true, preserveLeadingUnderscore: true }).replace(/\\\./g, '.') : defaultUrl; // we’re replacing escaped dots here since that’s the only way to separate a dot from a property-path
      const data = {
        collection: this.$route.params.collection,
        url,
        data: _cloneDeep(this.content),
        imageMap: new Map(this.previewImages), // we need to clone the map here, because StructuredClone doesn’t like proxies
        // changedProp: '', // MAYBE: find a way to detect which property path has changed and pass that to the preview so it can scroll to it?
      };
      if (this.previewInNewTab && this.$options.winref) this.$options.winref.postMessage(data, targetOrigin);
      else if (this.$refs.preview.contentWindow) this.$refs.preview.contentWindow.postMessage(data, targetOrigin);
    }, 500),
    setUpdatedAt() {
      const updatedAtFields = getFieldsByPredicate(this.schema, (field) => field.type === 'date' && field.options && field.options.useAsUpdatedAt);
      updatedAtFields.forEach(({ field, contentpath }) => {
        const now = new Date();
        let value;

        if (field.options && field.options.outputFormat === 'iso') value = formatISO(now, { representation: field.options && field.options.showTime ? 'complete' : 'date' });
        else value = now.valueOf();

        _set(this.content, contentpath, value);
      });
    },
    toggleFullscreenPreview() {
      this.previewConnected = false;
      this.fullscreenPreview = !this.fullscreenPreview;
    },
    togglePreview() {
      if (!this.showPreview) {
        if (this.showSplit) this.showSplit = false; // if the split is already visible we need to close it so any active field gets properly reset
        this.$nextTick(() => {
          this.showSplit = true;
          this.showPreview = true;
          if (!this.actualPreviewUrl) window.setTimeout(() => { this.actualPreviewUrl = this.previewUrl; }, 300); // give the preview a chance to open smoothly before loading the iframe
        });
      } else {
        this.showSplit = false;
      }
    },
    async togglePreviewComments() {
      const initialCommentsData = { feature: 'comments', type: 'initialData', payload: null };
      const modechangeData = { feature: 'comments', type: 'modechange', payload: null };

      if (this.previewCommentsActive) this.previewCommentsActive = false;
      else if (!this.previewComments) {
        this.previewCommentsLoading = true;

        const loadedComments = [];

        try {
          const commentsDirExists = await exists(this.commentsDir);

          if (commentsDirExists) {
            const commentFiles = (await fs.readdir(this.commentsDir)).filter((path) => path.endsWith('.json'));
            const comments = await Promise.all(commentFiles.map((name) => fs.readFile(joinPath(this.commentsDir, name), 'utf8')));
            const commentArrayStringByCurrentUser = comments[commentFiles.indexOf(`${this.currentUser.id}.json`)];
            comments.forEach((commentArrayString) => loadedComments.push(...JSON.parse(commentArrayString)));
            this.previewCommentsByCurrentUser = commentArrayStringByCurrentUser ? JSON.parse(commentArrayStringByCurrentUser) : [];
            loadedComments.sort((a, b) => a.created - b.created); // sort the combined loaded comments by creation date so the order is correct when displaying them

            // when deleting a toplevel comment, we should also delete all its children
            // but that is a problem, since we cannot modify the comment files of other users due to potential conflicts
            // so instead, we only delete them for the current user and have to do a cleanup for other users here
            const toplevelCommentIds = loadedComments.reduce((acc, comment) => {
              if (comment.parent === null) acc.push(comment.id);
              return acc;
            }, []);
            const oldLength = this.previewCommentsByCurrentUser.length;
            this.previewCommentsByCurrentUser = this.previewCommentsByCurrentUser.filter((comment) => !comment.parent || toplevelCommentIds.includes(comment.parent));
            if (oldLength !== this.previewCommentsByCurrentUser.length) this.savePreviewCommentsByCurrentUser();
          } else {
            await mkdirp(this.commentsDir);
            this.previewCommentsByCurrentUser = [];
          }

          this.previewComments = loadedComments;
          initialCommentsData.payload = { comments: loadedComments.reduce((acc, comment) => { if (!comment.parent) acc.push(comment); return acc; }, []) }; // only interested in the toplevel comments
          this.previewCommentsActive = true;
        } catch (err) {
          this.$store.commit('addToast', { message: `Something went wrong while loading the comments for this file: ${err.message}`, type: 'error' });
        }

        this.previewCommentsLoading = false;
      } else {
        // We only need to pass toplevel comments, not replies
        const toplevelComments = this.previewComments.reduce((acc, comment) => {
          if (!comment.parent) acc.push(_cloneDeep(comment)); // Cloning the comment here because it is a proxy and StructuredClone hates that
          return acc;
        }, []);
        initialCommentsData.payload = { comments: toplevelComments };
        this.previewCommentsActive = true;
      }

      modechangeData.payload = { active: this.previewCommentsActive, canComment: this.canComment };
      this.sendMessageToPreview(modechangeData);
      if (this.previewCommentsActive) this.sendMessageToPreview(initialCommentsData);
    },
    async updatePreviewComment(id, changes) {
      const commentIndex = this.previewComments.findIndex((existingComment) => existingComment.id === id);
      const commentByCurrentUserIndex = this.previewCommentsByCurrentUser.findIndex((existingComment) => existingComment.id === id);

      let { x, y } = changes;
      if (changes.position) {
        x = changes.position.x;
        y = changes.position.y;
      }
      const isMovement = typeof x !== 'undefined' && typeof y !== 'undefined';

      if (commentIndex === -1) {
        this.$store.commit('addToast', { message: 'The comment you tried to update doesn’t exist', type: 'warning' });
        if (isMovement) this.sendMessageToPreview({ feature: 'comments', type: 'moveFailed', payload: { comment: { id } } });
      } else if (!this.canComment || commentByCurrentUserIndex === -1) {
        this.$store.commit('addToast', { message: 'You are not allowed to update this comment', type: 'warning' });
        if (isMovement) this.sendMessageToPreview({ feature: 'comments', type: 'moveFailed', payload: { comment: _cloneDeep(this.previewComments[commentIndex]) } });
      } else if (isMovement && (typeof x !== 'number' || typeof y !== 'number' || Math.abs(x) > 999999 || Math.abs(y) > 999999)) {
        this.$store.commit('addToast', { message: 'The new position is invalid', type: 'warning' });
        this.sendMessageToPreview({ feature: 'comments', type: 'moveFailed', payload: { comment: _cloneDeep(this.previewComments[commentIndex]) } });
      } else {
        const backup = _cloneDeep(this.previewComments[commentIndex]);

        try {
          if (isMovement) {
            this.previewComments[commentIndex].position = { x, y };
            this.previewCommentsByCurrentUser[commentByCurrentUserIndex].position = { x, y };
          } else {
            const updatedComment = { ...this.previewComments[commentIndex], ...changes, updated: Date.now() };
            this.previewComments[commentIndex] = updatedComment;
            this.previewCommentsByCurrentUser[commentByCurrentUserIndex] = updatedComment;
            if (!backup.parent) this.sendMessageToPreview({ feature: 'comments', type: 'updateCommentMarker', payload: { comment: _cloneDeep(updatedComment) } });
          }
          await this.savePreviewCommentsByCurrentUser();
          if (this.previewCommentThreadPopover.visible) this.previewCommentThreadPopover.comments = this.previewComments.filter((comment) => comment.id === this.previewCommentThreadPopover.comments[0].id || comment.parent === this.previewCommentThreadPopover.comments[0].id);
        } catch (err) {
          this.$store.commit('addToast', { message: `Something went wrong while saving the comment: ${err.message}`, type: 'error' });
          this.previewComments[commentIndex] = backup;
          this.previewCommentsByCurrentUser[commentByCurrentUserIndex] = backup;
          if (isMovement) this.sendMessageToPreview({ feature: 'comments', type: 'moveFailed', payload: { comment: backup } });
        }
      }
    },
    validateContent() {
      this.errors.fields = validateContent(this.content, this.schema, this.contentLanguages);
      return this.errors.fields.size === 0;
    },
    validateNewContentName() {
      if (!this.newContentName || !this.newContentName.trim()) this.errors.name = 'A name is required';
      else this.errors.name = '';
    },
  },
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
    activeTab() {
      if (this.showSplit && !this.showPreview) this.showSplit = false;
    },
    contentLanguages(nv, ov) { // we need to revalidate the content if the langauges change so we don’t end up with invalid, unfixable errors
      if (!this.initialised || isEqual(nv, ov)) return; // no need to revalidate if the languages didn’t actually change, as this is fired on every content change
      if (this.schema && this.schema.fields) this.validateContent();
    },
    async currentUser(nv) {
      if (!nv || !hasAccess(nv.role, this.collection.permissions)) {
        if (this.wasChanged) {
          if (this.wasChanged) this.$store.commit('setAppProperty', { key: 'temporaryContentStorage', value: _cloneDeep(this.content) });
          this.forceNavigation = true;
        }
        this.$router.replace({ name: 'Forbidden' });
      }

      if (nv && this.previewComments) {
        try {
          this.previewCommentsByCurrentUser = JSON.parse(await fs.readFile(joinPath(this.commentsDir, `${nv.id}.json`), 'utf8'));
        } catch (err) {
          if (err.code !== 'ENOENT') this.$store.commit('addToast', { message: `Something went wrong while loading the comments for this user: ${err.message}`, type: 'error' });
          this.previewCommentsByCurrentUser = [];
        }
      }
    },
    previewConnected(nv) {
      // The connection state switches pretty often and whenever it does we want to either add or remove an existing listener
      if (nv) {
        window.addEventListener('message', this.handlePreviewMessage, false);
        if (this.previewCommentsActive) this.previewCommentsActive = false;
      } else {
        window.removeEventListener('message', this.handlePreviewMessage, false);
        if (this.previewCommentsActive) this.previewCommentsActive = false;
      }
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
  winref: null, // keeping this as a non-responsive $option here because of various CORS-issues when this is a data property on the component (and it doesn’t need to be reactive anyway)
};
</script>

<style lang="scss" scoped>
  @use '../assets/styles/breakpoints' as *;

  .edit-content  { // 100% minus the height of the app-header
    height: calc(100vh - rem(116));
    display: flex;
    flex-direction: column;
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

          &.v-enter-active,
          &.v-leave-active {
            transition: opacity 200ms ease;

            &.v-enter-from,
            &.v-leave-to {
              opacity: 0;
            }
          }

          &:not(:last-child) {
            margin-right: 0.5rem;
          }

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

          @media #{$mobile} {
            &.push-right {
              margin-left: auto;
            }
          }
        }

        .toggle {
          margin-right: 2rem;

          @media #{$tablet} {
            margin-right: 1rem;
          }
        }
      }
    }

    .tabs {
      position: sticky;
      top: 0;
      z-index: 1;
      flex-shrink: 0;
    }

    .tab-content {
      flex-grow: 1;

      .no-schema,
      .fields-editor {
        max-width: 40rem;
        margin: 0 auto;

        &.v-enter-active,
        &.v-leave-active {
          transition: opacity 200ms ease;

          &.v-enter-from,
          &.v-leave-to {
            opacity: 0;
          }
        }
      }

      .no-schema {
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

        ul {
          margin: 0;
          list-style: none;

          li {
            &:not(:last-child) {
              margin-bottom: 1rem;
            }

            .button {
              max-width: 100%;
              width: rem(320);
            }
          }
        }
      }

      .fields-editor {
        margin-top: 8rem;

        &.preview-open {
          margin-bottom: 8rem;

          @media #{$tablet} {
            margin-bottom: 4rem;
          }
        }

        @media #{$tablet} {
          margin-top: 4rem;
        }

        @media #{$mobile} {
          margin-top: 2rem;
        }
      }
    }
  }

  .preview {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100%;

    @media #{$mobile} {
      height: calc(90vh - rem(86)); // height of the modal footer + card border
      position: relative;
    }

    .error-state {
      text-align: center;
      max-width: 40rem;

      &.dark {
        .icon,
        h2,
        p {
          color: var(--text-secondary-dark);
        }
      }

      .icon {
        width: 6rem;
        height: 6rem;
      }

      .icon,
      h2,
      p {
        color: var(--text-secondary);
      }

      h2 {
        margin-top: 1rem;
      }

      p {
        margin-bottom: 2rem;
      }

      .button:not(:last-child) {
        margin-right: 1rem;
      }
    }
  }

  .preview-frame  { // toplevel because it can teleport
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    &.fullscreen {
      position: fixed;
      top: 0;
      left: 0;
      background-color: var(--bg-dark);
      z-index: 2;
    }

    &.mobile-preview {
      background-color: var(--bg-tertiary-dark);

      header {
        opacity: 1;
      }
    }

    header {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      padding: 1rem;
      background-color: color-mix(in srgb, var(--bg) 50%, transparent);
      opacity: 0;
      transition: opacity 200ms ease;

      &.dark {
        background-color: color-mix(in srgb, var(--bg-dark) 50%, transparent);
      }

      &:hover {
        opacity: 1;
      }

      .button:not(:last-child) {
        margin-right: 0.5rem;
      }
    }

    iframe {
      border: none;
      width: 100%;
      height: 100%;
      background-color: #fff;

      &.mobile {
        width: rem(360);
        height: rem(640);
        max-width: 100%;
        max-height: 100%;
        margin: 1rem;
        border-radius: var(--radius-xl);
      }
    }

    .loader {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: var(--bg);

      &.dark {
        background-color: var(--bg-secondary-dark);
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

  #splitTarget {
    padding-top: 8rem;
    max-width: 40rem;
    margin-left: auto;
    margin-right: auto;

    @media #{$tablet} {
      padding-top: 4rem;
    }

    @media #{$mobile} {
      padding-top: 0;
    }

    &.in-modal {
      margin-top: -1rem;
    }
  }

  .edit-content-modal {
    .input {
      width: 100%;
      margin-bottom: 1rem;
    }

    .select-wrapper {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 2rem;

      > span {
        margin-right: 1rem;
      }
    }

    .highlight-box {
      .button {
        width: 100%;
      }
    }
  }

  .add-preview-comment {
    &.dark {
      .header-wrapper {
        .author {
          color: var(--text-secondary-dark);
        }

        .timestamp {
          color: var(--text-tertiary-dark);
        }
      }
    }

    .header-wrapper {
      display: flex;
      justify-content: space-between;
      padding: rem(8) rem(12);
      user-select: none;

      .author,
      .timestamp {
        font-size: rem(12);
      }

      .author {
        max-width: 60%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: var(--text-secondary);
      }

      .timestamp {
        color: var(--text-tertiary);
      }
    }

    .editor {
      max-width: 100%;
      width: rem(440);

      &:deep(.content-wrapper) {
        border-radius: 0;

        &:not(:focus-within):not(.error) {
          box-shadow: inset 0, -rem(1) 0 0 var(--bg-tertiary);
        }

        &.dark {
          background-color: var(--bg-tertiary-dark);

          &:not(:focus-within):not(.error) {
            box-shadow: inset 0 0.0625rem 0 0 var(--bg-tertiary-dark-lightened-10),
                        inset 0, rem(-1) 0 0 var(--bg-tertiary-dark-lightened-10);
          }

          code {
            background-color: var(--bg-tertiary-dark-lightened-10);
          }
        }
      }

      &:deep(.toolbar) {
        margin-top: 0;
        top: 0;
        border-radius: 0;

        .tool-group:nth-child(2) {
          display: none;
        }
      }
    }
  }
</style>
