<template>
  <div class="home" :class="{dark}">
    <header>
      <h1>Your Projects</h1>
      <MbProgress v-if="usedQuota !== false" :colors="['positive', 'warning', 'negative']" :dark="dark" :label="`Storage used: ≈ ${(usedQuota * 100).toFixed(2)}%`" :progress="usedQuota" />
    </header>
    <main>
      <transition-group class="grid" tag="div" @before-leave="setGridPosition">
        <MbProjectCard v-for="project in projectsWithoutSoftDeleted" :avatar="project.avatar" :dark="dark" :id="project.id" :key="project.id" :local-changes="project.localChanges" :name="project.name" :updated-at="project.updatedAt" @click="openProject(project.id)" @delete="deleteProject(project.id)" />
        <button class="add-project-button" :class="{dark}" key="addProjectButton" @click="showImportProject = true">
          <div class="icon-wrapper">
            <MbIcon icon="download" />
          </div>
          <span>Import Project</span>
        </button>
      </transition-group>
      <transition>
        <div v-show="!loaded" class="loader-wrapper">
          <MbLoader />
          <p>Loading Projects…</p>
        </div>
      </transition>
    </main>
    <footer :class="{ dark }">
      <a class="logo-wrapper" href="https://mattrbld.com" rel="noopener noreferrer" target="_blank">
        <MbLogo />
        <MbLogoText />
      </a>
      <ul>
        <li v-if="renderedImprint"><a href="#" @click.prevent="showImprint = true">Imprint</a></li>
        <li><a href="#" @click.prevent="showPrivacyPolicy = true">Privacy Policy</a></li>
        <li><p>Built with ♥ by <a href="https://amxmln.com" rel="noopener noreferrer" target="_blank">Amadeus Maximilian</a></p></li>
      </ul>
    </footer>
    <LegalModal v-if="renderedImprint" :dark="dark" title="Imprint" :visible="showImprint" @close="showImprint = false">
      <article v-html="renderedImprint" />
    </LegalModal>
    <LegalModal :dark="dark" title="Privacy Policy" :visible="showPrivacyPolicy" @close="showPrivacyPolicy = false">
      <article v-if="renderedPrivacyPolicy" v-html="renderedPrivacyPolicy" />
    </LegalModal>
    <MbModal class="import-project-modal" :dark="dark" :permanent="importing" title="Import Project" :visible="showImportProject" @close="cancelProjectImport" @after-open="handleImportModalOpen">
      <transition mode="out-in">
        <div v-if="!importing" class="form">
          <MbInput v-model="repoURL" :autofocus="!isMobile" :dark="dark" :error="errors.repoURL" icon="repo" label="Project Repository URL" ref="repoInput" @blur="handleRepoInput" @keyup.enter="$event.target.blur()" />
          <div class="label">
            <span>Repository branch:</span>
            <MbSelect v-model="repoBranch" :dark="dark" :disabled="Boolean(!repoURL || errors.repoURL || repoBranches.length === 0)" :loading="loadingBranches" :options="repoBranches" placeholder="Select a branch…" />
          </div>
          <GitLoginModal :dark="dark" :message="gitLoginMessage" :visible="showGitLoginModal" @cancel="credentialPromise('cancel')" @submit="credentialPromise" />
          <MbToggle v-model="showAdvancedSettings" :dark="dark">Advanced Options</MbToggle>
          <transition>
            <div v-show="showAdvancedSettings" class="advanced-settings">
              <MbInput v-model="corsProxy" :dark="dark" :error="errors.corsProxy" label="CORS Proxy URL" placeholder="https://cors.isomorphic-git.org" warn @blur="validate('corsProxy')" />
              <MbCheckbox v-model="overwriteCorsProxy" :dark="dark">Set this as the default CORS Proxy server</MbCheckbox>
            </div>
          </transition>
        </div>
        <div v-else class="loader">
          <MbProgress :dark="dark" :indetermined="!cloneProgress" :label="cloneLabel" :progress="cloneProgress" />
        </div>
      </transition>
      <template #actions>
        <MbButton :dark="dark" :disabled="importing" @click="cancelProjectImport(true)">Cancel</MbButton>
        <MbButton :dark="dark" :disabled="importDisabled || importing" icon="download" type="positive" @click="importProject">Import Project</MbButton>
      </template>
    </MbModal>
  </div>
</template>

<script>
import fs, { exists as entityExists } from '../fs';
import { rmrf } from '../fs/workerFS';
import { clone, listRemoteBranches } from '../git';

import isMattrbldProject from '../assets/js/isMattrbldProject';
import loadAndRenderLegalInfo from '../assets/js/loadAndRenderLegalInfo';
import warnAboutMeteredConnection from '../assets/js/warnAboutMeteredConnection';

import gitTools from '../mixins/gitTools';
import projectExists from '../mixins/projectExists';

import LegalModal from '../components/utility/LegalModal.vue';

export default {
  components: {
    LegalModal,
  },
  computed: {
    activeUser() {
      return this.$store.state.application.activeUser;
    },
    gitProvider() {
      try {
        return new URL(this.repoURL).hostname;
      } catch (err) {
        return 'Git';
      }
    },
    importDisabled() {
      return !this.repoURL || !this.repoBranch || this.errors.repoURL;
    },
    isMobile() {
      return this.$store.state.application.mobile;
    },
    projectsWithoutSoftDeleted() {
      return this.projects.filter((project) => !this.$store.getters.isSoftDeleted(`/projects/${project.id}`));
    },
  },
  async created() {
    await this.refreshStorageQuota();

    if (this.usedQuota > 0.9) this.$store.commit('addToast', { message: 'You might be running out of storage soon. Please free up some space by removing old projects to ensure that everything can run smoothly', timeout: false, type: 'warning' });

    this.fetchProjects();
    this.renderLegalInfo();
  },
  data() {
    return {
      corsProxy: this.$store.state.application.corsProxy,
      errors: {
        corsProxy: '',
        repoURL: '',
      },
      importing: false,
      lastRepoURL: '',
      loaded: false,
      loadingBranches: false,
      overwriteCorsProxy: false,
      projects: [],
      renderedImprint: null,
      renderedPrivacyPolicy: null,
      repoURL: '',
      repoBranch: null,
      repoBranches: [],
      showAdvancedSettings: false,
      showImportProject: false,
      showImprint: false,
      showPrivacyPolicy: false,
      usedQuota: 0,
    };
  },
  methods: {
    cancelProjectImport(clear) {
      if (clear) {
        this.corsProxy = this.$store.state.application.corsProxy;
        this.credentials = null;
        this.errors = {
          corsProxy: '',
          repoURL: '',
        };
        this.lastRepoURL = '';
        this.loadingBranches = false;
        this.overwriteCorsProxy = false;
        this.repoURL = '';
        this.repoBranch = null;
        this.repoBranches = [];
        this.showAdvancedSettings = false;
      }
      this.showImportProject = false;
    },
    deleteProject(id) {
      const index = this.projects.findIndex((project) => project.id === id);
      const project = this.projects[index];

      this.$store.commit('addToSoftDeleted', `/projects/${id}`);
      this.$store.commit('addToast', {
        action: () => {
          this.refetchAvatar(id);
          this.$store.commit('removeFromSoftDeleted', `/projects/${id}`);
        },
        actionLabel: 'Undo',
        closeOnRouteChange: true,
        message: `${project.name} ${project.localChanges ? 'and all unpublished changes were' : 'was'} deleted`,
        onClose: async (undone) => {
          if (undone) return;
          try {
            // Check if another user references this project
            const userFiles = await fs.readdir('/users');
            const rawUserData = await Promise.all(userFiles.reduce((acc, file) => { if (file.endsWith('.json')) acc.push(fs.readFile(`/users/${file}`, 'utf8')); return acc; }, []));
            const users = rawUserData.map((data) => JSON.parse(data));
            const usersWithThisProject = users.reduce((acc, user) => {
              if (user.projects.includes(id)) acc += 1; // eslint-disable-line no-param-reassign
              return acc;
            }, 0);
            // if so, just remove it from the active user
            this.$store.commit('removeProjectFromActiveUser', id);
            await this.$store.dispatch('saveUser');
            // otherwise also rmrf it
            if (usersWithThisProject < 2) {
              const projectPath = `/projects/${id}`;
              await rmrf(projectPath);
              this.$store.commit('removeLocallyChangedFolder', projectPath);
              await this.$store.dispatch('saveAppData');
            }
            if (index > -1) {
              this.projects.splice(index, 1);
              this.refreshStorageQuota();
            }
          } catch (err) {
            this.$store.commit('addToast', { message: `Something went wrong while deleting the project: ${err.message}`, type: 'error' });
          } finally {
            this.$store.commit('removeFromSoftDeleted', `/projects/${id}`);
          }
        },
        timeout: 5000,
        type: 'warning',
      });
    },
    async fetchProjects() {
      this.loaded = false;
      try {
        const { projects } = this.$store.state.user;
        const avatarPromises = [];
        const jsonPromises = [];
        projects.forEach((project) => {
          avatarPromises.push(fs.readFile(`/projects/${project}/.mattrbld/avatar.jpg`));
          jsonPromises.push(fs.readFile(`/projects/${project}/.mattrbld/config.json`, 'utf8'));
        });
        const avatars = await Promise.allSettled(avatarPromises);
        const jsonData = await Promise.allSettled(jsonPromises);
        const loadedProjects = [];

        jsonData.forEach((dataset, index) => {
          const id = projects[index];
          let project;
          if (dataset.status === 'rejected') project = { id, name: id };
          else project = { ...JSON.parse(dataset.value), id };

          project.updatedAt = this.$store.state.user.projectAccessDates[id] || Date.now();

          if (avatars[index].status !== 'rejected') {
            project.avatar = URL.createObjectURL(new Blob([avatars[index].value], { type: 'image/jpeg' })); // revoking is handled by the ProjectAvatar component
          }

          project.localChanges = this.$store.getters.hasLocalChanges(`/projects/${id}`);

          loadedProjects.push(project);
        });

        loadedProjects.sort((a, b) => b.updatedAt - a.updatedAt); // last modified first
        this.projects = loadedProjects;
      } catch (err) {
        this.$store.commit('addToast', { message: `Something went wrong while fetching the projects: ${err.message}`, type: 'error' });
      }
      this.loaded = true;
    },
    handleImportModalOpen() {
      this.$refs.repoInput.focus();
      warnAboutMeteredConnection();
    },
    async handleRepoInput() {
      this.validate('repoURL');

      if (!this.errors.repoURL && this.repoURL !== this.lastRepoURL) {
        this.loadingBranches = true;
        this.repoBranches = [];
        this.repoBranch = null;
        try {
          this.repoBranches = await listRemoteBranches({ corsProxy: this.corsProxy, url: this.repoURL }, this.onGitAuth, this.onGitAuthFailure, this.onGitAuthSuccess);

          this.repoBranch = this.getDefaultBranch(this.repoBranches);

          this.lastRepoURL = this.repoURL;
        } catch (err) {
          this.handleGitError(err);
        }
        this.loadingBranches = false;
      }
    },
    async importProject() {
      this.validate('repoURL');

      if (this.repoURL && !this.errors.repoURL && this.repoBranch) {
        this.importing = true;
        if (this.overwriteCorsProxy) {
          this.$store.commit('setAppProperty', { key: 'corsProxy', value: this.corsProxy });
          const saved = await this.$store.dispatch('saveAppData');
          if (!saved) return; // abort
        }
        // Generate Project Name (naive implementation, but should work considering we’re forcing the URL to be a HTTP one)
        let projectId = this.repoURL.split('/').slice(-1)[0].replace(/\.git$/, '');
        const exists = await this.projectExists(projectId, this.repoURL);
        // If a project with that filename exists, but it’s not the same
        if (exists && !exists.remote) projectId = `${projectId}-${Math.random().toString(36).substring(2, 9)}`; // add a pseudo-random suffix to make the id unique, could technically still cause collisions, but that’s so unlikely it’s negligible
        else if (exists && exists.remote && !exists.user) { // the project was already imported by a different user
          this.$store.commit('addProjectToActiveUser', projectId);
          await this.$store.dispatch('saveUser');
          this.cloneStep = 'done';
          this.importing = false;
          this.showImportProject = false;
          this.$store.commit('addToast', { message: 'Your project was imported successfully', type: 'positive' });
          this.$router.push({ name: 'Project', params: { id: projectId } });
          return; // abort
        } else if (exists && exists.remote) {
          this.$store.commit('addToast', {
            action: () => this.$router.push({ name: 'Project', params: { id: projectId } }),
            actionLabel: 'Open',
            message: 'This project was already imported on this device, would you like to open it?',
            type: 'warning',
          });
          this.importing = false;
          this.showImportProject = false; // so we can navigate if we choose to
          return; // abort
        }

        try {
          await fs.mkdir(`/projects/${projectId}`);
        } catch (err) {
          this.$store.commit('addToast', { message: `Something went wrong while creating the folder structure: ${err.message}`, type: 'error' });
          this.importing = false;
          return; // abort
        }
        try {
          await clone({
            dir: `/projects/${projectId}`,
            corsProxy: this.corsProxy,
            url: this.repoURL,
            ref: this.repoBranch,
            singleBranch: true,
            depth: 5,
          }, this.onGitAuth, this.onGitAuthFailure, this.onGitAuthSuccess, this.onGitProgress);
          this.cloneStep = 'checking configuration';
          this.cloneProgress = 0;
          const wasConfigured = await isMattrbldProject(projectId);

          let project;
          if (wasConfigured) {
            const projectDetails = [fs.readFile(`/projects/${projectId}/.mattrbld/avatar.jpg`), fs.readFile(`/projects/${projectId}/.mattrbld/config.json`, 'utf8')];
            const [avatar, config] = await Promise.allSettled(projectDetails);

            if (config.status !== 'rejected') {
              const projectData = JSON.parse(config.value);
              project = { id: projectId, name: projectData.name || projectId, updatedAt: Date.now() };
            } else project = { id: projectId, name: projectId, updatedAt: Date.now() };

            if (avatar.status !== 'rejected') project.avatar = URL.createObjectURL(new Blob([avatar.value], { type: 'image/jpeg' })); // revoking is handled by the ProjectAvatar component
            project.updatedAt = Date.now();
          } else project = { id: projectId, name: projectId, updatedAt: Date.now() };

          this.projects.unshift(project); // Insert at the beginning of the list

          this.$store.commit('addProjectToActiveUser', projectId);
          await this.$store.dispatch('saveUser');

          this.cloneStep = 'done';
          this.importing = false;
          this.showImportProject = false;

          this.$store.commit('addToast', { message: wasConfigured ? `${project.name} was imported successfully and is ready to be edited` : 'Your project was imported successfully and is ready to be configured', type: 'positive' });
          if (wasConfigured) this.$router.push({ name: 'Project', params: { id: projectId } });
          else this.$router.push({ name: 'Project.Settings', params: { id: projectId }, query: { tab: 'general' } });
          if (window.umami?.trackEvent) window.umami.trackEvent('import', { type: 'Project imported from Home' }); // legacy Umami 1.0
          else if (window.umami?.track) window.umami.track(() => ({ name: 'import', data: { type: 'Project imported from Home' } }));
        } catch (err) {
          this.$store.commit('addToast', { message: `Something went wrong while importing the project: ${err.message}`, type: 'error' });
          this.$store.commit('removeProjectFromActiveUser', projectId);
          const folderExists = await entityExists(`/projects/${projectId}`);
          if (folderExists) rmrf(`/projects/${projectId}`);
          this.$store.dispatch('saveUser');
        }
      }
    },
    openProject(id) {
      this.$router.push({ name: 'Project', params: { id } });
    },
    async refetchAvatar(projectId) {
      const project = this.projects.find((existingProject) => existingProject.id === projectId);
      if (project.avatar) {
        project.avatar = null;
        const avatarData = await fs.readFile(`/projects/${projectId}/.mattrbld/avatar.jpg`);
        const avatarUrl = URL.createObjectURL(new Blob([avatarData], { type: 'image/jpeg' })); // revoking is handled by the ProjectAvatar component
        project.avatar = avatarUrl;
      }
    },
    async refreshStorageQuota() {
      try {
        const estimate = await navigator.storage.estimate();
        this.usedQuota = estimate.usage / estimate.quota;
      } catch (err) {
        this.$store.commit('addToast', {
          message: 'We could not estimate how much storage Mattrbld is using on your device. Please be aware that you might have to periodically remove old projects to free some space',
          id: 'storageWarning',
          timeout: false,
          type: 'warning',
        });
      }
    },
    async renderLegalInfo() {
      const { renderedImprint, renderedPrivacyPolicy } = await loadAndRenderLegalInfo();
      this.renderedImprint = renderedImprint;
      this.renderedPrivacyPolicy = renderedPrivacyPolicy;
    },
    setGridPosition(el) {
      el.style.setProperty('top', `${el.offsetTop}px`);
      el.style.setProperty('left', `${el.offsetLeft}px`);
      el.style.setProperty('width', `${el.offsetWidth}px`);
      el.style.setProperty('height', `${el.offsetHeight}px`);
      el.style.setProperty('position', 'absolute');
    },
    validate(field) {
      let error = '';
      switch (field) {
        case 'corsProxy':
          if (!this.corsProxy) error = 'A proxy server url is required in most cases';
          else if (!this.corsProxy.startsWith('/') && !this.corsProxy.startsWith('https://')) error = 'The proxy server should be reachable over HTTPS for security reasons';
          break;
        case 'repoURL':
          if (!this.repoURL) error = 'A repository URL is required';
          else if (!this.repoURL.startsWith('http')) error = 'URL has to be a http(s) URL';
          else if (!this.repoURL.endsWith('.git')) error = 'URL has to end with .git';
          // just checks if we’re using http(s) and it ends with .git
          else if (!/https?:\/\/.*\.git$/.test(this.repoURL)) error = 'Invalid URL, only https URLs ending in .git are supported';
          break;
        default:
          // no op
      }
      this.errors[field] = error;
    },
  },
  mixins: [
    gitTools,
    projectExists,
  ],
  mounted() {
    if (window.umami?.trackView) window.umami.trackView('/'); // legacy Umami 1.0
    else if (window.umami?.track) window.umami.track((props) => ({ ...props, url: '/' }));
  },
  props: {
    dark: Boolean,
  },
  watch: {
    activeUser(nv, ov) {
      if (nv && nv !== ov) {
        this.projects = [];
        this.credentials = null;
        this.fetchProjects();
      }
    },
  },
};
</script>

<style lang="scss" scoped>
  @use '../assets/styles/breakpoints' as *;

  .home {
    &.dark {
      main,
      main .loader-wrapper {
        background-color: var(--bg-secondary-dark);
      }
    }

    header {
      display: flex;
      align-items: center;
      padding: 0 2rem;
      padding-bottom: 2rem;

      @media #{$mobile} {
        padding: 0 1rem;
        padding-bottom: 1rem;
        display: block;
      }

      h1 {
        margin: 0;

        @media #{$mobile} {
          margin-bottom: 1rem;
        }
      }

      .progress {
        margin-left: auto;
      }
    }

    main {
      position: relative;
      background-color: var(--bg-secondary);
      height: calc(100vh - rem(196 + 72)); // header + footer
      overflow-x: hidden;
      overflow-y: auto;
      padding: 2rem;

      @media #{$mobile} {
        height: auto;
        padding: 1rem;
        overflow: visible;
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, rem(320));
        grid-auto-rows: rem(246);
        grid-gap: 2rem;
        justify-content: center;

        @media #{$mobile} {
          display: block;

          .project-card,
          .add-project-button {
            width: 100%;
            max-width: rem(320);
            margin-left: auto;
            margin-right: auto;
            margin-bottom: 1rem;
          }
        }

        .add-project-button {
          position: relative;
          background-color: var(--bg);
          border: none;
          color: inherit;
          padding: 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          border-radius: var(--radius-m);
          box-shadow: inset 0 0 0 0.0625rem var(--accent);
          cursor: pointer;
          transition: background-color 200ms ease;

          &.dark {
            background-color: var(--bg-tertiary-dark);

            &:focus,
            &:hover {
              background-color: var(--bg-secondary-dark);
            }

            &:active {
              background-color: var(--bg-dark);
            }
          }

          &:focus,
          &:hover {
            background-color: var(--bg-secondary);
          }

          &:focus::before {
            opacity: 1;
          }

          &:active {
            background-color: var(--bg-tertiary);
            transform: translateY(2px);
          }

          &::before {
            content: '';
            position: absolute;
            top: 0px;
            left: 0px;
            right: 0px;
            bottom: 0px;
            border: 2px solid var(--accent);
            opacity: 0;
            border-radius: var(--radius-m);
            pointer-events: none;
            transition: opacity 200ms ease;
          }

          .icon-wrapper {
            padding: 1rem;
            border-radius: 50%;
            background-color: var(--accent-secondary);
            margin-bottom: 1rem;
            color: var(--text-dark);

            .icon {
              width: 2rem;
              height: 2rem;
            }
          }
        }

        .v-enter-active,
        .v-leave-active,
        .v-move {
          transition: transform 350ms ease, opacity 350ms ease;

          &.v-enter-from,
          &.v-leave-to {
            transform: scale(0.8);
            opacity: 0;
          }
        }
      }

      .loader-wrapper {
        background-color: var(--bg-secondary);
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        flex-direction: column;

        &.v-enter-active,
        &.v-leave-active {
          transition: opacity 500ms ease;

          &.v-enter-from,
          &.v-leave-to {
            opacity: 0;
          }
        }
      }
    }

    > footer {
      background-color: var(--bg-secondary);
      color: var(--text-secondary);
      padding: 1rem 2rem;
      padding-bottom: 1.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;

      &.dark {
        background-color: var(--bg-secondary-dark);
        color: var(--text-secondary-dark);
      }

      .logo-wrapper {
        display: flex;
        align-items: center;
        background-image: none;
        color: inherit;

        &:hover {
          color: var(--accent);
        }

        .logo {
          flex-shrink: 0;
          margin-right: 0.75rem;
          width: 2rem;
          height: 2rem;
        }

        .logo-text {
          flex-shrink: 0;
          width: rem(96);
          height: 1rem;
          margin: 0;
        }
      }

      ul {
        list-style: none;
        margin: 0;

        li {
          display: inline-block;

          &:not(:last-child)::after {
            content: '×';
            margin-left: 0.5rem;
            margin-right: 0.5rem;
          }
        }
      }

      @media #{$mobile} {
        padding: 1rem;
        flex-direction: column;
        text-align: center;

        .logo-wrapper {
          margin: 1.5rem 0;
        }
      }
    }
  }

  .import-project-modal {
    .form,
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

    .form {
      .toggle {
        font-weight: 700;
        margin-bottom: 1rem;
      }

      .advanced-settings {
        &.v-enter-active,
        &.v-leave-active {
          transition: opacity 200ms ease;

          &.v-enter-from,
          &.v-leave-to {
            opacity: 0;
          }
        }
      }

      .input {
        width: 100%;
        margin-bottom: 1rem;
      }

      .label {
        display: flex;
        align-items: center;
        margin-bottom: 2rem;

        @media #{$mobile} {
          display: block;

          &:deep(.select)  { // needed because it’s a fragment element I guess?
            width: 100%;
          }
        }

        span {
          margin-right: auto;

          @media #{$mobile} {
            display: block;
            margin-bottom: 1rem;
          }
        }
      }
    }

    .loader {
      padding: 2rem;

      .progress {
        width: 100%;

        &:deep(.label) {
          text-align: center;
        }
      }
    }
  }
</style>
