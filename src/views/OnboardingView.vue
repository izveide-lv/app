<template>
  <div class="onboarding" :class="{ dark }">
    <section class="animation">
      <header>
        <MbIcon :icon="currentStep.icon" />
      </header>
      <div class="bubble one" :style="{ transform: currentStep.bubbles[0] }" />
      <div class="bubble two" :style="{ transform: currentStep.bubbles[1] }" />
      <div class="bubble three" :style="{ transform: currentStep.bubbles[2] }" />
      <div class="bubble four" :style="{ transform: currentStep.bubbles[3] }" />
      <transition appear mode="out-in">
        <p class="h1 message" :key="currentSlide">{{currentStep.message}}</p>
      </transition>
    </section>
    <section class="steps">
      <header>
        <MbProgress :class="{ faded: !cloneStep }" :dark="dark" :indetermined="!cloneProgress" :label="cloneLabel" :progress="cloneProgress" />
      </header>
      <transition mode="out-in">
        <div v-if="currentSlide === 0" class="slide">
          <h1>Esi sveicināts Izveidē! 👋</h1>
          <p class="blurb">
            Sāksim ar pirmā projekta importēšanu. Nezini, ar ko sākt?
            Vari iepazīties ar <a href="https://mattrbld.com/docs/quickstart/" rel="noopener noreferrer" target="_blank">pamācību</a> (angļu valodā).
          </p>
          <MbInput v-model="repoURL" :autofocus="!isMobile" :dark="dark" :error="errors.repoURL" icon="repo" label="Projekta repozitorija URL" ref="repoInput" @blur="handleRepoInput" @keyup.enter="$event.target.blur()" />
          <div class="label">
            <span>Repozitorija zars:</span>
            <MbSelect v-model="repoBranch" :dark="dark" :disabled="Boolean(!repoURL || errors.repoURL || repoBranches.length === 0)" :loading="loadingBranches" :options="repoBranches" placeholder="Izvēlies zaru..." />
          </div>
          <GitLoginModal :dark="dark" :message="gitLoginMessage" :visible="showGitLoginModal" @cancel="credentialPromise('cancel')" @submit="credentialPromise" />
          <footer>
            <MbButton :dark="dark" :disabled="Boolean(!repoURL || errors.repoURL || loadingBranches || !repoBranch)" type="primary" @click="importProject">Importēt projektu</MbButton>
          </footer>
          <footer class="meta-info">
            <a v-if="renderedImprint" href="#" @click.prevent="showImprint = true">Imprint</a>
            <a href="#" @click.prevent="showPrivacyPolicy = true">Saistību atruna</a>
          </footer>
          <LegalModal v-if="renderedImprint" :dark="dark" title="Imprint" :visible="showImprint" @close="showImprint = false">
            <article v-html="renderedImprint" />
          </LegalModal>
          <LegalModal :dark="dark" title="Saistību atruna" :visible="showPrivacyPolicy" @close="showPrivacyPolicy = false">
            <article v-if="renderedPrivacyPolicy" v-html="renderedPrivacyPolicy" />
          </LegalModal>
        </div>
        <div v-else-if="currentSlide === 1" class="slide">
          <h1>Great!</h1>
          <p class="blurb">While the project is being imported, let’s set up your local user. This data will be used to let your collaborators know who you are.</p>
          <MbInput v-model="userName" :autofocus="!isMobile" :dark="dark" :error="errors.userName" icon="user" label="Name" @blur="validate('userName')" />
          <MbInput v-model="userEmail" :dark="dark" :error="errors.userEmail" icon="mail" label="Email Address" type="email" @blur="validate('userEmail')" />
          <footer>
            <MbButton :dark="dark" :disabled="Boolean(!userName || !userEmail || errors.userName || errors.userEmail)" type="primary" @click="createUser">Create User</MbButton>
          </footer>
        </div>
        <div v-else-if="currentSlide === 2" class="slide">
          <AvatarUploader ref="uploader" @ready="handleAvatarReady" />
          <h1>Almost there!</h1>
          <p class="blurb">You can add an avatar to your profile so your collaborators know at a glance who made those great changes—or use the one we generated for you, your choice.</p>
          <img :src="userAvatar" alt="Avatar could not be loaded">
          <div class="avatar-buttons">
            <MbButton v-show="avatarUploaded" :dark="dark" icon-first icon="trash" type="negative" @click="regenerateAvatar">Remove Image</MbButton>
            <MbButton :dark="dark" icon-first :icon="avatarUploaded ? 'replace-alt' : 'upload'" @click="$refs.uploader.$el.click()">{{ avatarUploaded ? 'Replace Image' : 'Upload Image' }}</MbButton>
          </div>
          <footer>
            <MbButton :dark="dark" type="primary" @click="completeSetup">Save Avatar</MbButton>
          </footer>
        </div>
        <div v-else-if="currentSlide === 3" class="slide">
          <h1>Just a moment…</h1>
          <p>We’re finishing the import of your project. This shouldn’t take long.</p>
        </div>
        <div v-else-if="currentSlide === 4" class="slide">
          <h1>You’re all set!</h1>
          <p v-if="isMattrbldProject">Your project has been imported successfully and is ready to be edited.</p>
          <template v-else>
            <p>Your project has been imported successfully and is now ready to be set up to work with Mattrbld.</p>
            <p>If you’re not sure where to begin, check out the <a href="https://mattrbld.com/docs/quickstart/#defining-your-first-schema" target="_blank" rel="noopener noreferrer">Quickstart Guide</a>.</p>
          </template>
          <footer>
            <MbButton :dark="dark" type="primary" @click="openProject">Start {{ isMattrbldProject ? 'Editing' : 'Setup' }}</MbButton>
          </footer>
        </div>
      </transition>
    </section>
  </div>
</template>

<script>
import slugify from '@sindresorhus/slugify';

import fs from '../fs';
import { rmrf } from '../fs/workerFS';
import { clone, listRemoteBranches } from '../git';

import generateAvatar from '../assets/js/generateAvatar';
import isMattrbldProject from '../assets/js/isMattrbldProject';
import loadAndRenderLegalInfo from '../assets/js/loadAndRenderLegalInfo';
import warnAboutMeteredConnection from '../assets/js/warnAboutMeteredConnection';

import AvatarUploader from '../components/utility/AvatarUploader.vue';
import LegalModal from '../components/utility/LegalModal.vue';

import gitTools from '../mixins/gitTools';

export default {
  components: {
    AvatarUploader,
    LegalModal,
  },
  computed: {
    currentStep() {
      return this.steps[this.currentSlide];
    },
    gitProvider() {
      try {
        return new URL(this.repoURL).hostname;
      } catch (err) {
        return 'Git';
      }
    },
    isMobile() {
      return this.$store.state.application.mobile;
    },
  },
  created() {
    warnAboutMeteredConnection();
    this.renderLegalInfo();
  },
  data() {
    return {
      avatarUploaded: false,
      corsProxy: 'https://izveide.armands.workers.dev/corsprox/', // Requires a /corsprox route configured on the server, or a CORSProx instance on 9999
      currentSlide: 0,
      errors: {
        corsProxy: '',
        repoURL: '',
        userEmail: '',
        userName: '',
      },
      isMattrbldProject: false,
      lastRepoURL: '',
      loadingBranches: false,
      projectName: '',
      renderedImprint: null,
      renderedPrivacyPolicy: null,
      repoURL: '',
      repoBranch: null,
      repoBranches: [],
      showAdvancedSettings: false,
      showImprint: false,
      showPrivacyPolicy: false,
      steps: [
        {
          bubbles: [
            'rotate(-139.52deg) scale(1)',
            'rotate(165.45deg) scale(1)',
            'rotate(108.14deg) scale(1)',
            'rotate(89.83deg) scale(1)',
          ],
          icon: 'mattrbld',
          message: 'Izveide (Mattrbld) ir atvērtā koda satura vadības sistēma, kuras pamatā ir git.',
        },
        {
          bubbles: [
            'rotate(-32deg) scale(0.5)',
            'rotate(96deg) scale(1.2)',
            'rotate(-36deg) scale(2.2)',
            'rotate(40deg) scale(0.75)',
          ],
          icon: 'user',
          message: 'Intuitively build Schemas for your data.',
        },
        {
          bubbles: [
            'rotate(256deg) scale(1.1)',
            'rotate(-26deg) scale(0.65)',
            'rotate(-248deg) scale(1.33)',
            'rotate(67deg) scale(2)',
          ],
          icon: 'image',
          message: 'Organise content into Collections.',
        },
        {
          bubbles: [
            'rotate(-36deg) scale(0.76)',
            'rotate(89deg) scale(2)',
            'rotate(-47deg) scale(1.2)',
            'rotate(-23deg) scale(0.75)',
          ],
          icon: 'mattrbld',
          message: 'Create and edit collaboratively.',
        },
        {
          bubbles: [
            'rotate(278deg) scale(1.8)',
            'rotate(-47deg) scale(1.2)',
            'rotate(12deg) scale(0.8)',
            'rotate(-67deg) scale(0.45)',
          ],
          icon: 'check',
          message: 'And when you’re ready, sync everything back to Git, so everyone is always up to date.',
        },
      ],
      userAvatar: '',
      userEmail: '',
      userId: '',
      userName: '',
    };
  },
  methods: {
    async completeSetup() {
      try {
        // Save the avatar uri as Uint8Array along with the rest of the user configuration data
        // Based on https://stackoverflow.com/questions/12168909/blob-from-dataurl
        const byteString = window.atob(this.userAvatar.split(',')[1]);
        const avatarData = Uint8Array.from(byteString, (ch) => ch.charCodeAt(0));
        await fs.writeFile(`/users/${this.userId}.jpg`, avatarData, 'utf8'); // we know it’s a image/jpeg because we converted it ourselves in AvatarUploader / generateAvatar
      } catch (err) {
        this.$store.commit('addToast', { message: `Something went wrong while saving the user avatar: ${err.message}`, type: 'error' });
        return; // abort
      }
      try {
        const config = {
          activeUser: this.userId,
          corsProxy: this.corsProxy,
          initialised: true,
        };
        this.$store.commit('setAppData', { ...this.$store.state.application, ...config });
        const saved = await this.$store.dispatch('saveAppData');
        if (saved) {
          if (this.cloneStep !== 'done') this.currentSlide += 1;
          else this.currentSlide += 2;
        }
      } catch (err) {
        this.$store.commit('addToast', { message: `Something went wrong while saving the configuration: ${err.message}`, type: 'error' });
      }
    },
    async createUser() {
      try {
        this.userId = slugify(this.userEmail.trim()); // WARNING: this could lead to collisions if there’s two very similar email addresses (foo-bar@exmaple.com foo.bar@example.com), but this is the first user, so it’s fine
        const user = {
          email: this.userEmail.trim(),
          id: this.userId,
          name: this.userName.trim(),
          projects: [this.projectName],
        };
        try {
          await fs.mkdir('/users');
        } catch (err) {
          if (err.code !== 'EEXIST') throw err;
        }
        await fs.writeFile(`/users/${this.userId}.json`, JSON.stringify(user, null, 2), 'utf8');
        this.$store.commit('setUserData', { ...this.$store.state.user, ...user });
        this.regenerateAvatar();
        this.currentSlide += 1;
      } catch (err) {
        this.$store.commit('addToast', { message: `Something went wrong while creating the user: ${err.message}`, type: 'error' });
      }
    },
    handleAvatarReady(avatar) {
      this.userAvatar = avatar;
      this.avatarUploaded = true;
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
      this.validate(this.repoURL);

      if (this.repoURL && !this.errors.repoURL && this.repoBranch) {
        // Create a projects folder and one to clone into based on the repoURL (naive implementation, but should work considering we’re forcing the URL to be a HTTP one)
        this.projectName = this.repoURL.split('/').slice(-1)[0].replace(/\.git$/, '');
        try {
          try {
            await fs.mkdir('/projects');
          } catch (err) {
            if (err.code !== 'EEXIST') throw err;
          }
          await fs.mkdir(`/projects/${this.projectName}`);
        } catch (err) {
          this.$store.commit('addToast', { message: `Something went wrong while creating the folder structure: ${err.message}`, type: 'error' });
          return; // abort
        }
        // Start cloning the repo and advance to the next slide (no await since we want to progress to the next slide)
        clone({
          dir: `/projects/${this.projectName}`,
          corsProxy: this.corsProxy,
          url: this.repoURL,
          ref: this.repoBranch,
          singleBranch: true,
          depth: 5,
        }, this.onGitAuth, this.onGitAuthFailure, this.onGitAuthSuccess, this.onGitProgress)
          .then(() => {
            isMattrbldProject(this.projectName)
              .then((result) => {
                this.isMattrbldProject = result;
              })
              .catch(() => { this.isMattrbldProject = false; }); // if it doesn’t exist the project hasn’t been configured yet
            this.cloneStep = 'done';
            if (this.currentSlide === 3) this.currentSlide = 4;
          })
          .catch((err) => {
            // If cloning fails, reset and start anew
            this.$store.commit('addToast', { message: `Something went wrong while cloning the project: ${err.message}. Please try again.`, type: 'error' });
            rmrf('/projects').then(() => { this.currentSlide = 0; }); // clean up the projects dir with the zombie project
          });
        this.currentSlide += 1;
      }
    },
    async openProject() {
      if (this.isMattrbldProject) this.$router.push({ name: 'Project', params: { id: this.projectName } }); // go to project dashboard
      else this.$router.push({ name: 'Project.Settings', params: { id: this.projectName }, query: { tab: 'general' } }); // go to project settings
      if (window.umami?.trackEvent) window.umami.trackEvent('import', { type: 'Onboarding completed' }); // legacy Umami 1.0
      else if (window.umami?.track) window.umami.track(() => ({ name: 'import', data: { type: 'Onboarding completed' } }));
    },
    regenerateAvatar() {
      this.userAvatar = generateAvatar(this.userName, '#A29BFE', '#6c5ce7', 'light', this.userEmail);
      if (this.avatarUploaded) this.avatarUploaded = false;
    },
    async renderLegalInfo() {
      const { renderedImprint, renderedPrivacyPolicy } = await loadAndRenderLegalInfo();
      this.renderedImprint = renderedImprint;
      this.renderedPrivacyPolicy = renderedPrivacyPolicy;
    },
    validate(field) {
      let error = '';
      switch (field) {
        case 'corsProxy':
          if (!this.corsProxy) error = 'A proxy server url is required in most cases';
          else if (!this.corsProxy.startsWith('/') && !this.corsProxy.startsWith('https://')) error = 'The proxy server should be reachable over HTTPS for security reasons';
          break;
        case 'repoURL':
          if (!this.repoURL) error = 'Repozitorija adrese ir obligāta';
          else if (!this.repoURL.startsWith('http')) error = 'Saitei jāsākas ar http(s)';
          else if (!this.repoURL.endsWith('.git')) error = 'Saitei jābeidzas ar .git';
          // just checks if we’re using http(s) and it ends with .git
          else if (!/https?:\/\/.*\.git$/.test(this.repoURL)) error = 'Nepaireiza adrese. Tikai adreses, kas sākas ar http(s) un beidzas ar .git ir atbilstošas';
          break;
        case 'userEmail':
          if (!this.userEmail) error = 'E-pasta adrese ir obligāta';
          else if (!/^([a-z0-9_.+-]+)@([\da-z.-]+)\.([a-z.]{2,6})$/.test(this.userEmail)) error = 'Invalid address'; // Regex source: https://graphcms.com/user-guides/working-with/field-validations
          break;
        case 'userName':
          if (!this.userName) error = 'Please let your collaborators know who you are';
          break;
        default:
          // no op
      }
      this.errors[field] = error;
    },
  },
  mixins: [
    gitTools,
  ],
  mounted() {
    if (window.umami?.trackView) window.umami.trackView('/onboarding'); // legacy Umami 1.0
    else if (window.umami?.track) window.umami.track((props) => ({ ...props, url: '/onboarding' }));
  },
  props: {
    dark: Boolean,
  },
  watch: {
    currentSlide() {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    },
  },
};
</script>

<style lang="scss" scoped>
  @use '../assets/styles/breakpoints' as *;

  .onboarding {
    display: flex;
    min-height: 100vh;
    user-select: none;

    &.dark {
      > section {
        &.animation {
          background-color: var(--bg-dark);
        }

        &.steps {
          background-color: var(--bg-secondary-dark);

          header .progress:deep(.bar) {
            background-color: var(--bg-tertiary-dark);
          }

          .slide {
            .input {
              background-color: var(--bg-tertiary-dark);
            }

            .hint {
              background-color: var(--warning-saturated);
            }
          }
        }
      }
    }

    @media #{$mobile} {
      display: block;
    }

    > section {
      width: 50%;

      @media #{$mobile} {
        width: 100%;
        min-height: 50vh;
      }

      &.animation {
        background-color: var(--bg-secondary);
        position: relative;
        overflow: hidden;

        header {
          position: relative;
          z-index: 1;
          padding-left: 4rem;
          padding-top: 4rem;

          .icon {
            width: 3rem;
            height: 3rem;
          }

          @media #{$mobile} {
            width: 100%;
            height: 50vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0;

            .icon {
              width: 4rem;
              height: 4rem;
            }
          }
        }

        .bubble {
          border-radius: 50%;
          position: absolute;
          background-image: linear-gradient(225deg, #6C5CE7 14.16%, rgba(108, 92, 231, 0) 85.19%);
          opacity: 0.5;
          transition: transform 2000ms ease;

          &::after {
            content: '';
            display: block;
            padding-top: 100%;
          }

          &.one {
            width: 60.41%;
            left: -18.2%;
            top: -15.68%;
          }

          &.two {
            width: 23.95%;
            right: -5.64%;
            top: 8.16%;
            transition-delay: 100ms;
          }

          &.three {
            width: 43.45%;
            right: -3.45%;
            bottom: -1.71%;
            transition-delay: 200ms;
          }

          &.four {
            width: 37.5%;
            left: -12.33%;
            bottom: -12.08%;
            transition-delay: 150ms;
          }
        }

        .message {
          position: absolute;
          width: 70%;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          margin: 0;
          font-weight: normal;
          opacity: 0.6;
          letter-spacing: -0.02em;
          line-height: 1.4;

          &.v-enter-active,
          &.v-leave-active {
            transition: opacity 1000ms ease;
            transition-delay: 300ms;

            &.v-enter-from,
            &.v-leave-to {
              opacity: 0;
            }
          }

          @media #{$mobile} {
            font-size: 1rem;
            bottom: 1rem;
            left: 1rem;
            top: auto;
            width: calc(100% - 2rem);
            transform: none;
            text-align: center;
            display: none; // it looks off, so hide it on mobile
          }
        }
      }

      &.steps {
        padding: 4rem;
        display: flex;
        flex-direction: column;
        position: relative;

        @media #{$mobile} {
          padding: 2rem;

          .button {
            width: 100%;
          }
        }

        header {
          margin-left: auto;

          @media #{$mobile} {
            margin-left: 0;
            margin-bottom: 2rem;
          }

          .progress {
            transition: opacity 200ms ease;

            @media #{$mobile} {
              width: 100%;
            }

            &.faded {
              opacity: 0;
            }
          }
        }

        .slide {
          max-width: rem(488);
          margin: auto;

          &.v-enter-active,
          &.v-leave-active {
            transition: transform 200ms ease, opacity 200ms ease;

            &.v-enter-from {
              opacity: 0;
              transform: translateX(4rem);

              @media #{$mobile} {
                transform: none;
              }
            }

            &.v-leave-to {
              opacity: 0;
              transform: translateX(-4rem);

              @media #{$mobile} {
                transform: none;
              }
            }

            .meta-info {
              display: none;
            }
          }

          h1 {
            margin-top: 0;
          }

          h2 {
            margin-top: 4rem;

            @media #{$mobile} {
              margin-top: 2rem;
            }
          }

          .blurb {
            margin-bottom: 4rem;

            @media #{$mobile} {
              margin-bottom: 2rem;
            }
          }

          .input {
            width: 100%;
            margin-bottom: 1rem;
          }

          .radio-group {
            margin-top: 2rem;
            margin-bottom: 1rem;

            &.dark:deep(.fake-radio)::after {
              background-color: var(--bg-secondary-dark);
            }
          }

          .label {
            display: flex;
            align-items: center;
            margin-bottom: 2rem;

            @media #{$mobile} {
              display: block;

              &:deep(.select) { // needed because it’s a fragment element I guess?
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

          img {
            display: block;
            width: rem(92);
            height: rem(92);
            border-radius: 50%;
            box-shadow: 0 0 0 0.125rem var(--bg-tertiary-dark), inset 0 0 0 0.125rem var(--bg-tertiary-dark);
            margin-bottom: 2rem;
            margin-left: auto;
            margin-right: auto;
          }

          .avatar-buttons {
            text-align: center;
            margin-bottom: 4rem;

            .button:first-child {
              margin-right: 1rem;

              @media #{$mobile} {
                margin-right: 0;
                margin-bottom: 1rem;
              }
            }
          }

          footer {
            text-align: right;
            margin-top: 2rem;

            &.meta-info {
              margin-top: 0;
              position: absolute;
              bottom: 2rem;
              right: 2rem;

              @media #{$mobile} {
                position: static;
                margin-top: 2rem;
              }
            }

            > a {
              white-space: nowrap;

              &:not(:first-child) {
                margin-left: 1rem;
              }
            }
          }
        }
      }
    }
  }

  .advanced-settings-modal {
    h3 {
      margin-top: 0;
    }

    .input {
      width: 100%;
      margin-bottom: 1rem;
    }
  }
</style>
