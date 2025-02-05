<template>
  <div class="project">
    <router-view v-slot="{ Component }">
      <transition mode="out-in">
        <component class="subview" :class="{ dark }" :dark="dark" :is="Component" :key="$route.name" ref="subview" @push="openChangesModal" />
      </transition>
    </router-view>
    <ProjectSidebar :dark="dark" :git-status="gitStatus" @git-status-click="handleGitStatusClick" />
    <GitLoginModal :dark="dark" :message="gitLoginMessage" :visible="showGitLoginModal" @cancel="credentialPromise('cancel')" @submit="credentialPromise" />
    <MbModal class="error-modal" :dark="dark" title="Oops…" :visible="showGitErrorModal" @after-close="gitError = null" @close="showGitErrorModal = false">
      <p>Something went wrong while syncing the latest changes. See the error message below for more details:</p>
      <pre><code>{{JSON.stringify({ timestamp: new Date(), ...gitError }, null, 2)}}</code></pre>
      <template #actions>
        <MbButton :dark="dark" @click="showGitErrorModal = false">Close</MbButton>
        <MbButton v-if="gitErrorRetryAction" :dark="dark" type="primary" @click="handleGitErrorRetry">Try again</MbButton>
      </template>
    </MbModal>
    <MbModal class="changes-modal" :dark="dark" :permanent="isPushing" title="Sync local changes" :visible="showChangesModal" @close="showChangesModal = false" @after-close="resetChangesModal">
      <transition mode="out-in">
        <MbLoader v-if="changesLoading" />
        <div v-else-if="isPulling || isPushing" class="progress">
          <MbProgress :dark="dark" :indetermined="!currentOperation.progress" :label="currentOperation.step" :progress="currentOperation.progress" />
        </div>
        <div v-else class="wrapper">
          <MbEditor v-model="commitMessage" :allow-new-lines="false" :dark="dark" label="Message describing the changes (optional)" :max-len="72" warn @keyup.ctrl.enter="handlePushWithEnter" />
          <header :class="{dark}">
            <span>Select the changes to include:</span>
            <MbButton :dark="dark" @click="toggleSelectAll">{{lessThanHalfSelected ? 'Select all' : 'Deselect all'}}</MbButton>
          </header>
          <ul class="changes">
            <li v-for="(change, index) in changes" :key="index">
              <MbCheckbox v-model="change.selected" :dark="dark" />
              <div class="group" :class="{dark}" @click="toggleChangeSelection($event, index)" @contextmenu.prevent="openChangeContextMenu($event, index)">
                <MbChip :color="change.color" :label="change.type" />
                <span>{{change.file}}</span>
                <MbButton :dark="dark" icon="more-vertical" rounded tooltip="More" @click="openChangeContextMenu($event, index)" />
              </div>
            </li>
            <li v-if="changes.length === 0" class="empty-state">
              <span>There currently are no unpublished changes</span>
            </li>
          </ul>
        </div>
      </transition>
      <template #actions>
        <MbButton :dark="dark" :disabled="isPulling || isPushing" @click="showChangesModal = false">Cancel</MbButton>
        <MbButton :dark="dark" :disabled="isPulling || isPushing || changesLoading" type="primary" @click="selectedChanges.length === 0 ? pullChanges() : pushChanges()">
          <template v-if="selectedChanges.length">Sync {{selectedChanges.length}} change{{ selectedChanges.length !== 1 ? 's' : ''}}</template>
          <template v-else>Check for updates</template>
        </MbButton>
      </template>
    </MbModal>
    <MbModal class="discard-confirmation-modal" :dark="dark" title="Discard Local Changes" :visible="showDiscardConfirmationModal" @close="showDiscardConfirmationModal = false" @after-close="changeToDiscard = null">
      <p>You’re about to <strong>permanently</strong> discard any local changes that have been made to <code>{{changeToDiscard && changeToDiscard.file}}</code>. Are you sure?</p>
      <p><strong>This cannot be undone.</strong></p>
      <template #actions>
        <MbButton :dark="dark" @click="showDiscardConfirmationModal = false">Cancel</MbButton>
        <MbButton :dark="dark" icon="trash" type="negative" @click="discardChanges">Discard</MbButton>
      </template>
    </MbModal>
    <MbModal class="change-details-modal" :dark="dark" title="Change Details" :visible="showChangeDetailsModal" @close="showChangeDetailsModal = false" @after-close="resetChangeDetails">
      <p v-if="changeDetails.type !== 'modify'">You have moved or {{changeDetails.type === 'add' ? 'created' : 'deleted'}} <code>{{changeDetails.file}}</code></p>
      <p v-else>You have modified <code>{{changeDetails.file}}</code> in the following sections:</p>
      <template v-if="changeDetails.diff">
        <div v-for="(change, index) in changeDetails.diff" class="change" :key="index">
          <template v-if="changeDetails.diff[index + 1] && changeDetails.diff[index + 1].line === change.line">
            <p v-if="change.line === change.lineEnd" class="line-hint">Modify line {{change.line}}:</p>
            <p v-else class="line-hint">Modify lines {{change.line}} to {{change.lineEnd}}:</p>
            <pre class="remove">{{change.content}}</pre>
            <pre class="add">{{changeDetails.diff[index +1].content}}</pre>
          </template>
          <template v-else-if="!changeDetails.diff[index - 1] || changeDetails.diff[index - 1].line !== change.line">
            <p v-if="change.line === change.lineEnd" class="line-hint">{{change.type === 'add' ? 'Add' : 'Remove'}} line {{change.line}}:</p>
            <p v-else class="line-hint">{{change.type === 'add' ? 'Add' : 'Remove'}} lines {{change.line}} to {{change.lineEnd}}:</p>
            <pre :class="change.type">{{change.content}}</pre>
          </template>
        </div>
      </template>
      <template #actions>
        <MbButton :dark="dark" @click="showChangeDetailsModal = false">Close</MbButton>
      </template>
    </MbModal>
    <MbContextMenu :dark="dark" :from-right="changeContextMenu.fromRight" :options="changeContextMenu.options" :show="changeContextMenu.show" :target="changeContextMenu.target" :x="changeContextMenu.x" :y="changeContextMenu.y" @close="resetChangeContextMenu" />
  </div>
</template>

<script>
import * as Diff from 'diff';
import slugify from '@sindresorhus/slugify';
import {
  checkout, currentBranch as getCurrentBranch, log as gitLog, resetIndex, statusMatrix, resolveRef, readBlob,
} from 'isomorphic-git';

import fs, { PlainFS, exists, joinPath } from '../fs';
import { addAllAndCommit, pull, push } from '../git';
import Store, { projectDefaults } from '../store';
import isMattrbldProject from '../assets/js/isMattrbldProject';
import loadProject from '../assets/js/loadProject';

import ProjectSidebar from '../components/utility/ProjectSidebar.vue';

import gitAuth from '../mixins/gitAuth';

const GIT_STATUS_MESSAGES = {
  ERROR: 'Something went wrong syncing the latest changes. Click to learn more.',
  PULLING: 'Fetching remote changes',
  PUSHING: 'Pushing changes to remote',
  CHANGES: 'You have some unpublished local changes',
  SYNCED: 'Everything is in sync',
};

export default {
  async beforeRouteEnter(to, from, next) {
    // if the project is already loaded, we just need to reload the avatar (because it got revoked) and are good to go
    if (Store.state.currentProject.id === to.params.id) {
      try {
        const avatarData = await fs.readFile(`/projects/${to.params.id}/.mattrbld/avatar.jpg`);
        const avatarUrl = URL.createObjectURL(new Blob([avatarData], { type: 'image/jpeg' })); // revoking is handled by the ProjectAvatar component
        Store.commit('setCurrentProjectProperty', { key: 'avatar', value: avatarUrl });
        return next();
      } catch (err) {
        if (err.code !== 'ENOENT') return next(err);
      }
    }

    const configPath = `/projects/${to.params.id}/.mattrbld/config.json`;
    const usersPath = `/projects/${to.params.id}/.mattrbld/users`;
    const currentUserId = Store.state.user.id;

    const hasConfigDir = await isMattrbldProject(to.params.id);
    const hasConfigFile = await exists(configPath);

    if (!hasConfigDir || !hasConfigFile) {
      try {
        if (!hasConfigDir) await fs.mkdir(`/projects/${to.params.id}/.mattrbld`);
        await fs.mkdir(usersPath);
      } catch (err) {
        if (err.code !== 'EEXIST') { // it might exist, but there’s no config.json
          return next({
            name: 'Error',
            state: {
              code: err.code,
              message: err.message,
              name: err.name,
            },
          });
        }
      }

      // Add first user as project owner
      const { email, name } = Store.state.user;
      const id = slugify(email.trim()); // it’s the first, so there’s no need to worry about collisions, we cannot use the local users id though
      const user = {
        email,
        id,
        name,
        role: 'owner',
      };

      try {
        const path = `${usersPath}/${currentUserId}.json`;
        await fs.writeFile(path, JSON.stringify(user, null, 2), 'utf8');
        Store.commit('addLocallyChangedFile', path);
        Store.dispatch('saveAppData');
      } catch (err) {
        return next({
          name: 'Error',
          state: {
            code: err.code,
            message: err.message,
            name: err.name,
          },
        });
      }

      // Create config.json with defaults
      Store.commit('setCurrentProject', {
        ...projectDefaults,
        corsProxy: Store.state.application.corsProxy,
        id: to.params.id,
        name: to.params.id,
        users: [user],
      });

      // Save the config and move on
      const configSaved = await Store.dispatch('saveCurrentProject');
      if (configSaved) return next();

      return next({
        name: 'Error',
        state: {
          code: '500',
          message: 'Could not save config, see toast for details',
          name: 'Internal Error',
        },
      });
    }

    // if we’re here the project was initialised before
    try {
      const { project, users, avatarUrl } = await loadProject(to.params.id, fs);

      if (!users.find((user) => user.email === Store.state.user.email)) { // this user isn’t a member of this project yet
        const { email, name } = Store.state.user;
        let id = slugify(email.trim()); // could lead to collisions with similar addresses, so we check if it exists in the next step, but we don’t use the id of the current user since that’s only unique to the current device
        // eslint-disable-next-line no-await-in-loop
        while (await exists(`${usersPath}/${id}.json`)) id += `-${Math.random().toString(36).slice(2, 9)}`; // add a random sequence after to make it unique

        const user = {
          email,
          id,
          name,
          role: users.length === 0 ? 'owner' : 'editor',
        };

        const path = `${usersPath}/${id}.json`;
        await fs.writeFile(path, JSON.stringify(user, null, 2), 'utf8');
        Store.commit('addLocallyChangedFile', path);
        Store.dispatch('saveAppData');
        users.push(user);
      }

      Store.commit('setCurrentProject', {
        ...Store.state.currentProject,
        ...project,
        avatar: avatarUrl,
        users,
      });
      return next((vm) => {
        if (navigator.onLine && (from.name === 'Home' || from.name === undefined)) vm.performInitialPull();
        else if (!navigator.onLine) {
          Store.commit('addToast', {
            id: 'appIsOffline',
            message: 'You’re offline and working on a potentially outdated version, there’s a higher risk of conflicts',
            timeout: false,
            type: 'warning',
          });
        }
      });
    } catch (err) {
      return next({
        name: 'Error',
        state: {
          code: err.code,
          message: err.message,
          name: err.name,
        },
      });
    }
  },
  beforeRouteLeave(to, from) {
    // We only want to clear if we’re leaving the project for good or switching to another project so we don’t have to load the details again in the editor routes
    if (!to.meta.projectRoute || to.params.id !== from.params.id) this.$store.commit('clearCurrentProject');
    this.$store.commit('setAppProperty', { key: 'sidebarVisible', value: false });
  },
  components: {
    ProjectSidebar,
  },
  computed: {
    gitStatus() {
      const status = {
        color: 'positive',
        label: 'synced',
        loading: this.gitLoading,
        message: GIT_STATUS_MESSAGES.SYNCED,
      };

      const { progress, step, type } = this.currentOperation;

      if (this.$store.getters.hasLocalChanges(this.projectDir)) {
        status.color = 'warning';
        status.label = 'changes';
        status.message = GIT_STATUS_MESSAGES.CHANGES;
      }

      if (type === 'pull' && this.gitLoading) {
        if (step && !progress) status.message = `${GIT_STATUS_MESSAGES.PULLING}: ${step}`;
        else if (progress) status.message = `${GIT_STATUS_MESSAGES.PULLING}: ${step} ${(progress * 100).toFixed(2)}%`;
        else status.message = GIT_STATUS_MESSAGES.PULLING;
      }
      if (type === 'push' && this.gitLoading) {
        if (step && !progress) status.message = `${GIT_STATUS_MESSAGES.PUSHING}: ${step}`;
        else if (progress) status.message = `${GIT_STATUS_MESSAGES.PUSHING}: ${step} ${(progress * 100).toFixed(2)}%`;
        else status.message = GIT_STATUS_MESSAGES.PUSHING;
      }

      if (this.gitError) {
        status.color = 'negative';
        status.label = 'error';
        status.message = GIT_STATUS_MESSAGES.ERROR;
      }
      return status;
    },
    isPulling() {
      return this.currentOperation.type === 'pull' && this.gitLoading;
    },
    isPushing() {
      return this.currentOperation.type === 'push' && this.gitLoading;
    },
    lessThanHalfSelected() {
      return this.selectedChanges.length < this.changes.length / 2;
    },
    projectDir() {
      return `/projects/${this.$route.params.id}`;
    },
    selectedChanges() {
      return this.changes.filter((change) => change.selected);
    },
  },
  created() {
    this.$store.commit('setProjectAccessDate', { project: this.$route.params.id, value: Date.now() });
    this.$store.dispatch('saveUser');
  },
  data() {
    return {
      changeContextMenu: {
        fromRight: false,
        index: null,
        options: [
          {
            action: () => this.showFileChanges(this.changeContextMenu.index),
            icon: 'replace-alt',
            label: 'Show changes',
          },
          {
            action: () => { this.changeToDiscard = this.changes[this.changeContextMenu.index]; this.showDiscardConfirmationModal = true; },
            icon: 'trash',
            label: 'Discard changes',
            type: 'negative',
          },
        ],
        show: null,
        target: null,
        x: null,
        y: null,
      },
      changeDetails: {
        diff: null,
        file: null,
        type: null,
      },
      changes: [],
      changesLoading: true,
      commitMessage: '',
      currentOperation: {
        type: null,
        step: null,
        progress: null,
      },
      changeToDiscard: null,
      gitError: null,
      gitErrorRetryAction: null,
      gitLoading: false,
      showChangeDetailsModal: false,
      showChangesModal: false,
      showDiscardConfirmationModal: false,
      showGitErrorModal: false,
    };
  },
  methods: {
    async discardChanges() {
      // if it was added we just need to delete it
      if (this.changeToDiscard.type === 'add') {
        try {
          await fs.unlink(joinPath(this.projectDir, this.changeToDiscard.file));
        } catch (err) {
          this.$store.commit('addToast', { message: `Something went wrong during deletion while discarding the changes: ${err.message}`, type: 'error' });
        }
      } else { // otherwise checking it out should be fine
        try {
          await checkout({
            fs: PlainFS,
            dir: this.projectDir,
            force: true, // setting this to false will cause nothing to change
            filepaths: [this.changeToDiscard.file],
          });
          if (this.changeToDiscard.file === '.mattrbld/config.json') this.handleConfigChanged(true);
        } catch (err) {
          this.$store.commit('addToast', { message: `Something went wrong during checkout while discarding the changes: ${err.message}`, type: 'error' });
        }
      }
      // and then it should be removed from this.changes and locallyChangedFiles
      const changeIndex = this.changes.indexOf(this.changeToDiscard);
      if (changeIndex > -1) this.changes.splice(changeIndex, 1);
      this.$store.commit('removeLocallyChangedFile', joinPath(this.projectDir, this.changeToDiscard.file));
      this.$store.dispatch('saveAppData');
      this.showDiscardConfirmationModal = false;
    },
    gitAddAllAndCommit(changes, dryRun = false) {
      const { name, email } = this.$store.getters.userInCurrentProject;

      return addAllAndCommit(changes, {
        dir: this.projectDir,
        message: this.commitMessage || 'Update content through Mattrbld',
        author: {
          name,
          email,
        },
        dryRun,
        noUpdateBranch: dryRun || false,
      });
    },
    gitPush() {
      return push(
        {
          corsProxy: this.$store.state.currentProject.corsProxy,
          dir: this.projectDir,
        },
        this.onGitAuth,
        this.onGitAuthFailure,
        this.onGitAuthSuccess,
        this.onGitProgress,
      );
    },
    async handleConfigChanged(isDiscard) {
      try {
        const { project, users, avatarUrl } = await loadProject(this.$route.params.id, fs);
        Store.commit('setCurrentProject', {
          ...Store.state.currentProject,
          ...project,
          avatar: avatarUrl,
          users,
        });
        if (this.$refs.subview && this.$refs.subview.refresh) this.$refs.subview.refresh(); // refresh the dashboard
        if (isDiscard) this.$store.commit('addToast', { message: 'You discarded changes to the project configuration. The project was reloaded to reflect the previous configuration', timeout: 10000, type: 'positive' });
        else this.$store.commit('addToast', { message: 'Somebody updated the project configuration since it was last synchronised. It was reloaded', timeout: 10000, type: 'positive' });
      } catch (err) {
        if (isDiscard) this.$store.commit('addToast', { message: `Something went wrong while loading the original project configuration: ${err.message}`, type: 'error' });
        else this.$store.commit('addToast', { message: `Something went wrong while loading the newest project configuration: ${err.message}`, type: 'error' });
      }
    },
    handleGitErrorRetry() {
      if (!this.gitErrorRetryAction) return;
      this.gitErrorRetryAction();
      this.showGitErrorModal = false;
      this.gitErrorRetryAction = null;
    },
    async handleGitStatusClick() {
      if (this.gitError && this.gitStatus.label === 'error') this.showGitErrorModal = true;
      else if (this.gitStatus.label === 'changes') this.openChangesModal();
    },
    async handlePushError(err, changes) {
      await this.resetAfterFail(changes);
      this.currentOperation.type = null;
      this.currentOperation.step = null;
      this.currentOperation.progress = null;
      this.gitLoading = false;

      if (err.code === 'UserCanceledError') {
        this.showChangesModal = false;
      } else {
        this.gitError = err;
        this.gitErrorRetryAction = this.pushChanges;
        this.showGitErrorModal = true;
      }
    },
    handlePushWithEnter() {
      if (!this.isPushing && !this.changesLoading && this.selectedChanges.length > 0) this.pushChanges();
    },
    async onGitProgress(progress) {
      this.currentOperation.step = progress.phase;
      if (progress.total) this.currentOperation.progress = progress.loaded / progress.total;
      else this.currentOperation.progress = null;
    },
    openChangeContextMenu(e, index) {
      if (e.type === 'contextmenu') {
        this.changeContextMenu.x = e.clientX;
        this.changeContextMenu.y = e.clientY;
        this.changeContextMenu.fromRight = false;
      } else {
        const rect = e.target.getBoundingClientRect();
        this.changeContextMenu.x = rect.right;
        this.changeContextMenu.y = rect.top;
        this.changeContextMenu.fromRight = true;
      }

      this.changeContextMenu.index = index;
      this.changeContextMenu.target = e.currentTarget;
      this.changeContextMenu.show = true;
    },
    async openChangesModal() {
      this.changesLoading = true;
      this.showChangesModal = true;
      this.changes = (await statusMatrix({ fs: PlainFS, dir: this.projectDir }))
        .reduce((acc, change) => {
          if (change[2] !== change[3]) {
            let type;
            let color;

            // NOTE: see this to understand how these codes work: https://isomorphic-git.org/docs/en/statusMatrix
            if (change[1] === 1 && change[2] === 0 && change[3] === 1) {
              type = 'remove';
              color = 'negative';
            } else if (
              (change[1] === 1 && change[2] === 2 && change[3] === 1)
              || (change[1] === 0 && change[2] === 2 && change[3] === 3)
              || (change[1] === 1 && change[2] === 2 && change[3] === 3)
            ) {
              type = 'modify';
              color = 'warning';
            } else if (change[1] === 0 && change[2] === 2 && change[3] === 0) {
              type = 'add';
              color = 'positive';
            } else return acc;

            acc.push({
              file: change[0],
              selected: true,
              color,
              type,
            });
          }
          return acc;
        }, []);
      const actuallyChangedFiles = this.changes
        .map((change) => joinPath(this.projectDir, change.file)) // map changes to full project paths
        .concat(this.$store.state.application.locallyChangedFiles.filter((path) => !path.startsWith(this.projectDir))); // combine that list with all local changes that are not related to this project
      this.$store.commit('setLocallyChangedFiles', actuallyChangedFiles);
      await this.$store.dispatch('saveAppData');
      this.changesLoading = false;
    },
    async performInitialPull() {
      this.currentOperation.type = 'initial-pull';
      this.gitLoading = true;
      try {
        const configHasChanged = await this.pullAndCheckForConfigChange();
        if (configHasChanged) this.handleConfigChanged();
        else if (this.$refs.subview && this.$refs.subview.refresh) this.$refs.subview.refresh(); // refresh the dashboard
      } catch (err) {
        let hint;
        // NOTE: This isn’t exactly a robust way to detect errors, but it’s all the data I have…
        if (err.message === 'Failed to fetch') hint = 'Check your internet connection and make sure your CORS-proxy is set up correctly. Exiting and re-opening the project or reloading the page might help.';
        this.gitError = {
          code: err.code,
          data: err.data,
          message: err.message,
          name: err.name,
          hint,
        };
        this.gitErrorRetryAction = this.performInitialPull;
      }
      this.currentOperation.type = null;
      this.currentOperation.step = null;
      this.currentOperation.progress = null;
      this.gitLoading = false;
    },
    async pullAndCheckForConfigChange() {
      const headBeforePullOid = await resolveRef({ fs: PlainFS, dir: this.projectDir, ref: 'HEAD' });
      let currentConfigOid;
      let newConfigOid;
      try {
        ({ oid: currentConfigOid } = await readBlob({ fs: PlainFS, dir: this.projectDir, oid: headBeforePullOid, filepath: '.mattrbld/config.json' })); // eslint-disable-line object-curly-newline
      } catch (err) {
        if (err.code !== 'NotFoundError') throw err; // if it’s NotFoundError the file didn’t exist yet, for example because it’s a new project
      }

      const { name, email } = this.$store.getters.userInCurrentProject;
      await pull(
        {
          author: { name, email },
          corsProxy: this.$store.state.currentProject.corsProxy,
          dir: this.projectDir,
          singleBranch: true,
        },
        this.onGitAuth,
        this.onGitAuthFailure,
        this.onGitAuthSuccess,
        this.onGitProgress,
      );

      const headAfterPullOid = await resolveRef({ fs: PlainFS, dir: this.projectDir, ref: 'HEAD' });
      try {
        ({ oid: newConfigOid } = await readBlob({ fs: PlainFS, dir: this.projectDir, oid: headAfterPullOid, filepath: '.mattrbld/config.json' })); // eslint-disable-line object-curly-newline
      } catch (err) {
        if (err.code !== 'NotFoundError') throw err; // if it’s NotFoundError the file didn’t exist yet, for example because it’s a new project
      }
      if (currentConfigOid !== newConfigOid) { // the config was changed since the last sync, we need to reload the project
        return true;
      }
      return false;
    },
    async pullChanges() {
      this.gitLoading = true;
      this.currentOperation.type = 'pull';
      this.currentOperation.step = 'Fetching latest changes…';
      try {
        const configHasChanged = await this.pullAndCheckForConfigChange();
        if (configHasChanged) this.handleConfigChanged();
        else if (this.$refs.subview && this.$refs.subview.refresh) this.$refs.subview.refresh(); // refresh the dashboard
        this.$store.commit('addToast', { message: 'Successfully downloaded the latest remote changes', type: 'positive' });
      } catch (err) {
        let hint;
        // NOTE: This isn’t exactly a robust way to detect errors, but it’s all the data I have…
        if (err.code !== 'UserCanceledError') {
          if (err.message === 'Failed to fetch') hint = 'Check your internet connection and make sure your CORS-proxy is set up correctly. Exiting and re-opening the project or reloading the page might help.';
          this.gitError = {
            code: err.code,
            data: err.data,
            message: err.message,
            name: err.name,
            hint,
          };
          this.gitErrorRetryAction = this.pullChanges;
          this.showGitErrorModal = true;
        }
      }
      this.currentOperation.type = null;
      this.currentOperation.step = null;
      this.currentOperation.progress = null;
      this.gitLoading = false;
    },
    async pushChanges() {
      if (this.selectedChanges.length === 0) return;
      const { draftsDir } = this.$store.state.currentProject;
      let configHasChanged;

      this.gitLoading = true;
      this.currentOperation.type = 'push';
      this.currentOperation.step = 'Fetching latest changes…';

      try {
        configHasChanged = await this.pullAndCheckForConfigChange();
      } catch (err) {
        this.currentOperation.type = null;
        this.currentOperation.step = null;
        this.currentOperation.progress = null;
        this.gitLoading = false;
        if (err.code === 'UserCanceledError') return;
        let hint;
        // NOTE: This isn’t exactly a robust way to detect errors, but it’s all the data I have…
        if (err.message === 'Failed to fetch') hint = 'Check your internet connection and make sure your CORS-proxy is set up correctly. Exiting and re-opening the project or reloading the page might help.';
        this.gitError = {
          code: err.code,
          data: err.data,
          message: err.message,
          name: err.name,
          hint,
        };
        this.gitErrorRetryAction = this.pushChanges;
        this.showGitErrorModal = true;
        return;
      }

      if (draftsDir) {
        const changesWithoutDrafts = [];
        const drafts = [];
        const originalCommitMessage = this.commitMessage; // needs to be cached here since we’re changing it if pushing drafts

        this.currentOperation.step = 'Separating drafts from published content…';
        this.selectedChanges.forEach((change) => { // changes need to be turned into plain objects to be processable in the worker thread
          if (change.file.startsWith(draftsDir.replace(/^\//, ''))) drafts.push({ file: change.file, type: change.type });
          else changesWithoutDrafts.push({ file: change.file, type: change.type });
        });

        // commit and push them separately, drafts first so GitLab Pages (and potentially others) deploy and don’t abort because the ref is outdated
        if (drafts.length > 0) {
          this.currentOperation.step = 'Synching drafts…';
          this.commitMessage = this.commitMessage ? `${this.commitMessage} (drafts)` : 'Update drafts through Mattrbld';
          await this.gitAddAllAndCommit(drafts);
          try {
            await this.gitPush();
          } catch (err) {
            this.handlePushError(err, drafts);
            return;
          }
        }

        if (changesWithoutDrafts.length > 0) {
          this.currentOperation.step = 'Synching changes…';
          this.commitMessage = originalCommitMessage;
          await this.gitAddAllAndCommit(changesWithoutDrafts);
          try {
            await this.gitPush();
          } catch (err) {
            this.handlePushError(err, changesWithoutDrafts);
            return;
          }
        }
      } else {
        this.currentOperation.step = 'Gathering changes…';
        await this.$nextTick(); // wait a tick so the label has a chance to update
        const cleanChanges = this.selectedChanges.map((change) => ({ file: change.file, type: change.type })); // changes need to be turned into plain objects to be processable in the worker thread
        this.currentOperation.step = 'Synching changes…';
        await this.$nextTick(); // wait a tick so the label has a chance to update
        await this.gitAddAllAndCommit(cleanChanges);

        try {
          await this.gitPush();
        } catch (err) {
          this.handlePushError(err, cleanChanges);
          return;
        }
      }

      this.selectedChanges.forEach((change) => { // separate loop since we want them to only be removed if the push was successful
        this.$store.commit('removeLocallyChangedFile', `${this.projectDir}/${change.file}`);
      });
      this.$store.dispatch('saveAppData');

      this.showChangesModal = false;
      this.currentOperation.type = null;
      this.currentOperation.step = null;
      this.currentOperation.progress = null;
      this.gitLoading = false;
      this.$store.commit('addToast', { message: `Successfully synced ${this.selectedChanges.length} change${this.selectedChanges.length !== 1 ? 's' : ''}`, timeout: 2000, type: 'positive' });

      if (configHasChanged) this.handleConfigChanged();
      else if (this.$route.name === 'Project' && this.$refs.subview && this.$refs.subview.refresh) this.$refs.subview.refresh(); // refresh the dashboard
    },
    async resetAfterFail(changes) {
      // reset to last commit (https://github.com/isomorphic-git/isomorphic-git/issues/129, <commit> is log({depth: 1}).oid), unstage everything with resetIndex
      const currentBranch = await getCurrentBranch({
        fs: PlainFS,
        dir: this.projectDir,
        fullname: true,
      });
      const lastCommit = (await gitLog({
        fs: PlainFS,
        dir: this.projectDir,
        depth: 2,
      })).pop().oid;

      // reset HEAD to last successfully pushed commit, taken from here: https://github.com/isomorphic-git/isomorphic-git/issues/129 since no proper git reset --soft exists
      await fs.writeFile(`${this.projectDir}/.git/${currentBranch}`, lastCommit, 'utf8');

      // unstage everything
      await Promise.all(changes.map((change) => resetIndex({
        fs: PlainFS,
        dir: this.projectDir,
        filepath: change.file,
      })));
    },
    resetChangeContextMenu() {
      this.changeContextMenu.fromRight = false;
      this.changeContextMenu.index = null;
      this.changeContextMenu.show = null;
      this.changeContextMenu.target = null;
      this.changeContextMenu.x = null;
      this.changeContextMenu.y = null;
    },
    resetChangeDetails() {
      this.changeDetails.type = null;
      this.changeDetails.file = null;
      this.changeDetails.diff = null;
    },
    resetChangesModal() {
      this.changes = [];
      this.commitMessage = '';
    },
    async showFileChanges(index) {
      const change = this.changes[index];

      if (change.type === 'modify' && change.file.match(/.*\.(md|json|yml|yaml|config|conf)/)) { // NOTE: is there a better way to detect a plaintext file?
        const content = await fs.readFile(joinPath(this.projectDir, change.file), 'utf8');
        const headOid = await resolveRef({ fs: PlainFS, dir: this.projectDir, ref: 'HEAD' });
        const { blob } = await readBlob({ fs: PlainFS, dir: this.projectDir, oid: headOid, filepath: change.file }); // eslint-disable-line object-curly-newline
        const oldContent = new TextDecoder().decode(blob);
        let line = 0;
        this.changeDetails.diff = Diff.diffLines(oldContent, content).reduce((acc, lineChange, currentIndex, originalChanges) => {
          let lastChange;
          if (currentIndex > 0) lastChange = originalChanges[currentIndex - 1];

          if (lastChange && lastChange.removed) line += lineChange.count - lastChange.count;
          else line += lineChange.count;

          let type;
          if (lineChange.removed) type = 'remove';
          else if (lineChange.added) type = 'add';
          else type = 'unmodified';

          if (type !== 'unmodified') {
            acc.push({
              content: lineChange.value,
              line,
              lineEnd: line + (lineChange.count - 1),
              type,
            });
          }
          return acc;
        }, []);
      }

      this.changeDetails.file = change.file;
      this.changeDetails.type = change.type;
      this.showChangeDetailsModal = true;
    },
    toggleChangeSelection(e, index) {
      if (e.target.classList.contains('button')) return; // buttons have a ::before that covers them completely, so this is enough
      this.changes[index].selected = !this.changes[index].selected;
    },
    toggleSelectAll() {
      if (this.lessThanHalfSelected) this.changes.forEach((change) => { change.selected = true; }); // eslint-disable-line no-param-reassign
      else this.changes.forEach((change) => { change.selected = false; }); // eslint-disable-line no-param-reassign
    },
  },
  mixins: [gitAuth],
  props: {
    dark: Boolean,
  },
};
</script>

<style lang="scss" scoped>
  @use '../assets/styles/breakpoints' as *;

  .project  { // 100% minus the height of the app-header
    height: calc(100vh - rem(116));

    @media #{$tablet} {
      height: calc(100vh - rem(84));
    }

    @media #{$mobile} {
      height: calc(100vh - rem(82));
    }

    .subview {
      &.dark {
        background-color: var(--bg-dark);
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

  .error-modal {
    p {
      margin-top: 0;
    }

    pre {
      margin-bottom: 0;
      user-select: text;
    }
  }

  .changes-modal {
    &.dark .wrapper .changes li.empty-state {
      color: var(--text-secondary-dark);
    }

    .loader,
    .progress,
    .wrapper {
      &.v-enter-active,
      &.v-leave-active {
        transition: opacity 200ms ease;

        &.v-enter-from,
        &.v-leave-to {
          opacity: 0;
        }
      }
    }

    .loader {
      height: 16rem;
      margin-top: 1.5rem; // to match editor and prevent jumping
    }

    .progress {
      padding: 2rem;.progress {
        width: 100%;

        &:deep(.label) {
          text-align: center;
        }
      }
    }

    .wrapper {
      .editor {
        margin-bottom: 1rem;
      }

      > header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        position: sticky;
        top: 0;
        z-index: 1;
        background-color: var(--bg);
        padding: 1rem 0;

        &.dark {
          background-color: var(--bg-dark);
        }

        > span {
          margin-right: 0.5rem;
        }
      }

      .changes {
        list-style: none;
        margin: 0;

        li {
          display: flex;
          align-items: center;
          overflow: hidden;
          white-space: nowrap;

          &:not(:last-child) {
            margin-bottom: 1rem;
          }

          &.empty-state {
            padding: 1rem 0;
            justify-content: center;
            color: var(--text-secondary);
          }

          .checkbox {
            margin-right: 1rem;
          }

          .group {
            display: flex;
            align-items: center;
            overflow: hidden;
            padding: 1rem;
            background-color: var(--bg-tertiary);
            border-radius: var(--radius-m);
            width: 100%;
            cursor: pointer;
            transition: background-color 200ms ease;

            &:hover {
              background-color: var(--bg-secondary);
            }

            &.dark {
              background-color: var(--bg-secondary-dark);

              &:hover {
                background-color: var(--bg-tertiary-dark);
              }
            }

            .chip {
              margin-right: 1rem;
              flex-shrink: 0;
            }

            > span {
              overflow: hidden;
              text-overflow: ellipsis;
              margin-right: auto;
            }

            > .button {
              margin: -1rem -0.75rem -1rem 0.5rem;
              flex-shrink: 0;
            }
          }
        }
      }
    }
  }

  .change-details-modal {
    &.dark {
      .change .line-hint {
        color: var(--text-secondary-dark);
      }
    }

    .change {
      &:not(:last-child) {
        margin-bottom: 2rem;
      }

      .line-hint {
        font-size: 0.75rem;
        color: var(--text-secondary);
        margin-bottom: 0.25rem;
      }

      pre {
        margin: 0;
        padding: 0.5rem 0.75rem;
        border-radius: 0;
        color: inherit;

        &:first-of-type {
          border-top-left-radius: var(--radius-m);
          border-top-right-radius: var(--radius-m);
        }

        &:last-of-type {
          border-bottom-left-radius: var(--radius-m);
          border-bottom-right-radius: var(--radius-m);
        }

        &.add {
          background-color: color-mix(in srgb, var(--positive) 25%, transparent);
        }

        &.remove {
          background-color: color-mix(in srgb, var(--negative) 25%, transparent);
        }
      }
    }
  }
</style>
