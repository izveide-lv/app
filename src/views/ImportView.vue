<template>
  <div class="import" :class="{ dark }">
    <section class="intro">
      <div class="icon-wrapper">
        <MbIcon icon="mattrbld" />
      </div>
      <h1>Hei{{ firstname ? `, ${firstname}` : '' }}!</h1>
      <p v-if="projectName && inviter"><strong>{{inviter}}</strong> tevi ielūdza projektā <strong>{{projectName}}</strong>.</p>
      <p v-else-if="inviter"><strong>{{inviter}}</strong> ielūdza tevi savā projektā.</p>
      <p v-else-if="projectName">Tu tiki ielūgts darboties projektā <strong>{{projectName}}</strong>.</p>
      <p v-else>Tu tiki ielūgts darboties projektā.</p>
      <p>Pārliecinies, ka informācija ir korekta, pirms turpini.</p>
    </section>
    <section>
      <h2>Lietotāja informācija</h2>
      <MbInput v-model.lazy="email" :dark="dark" :disabled="Boolean($route.query.email)" :error="errors.email" icon="mail" label="E-pasts" type="email" @blur="validate('email')" />
      <MbInput v-model.lazy="name" :dark="dark" :error="errors.name" icon="user" label="Vārds" @blur="validate('name')" />
      <MbButton v-if="$route.query.proxy" :dark="dark" :disabled="Boolean(!name || !email || errors.name || errors.email)" type="primary" @click="handleImportClik">Sākt darbu</MbButton>
    </section>
    <!-- <section v-if="!$route.query.proxy">
      <h2>Advanced Settings</h2>
      <MbInput v-model.lazy="proxy" :dark="dark" :error="errors.proxy" label="CORS Proxy" @blur="validate('proxy')" />
      <MbButton :dark="dark" :disabled="Boolean(!name || !email || errors.name || errors.email)" type="primary" @click="handleImportClik">Start editing</MbButton>
    </section> -->
    <MbModal class="import-project-modal" :dark="dark" permanent title="Importing Project" :visible="importing" @after-open="startProjectImport">
      <div class="loader">
        <MbProgress :dark="dark" :indetermined="!cloneProgress" :label="cloneLabel" :progress="cloneProgress" />
      </div>
    </MbModal>
    <GitLoginModal :dark="dark" :message="gitLoginMessage" :visible="showGitLoginModal" @cancel="credentialPromise('cancel')" @submit="credentialPromise" />
  </div>
</template>

<script>
import slugify from '@sindresorhus/slugify';

import fs, { exists as entityExists } from '../fs';
import { rmrf } from '../fs/workerFS';
import { clone } from '../git';

import generateAvatar from '../assets/js/generateAvatar';
import isMattrbldProject from '../assets/js/isMattrbldProject';
import warnAboutMeteredConnection from '../assets/js/warnAboutMeteredConnection';

import gitTools from '../mixins/gitTools';
import projectExists from '../mixins/projectExists';

export default {
  beforeRouteEnter(to, from, next) {
    const {
      name, email, repo, branch, proxy,
    } = to.query;

    if (!repo || !branch) next({ name: 'Error', state: { message: 'The invite URL is invalid', name: 'InvalidInviteError', stage: 'init' } });

    next((vm) => {
      /* eslint-disable no-param-reassign */
      vm.name = name;
      vm.email = email;
      vm.repo = repo;
      vm.branch = branch;
      vm.proxy = proxy;
      /* eslint-enable no-param-reassign */
    });
  },
  computed: {
    firstname() {
      if (!this.name) return '';
      return this.name.split(' ')[0];
    },
    gitProvider() {
      try {
        return new URL(this.repo).hostname;
      } catch (err) {
        return 'Git';
      }
    },
    inviter() {
      return this.$route.query.inviter;
    },
    projectName() {
      return this.$route.query.projectName;
    },
  },
  created() {
    warnAboutMeteredConnection();
  },
  data() {
    return {
      branch: '',
      email: '',
      errors: {
        email: '',
        name: '',
      },
      importing: false,
      name: '',
      proxy: '',
      repo: '',
    };
  },
  methods: {
    async createBaseFolders() {
      try {
        await Promise.all([fs.mkdir('/projects'), fs.mkdir('/users')]);
      } catch (err) {
        if (err.code !== 'EEXIST') throw err;
      }
    },
    async createUser() {
      let newUserId = slugify(this.email.trim()); // WARNING: this could lead to collisions if there’s two very similar email addresses (foo-bar@exmaple.com foo.bar@example.com), but since we have a low amount of local users, I think it’s negligible
      let alreadyExists = await entityExists(`/users/${newUserId}.json`);

      while (alreadyExists) {
        newUserId += `-${Math.random().toString(36).slice(2, 9)}`;
        alreadyExists = await entityExists(`/users/${newUserId}.json`); // eslint-disable-line no-await-in-loop
      }

      const avatar = generateAvatar(this.name, '#A29BFE', '#6c5ce7', 'light', this.email);
      const byteString = window.atob(avatar.split(',')[1]);
      const avatarData = Uint8Array.from(byteString, (ch) => ch.charCodeAt(0));
      const user = {
        email: this.email.trim(),
        id: newUserId,
        name: this.name.trim(),
        projectAccessDates: {},
        projects: [],
      };

      await fs.writeFile(`/users/${newUserId}.json`, JSON.stringify(user, null, 2), 'utf8');
      await fs.writeFile(`/users/${newUserId}.jpg`, avatarData); // we know it’s a image/jpeg because we created it ourselves

      return user;
    },
    handleImportClik() {
      if (!this.repo || !this.branch) this.$store.commit('addToast', { message: 'Something went wrong when starting the import: the invite URL is invalid', type: 'error' });
      this.validate('name');
      this.validate('email');
      if (this.errors.name || this.errors.email) this.$store.commit('addToast', { message: 'Please fix the errors and try again', type: 'negative' });

      this.importing = true;
    },
    async importProject() {
      const corsProxy = this.proxy || this.$store.state.application.corsProxy; // fall back to application proxy if it exists and is not provided in URL

      // Generate Project Name (naive implementation, but should work considering we’re forcing the URL to be a HTTP one)
      let projectId = this.repo.split('/').slice(-1)[0].replace(/\.git$/, '');
      const exists = await this.projectExists(projectId, this.repo);
      // If a project with that filename exists, but it’s not the same
      if (exists && !exists.remote) projectId = `${projectId}-${Math.random().toString(36).substring(2, 9)}`; // add a pseudo-random suffix to make the id unique, could technically still cause collisions, but that’s so unlikely it’s negligible
      else if (exists && exists.remote && !exists.user) { // the project was already imported by a different user
        this.$store.commit('addProjectToActiveUser', projectId);
        await this.$store.dispatch('saveUser');
        this.cloneStep = 'checking configuration';
        this.cloneProgress = 0;
        const wasConfigured = await isMattrbldProject(projectId);
        this.cloneStep = 'done';
        this.$store.commit('addToast', { message: `The project was imported successfully and is ready to be ${wasConfigured ? 'edited' : 'configured'}`, type: 'positive' });
        return { id: projectId, wasConfigured }; // abort
      } else if (exists && exists.remote) {
        this.$store.commit('addToast', {
          message: 'You are already a member of this project and have imported it on this device',
          type: 'warning',
        });
        this.cloneStep = 'checking configuration';
        this.cloneProgress = 0;
        const wasConfigured = await isMattrbldProject(projectId);
        this.cloneStep = 'done';
        return { id: projectId, wasConfigured }; // abort
      }

      try {
        await fs.mkdir(`/projects/${projectId}`);
      } catch (err) {
        this.$store.commit('addToast', { message: `Something went wrong while creating the folder structure: ${err.message}`, type: 'error' });
        return null;
      }
      try {
        await clone({
          dir: `/projects/${projectId}`,
          corsProxy,
          url: this.repo,
          ref: this.branch,
          singleBranch: true,
          depth: 5,
        }, this.onGitAuth, this.onGitAuthFailure, this.onGitAuthSuccess, this.onGitProgress);
        this.cloneStep = 'checking configuration';
        this.cloneProgress = 0;
        const wasConfigured = await isMattrbldProject(projectId);

        this.$store.commit('addProjectToActiveUser', projectId);
        await this.$store.dispatch('saveUser');

        this.cloneStep = 'done';

        this.$store.commit('addToast', { message: `The project was imported sucessfully and is ready to be ${wasConfigured ? 'edited' : 'configured'}`, type: 'positive' });
        return { id: projectId, wasConfigured };
      } catch (err) {
        this.$store.commit('addToast', { message: `Something went wrong while importing the project: ${err.message}`, type: 'error' });
        this.$store.commit('removeProjectFromActiveUser', projectId);
        const folderExists = await entityExists(`/projects/${projectId}`);
        if (folderExists) rmrf(`/projects/${projectId}`);
        this.$store.dispatch('saveUser');
        return null;
      }
    },
    async setActiveUser(user) {
      const userData = {
        ...user,
        gitAuth: null,
        theme: user.theme || 'auto',
        uiScale: user.uiScale || 'auto',
      };
      this.$store.commit('setUserData', userData);
      this.$store.commit('setAppProperty', { key: 'activeUser', value: user.id });
      await this.$store.dispatch('saveAppData');
    },
    async startProjectImport() {
      if (this.$store.state.application.activeUser) {
        // Mattrbld was initialised with a user before, so the neccessary directories should exist
        // Check if there already is a local user with this email
        this.cloneStep = 'checking existing users';
        if (this.email !== this.$store.state.user.email) { // otherwise we don’t need to do anything
          let existingUserWithEmail = null;
          try {
            const users = await fs.readdir('/users');
            const userPromises = [];

            users.forEach((userFile) => {
              if (userFile.endsWith('.json')) userPromises.push(fs.readFile(`/users/${userFile}`, 'utf8'));
            });

            const userJsonStrings = await Promise.all(userPromises);
            const userData = userJsonStrings.map((json) => JSON.parse(json));
            existingUserWithEmail = userData.find((user) => user.email === this.email);
          } catch (err) {
            this.$store.commit('addToast', { message: `Something went wrong while fetching all users: ${err.message}`, type: 'error' });
            this.importing = false;
            return;
          }

          if (!existingUserWithEmail) {
            // if not create it
            this.cloneStep = 'creating user';
            try {
              existingUserWithEmail = await this.createUser();
            } catch (err) {
              this.$store.commit('addToast', { message: `Something went wrong while creating the user: ${err.message}`, type: 'error' });
              this.importing = false;
              return;
            }
          }

          // make it the active user
          await this.setActiveUser(existingUserWithEmail);
        }
      } else {
        // Mattrbld hasn’t been used on this device before, we need to do a full onboarding flow
        this.cloneStep = 'creating base directories';
        try {
          await this.createBaseFolders();
        } catch (err) {
          this.$store.commit('addToast', { message: `Something went wrong while creating the base folder structure: ${err.message}`, type: 'error' });
          this.importing = false;
          return;
        }

        this.cloneStep = 'creating user';
        try {
          const user = await this.createUser();
          await this.setActiveUser(user);
        } catch (err) {
          this.$store.commit('addToast', { message: `Something went wrong while creating the user: ${err.message}`, type: 'error' });
          this.importing = false;
          return;
        }

        this.cloneStep = 'saving configuration';
        try {
          const config = {
            corsProxy: this.proxy,
            initialised: true,
          };

          this.$store.commit('setAppData', { ...this.$store.state.application, ...config });
          await this.$store.dispatch('saveAppData');
        } catch (err) {
          this.$store.commit('addToast', { message: `Something went wrong while saving the configuration: ${err.message}`, type: 'error' });
          this.importing = false;
          return;
        }
      }

      this.cloneStep = 'importing project';
      const project = await this.importProject();
      this.importing = false;
      if (!project) return; // there must’ve been an error
      if (project.wasConfigured) this.$router.replace({ name: 'Project', params: { id: project.id } });
      else this.$router.replace({ name: 'Project.Settings', params: { id: project.id }, query: { tab: 'general' } });
      if (window.umami?.trackEvent) window.umami.trackEvent('import', { type: 'Invite link used' }); // legacy Umami 1.0
      else if (window.umami?.track) window.umami.track(() => ({ name: 'import', data: { type: 'Invite link used' } }));
    },
    validate(field) {
      let error = '';
      switch (field) {
        case 'email':
          if (!this.email) error = 'An email address is required';
          else if (!/^([a-z0-9_.+-]+)@([\da-z.-]+)\.([a-z.]{2,6})$/.test(this.email)) error = 'Invalid address'; // Regex source: https://graphcms.com/user-guides/working-with/field-validations
          break;
        case 'name':
          if (!this.name) error = 'Please let your collaborators know who you are';
          break;
        case 'proxy':
          if (!this.proxy) error = 'A proxy server url is required in most cases';
          else if (!this.proxy.startsWith('/') && !this.proxy.startsWith('https://')) error = 'The proxy server should be reachable over HTTPS for security reasons';
          break;
        default:
          // no op
      }
      this.errors[field] = error;
    },
  },
  mixins: [gitTools, projectExists],
  mounted() {
    if (window.umami?.trackView) window.umami.trackView('/import'); // legacy Umami 1.0
    else if (window.umami?.track) window.umami.track((props) => ({ ...props, url: '/import' }));
  },
  props: {
    dark: Boolean,
  },
};
</script>

<style lang="scss" scoped>
  @use '../assets/styles/breakpoints' as *;

  .import {
    user-select: none;
    display: flex;
    min-height: 100vh;
    flex-direction: column;
    justify-content: center;
    padding: 2rem 2rem 6rem 2rem;

    @media #{$mobile} {
      padding-left: 1rem;
      padding-right: 1rem;
      padding-bottom: 4rem;
    }

    &.dark > section {
      > h2 {
        color: var(--text-secondary-dark);
      }
    }

    > section {
      width: 100%;
      max-width: rem(544);
      margin: 0 auto;

      &:not(:last-child) {
        margin-bottom: 4rem;
      }

      &.intro {
        .icon-wrapper {
          display: inline-block;
          color: var(--text-dark);
          background-color: var(--accent);
          padding: 1rem;
          border-radius: 50%;

          .icon {
            width: 3rem;
            height: 3rem;
          }
        }

        h1 {
          @media #{$mobile} {
            margin-top: 2rem;
          }
        }

        p:last-child {
          margin-bottom: 0;
        }
      }

      > h2 {
        margin-top: 0;
        color: var(--text-secondary);

        + .input {
          margin-top: 2rem;
        }
      }

      > .input {
        display: flex;
        width: 100%;

        &:not(:last-child) {
          margin-bottom: 2rem;
        }
      }

      > .button {
        display: flex;
        margin-left: auto;
      }
    }
  }

  .import-project-modal {
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
