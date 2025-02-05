<template>
  <TabContent class="general-settings" :dark="dark">
    <section class="wrapper">
      <h1 class="h2">Project</h1>
      <MbInput v-model="projectName" :dark="dark" :error="errors.name" icon="tag" label="Project name" :max-len="32" @blur="changeName" @keyup.enter="changeName" />
      <p class="avatar-label" :class="{ dark }">Project Avatar</p>
      <div class="avatar-wrapper">
        <MbProjectAvatar v-if="currentProject.id" :avatar="avatar" :project-id="currentProject.id" :project-name="currentProject.name" />
        <div class="buttons">
          <AvatarUploader :compression="0.9" :height="180" ref="uploader" :width="320" @ready="handleAvatarReady" />
          <MbButton v-show="avatar" :dark="dark" icon-first icon="trash" type="negative" @click="removeAvatar">Remove</MbButton>
          <MbButton :dark="dark" icon-first :icon="avatar ? 'replace-alt' : 'upload'" @click="$refs.uploader.$el.click()">{{ avatar ? 'Replace' : 'Upload' }}</MbButton>
        </div>
      </div>
    </section>
    <!-- <section class="wrapper">
      <h2>Drafts</h2>
      <p>If this setting is enabled, users will be allowed to save content as a draft. This content will be saved to the directory specified below and synced with your repository in separate pushes, so you can configure your CI/CD setup to not run when drafts are synced.</p>
      <MbToggle v-model="enableDrafts" :dark="dark" :icons="['cross', 'check']">Enable draft content</MbToggle>
      <transition>
        <div v-show="enableDrafts" class="file-picker-wrapper">
          <span>Drafts folder:</span>
          <MbFilePicker v-model="draftsDir" :dark="dark" relative-to-root removable :root="`/projects/${currentProject.id}`" show-hidden />
        </div>
      </transition>
    </section> -->
    <!-- <section class="wrapper">
      <h2>Content Previews</h2>
      <p>If this setting is enabled and a valid URL is provided, users will have the option to open a preview of the content they are working on. Please keep in mind that this will only work, if you have created a preview route in your website / app. To learn more, please refer to the <a href="https://mattrbld.com/docs/previews/" rel="noopener noreferrer" target="_blank">official documentation</a>.</p>
      <MbToggle v-model="enablePreviews" :dark="dark" :icons="['cross', 'check']">Enable content previews</MbToggle>
      <transition>
        <MbInput v-show="enablePreviews" v-model="projectPreviewUrl" :dark="dark" :error="errors.previewUrl" icon="link" label="Prieview route URL" placeholder="https://example.com/___mb-preview/" ref="previewUrlInput" @blur="setPreviewUrl" @keyup.enter="setPreviewUrl" />
      </transition>
    </section> -->
    <section class="wrapper">
      <h2>Internationalisation</h2>
      <p>Mattrbld is built to support multiple languages. If you enable this feature, you will be able to enable internationalisation per-field, allowing you to specify different values for every language you define in the list below. In addition to that you will also be able to set different quote styles per language that may be used in rich text editors with “Smart Quotes” enabled.</p>
      <MbToggle v-model="enableLanguages" :dark="dark" :icons="['cross', 'check']">Enable internationalisation</MbToggle>
      <transition>
        <MbTagInput v-show="enableLanguages" v-model="projectLanguages" allow-unsuggested :dark="dark" label="Languages" placeholder="New language code…" />
      </transition>
      <transition>
        <ul v-show="enableLanguages" class="per-language-autoquotes">
          <li v-for="lang in projectLanguages" class="select-wrapper" :key="lang">
            <span>{{lang}}:</span>
            <MbSelect :dark="dark" :model-value="projectAutoquotes[lang]" :options="autoquoteOptions" placeholder="Select a quote style…" @update:model-value="setAutoquotesForLang($event, lang)" />
          </li>
        </ul>
      </transition>
    </section>
    <section class="wrapper">
      <h2>Slugify Options</h2>
      <p>These options will be passed to the internal slugifier that is used for creating url-safe filenames, slugs and internal links. You should make sure that the options Mattrbld uses are the same that you use when building your project to ensure consistent paths / slugs.</p>
      <p>Mattrbld uses <a href="https://github.com/sindresorhus/slugify" rel="noopener noreferrer nofollow" target="_blank">@sindresorhus/slugify</a> internally, so all options for that are valid here, too.</p>
      <MbToggle v-model="slugifyOptions_lowercase" :dark="dark" :icons="['cross', 'check']">Make the slug lowercase</MbToggle>
      <MbToggle v-model="slugifyOptions_decamelize" :dark="dark" :icons="['cross', 'check']">Convert camelCase to separate words</MbToggle>
      <MbToggle v-model="slugifyOptions_preserveLeadingUnderscore" :dark="dark" :icons="['cross', 'check']">Preserve leading underscores</MbToggle>
      <MbToggle v-model="slugifyOptions_preserveTrailingDash" :dark="dark" :icons="['cross', 'check']">Preserve trailing dashes</MbToggle>
      <div class="input-wrapper">
        <span>Separator:</span>
        <MbInput v-model="slugifyOptions_separator" :dark="dark" placeholder="-" />
      </div>
      <div class="tag-wrapper">
        <span>Preserve these characters:</span>
        <MbTagInput v-model="slugifyOptions_preserveCharacters" allow-unsuggested :dark="dark" placeholder="New character…" />
      </div>
      <MbHighlightBox color="warning" :dark="dark">
        The separator character cannot be preserved. Preserving characters that are illegal in filenames, such as <code>/</code> can cause severe issues. Only change this option if you have to.
      </MbHighlightBox>
    </section>
    <section class="wrapper">
      <h2>Brand Colours</h2>
      <p>The colour palette you set up below will be available as an option while setting up colour picker fields. It can be used to ensure that your content stays on brand, while still giving your editors the option to add a splash of colour here and there.</p>
      <MbPalette v-model="brandColors" :dark="dark" format="rgba" />
    </section>
    <section class="wrapper">
      <h2>Repository</h2>
      <MbInput v-model="projectRepo" :dark="dark" disabled :error="errors.repo" icon="repo" label="Repository URL" @blur="changeRepo" @keyup.enter="changeRepo" />
      <div class="select-wrapper">
        <span>Repository branch:</span>
        <MbSelect :dark="dark" disabled :loading="!projectBranch" :modelValue="projectBranch" :options="repoBranches" @update:model-value="changeBranch" />
      </div>
      <!-- <MbHighlightBox :dark="dark">
        <p>The options above are read-only for the time being. Changing the remote of a repository or switching to a different branch are complex features that may be added in the future.</p>
      </MbHighlightBox> -->
    </section>
    <!-- <section class="wrapper">
      <h2>Other</h2>
      <MbInput v-model="projectProxy" :dark="dark" :error="errors.proxy" icon="link" label="CORS Proxy URL" @blur="changeProxy" @keyup.enter="changeProxy" />
    </section> -->
  </TabContent>
</template>

<script>
import { currentBranch, listBranches, listRemotes } from 'isomorphic-git';

import fs, { PlainFS } from '../../fs';

import AvatarUploader from '../../components/utility/AvatarUploader.vue';
import TabContent from '../../components/utility/TabContent.vue';

export default {
  components: {
    AvatarUploader,
    TabContent,
  },
  computed: {
    autoquoteOptions() {
      return [
        { label: '“double” ‘single’', value: '“”‘’' },
        { label: '„double“ ‚single‘', value: '„“‚‘' },
        { label: '»double« ›single‹', value: '»«›‹' },
        { label: '«double» ‹single›', value: '«»‹›' },
        { label: '„double” ‚single’', value: '„”‚’' },
        { label: '”double” ’single’', value: '””’’' },
        { label: '»double» ›single›', value: '»»››' },
      ];
    },
    brandColors: {
      get() {
        return this.$store.state.currentProject.brandColors;
      },
      set(v) {
        this.$store.commit('setCurrentProjectProperty', { key: 'brandColors', value: v });
        this.$store.dispatch('saveCurrentProject');
      },
    },
    currentProject() {
      return this.$store.state.currentProject;
    },
    draftsDir: {
      get() {
        return this.$store.state.currentProject.draftsDir;
      },
      set(v) {
        this.$store.commit('setCurrentProjectProperty', { key: 'draftsDir', value: v });
        this.$store.dispatch('saveCurrentProject');
      },
    },
    enableDrafts: {
      get() {
        return Boolean(this.$store.state.currentProject.draftsDir);
      },
      set(v) {
        if (v) this.$store.commit('setCurrentProjectProperty', { key: 'draftsDir', value: '/.mattrbld/drafts' });
        else this.$store.commit('setCurrentProjectProperty', { key: 'draftsDir', value: null });
        this.$store.dispatch('saveCurrentProject');
      },
    },
    enableLanguages: {
      get() {
        return this.$store.state.currentProject.languages.length > 0;
      },
      set(v) {
        if (v) this.$store.commit('setCurrentProjectProperty', { key: 'languages', value: [navigator.language || 'en-US'] });
        else {
          this.$store.commit('setCurrentProjectProperty', { key: 'languages', value: [] });
          this.$store.commit('setCurrentProjectProperty', { key: 'autoquotes', value: null });
        }
        this.$store.dispatch('saveCurrentProject');
      },
    },
    enablePreviews: {
      get() {
        return Boolean(this.$store.state.currentProject.previewUrl);
      },
      set(v) {
        if (v) {
          this.$store.commit('setCurrentProjectProperty', { key: 'previewUrl', value: 'https://' });
          this.projectPreviewUrl = this.currentProject.previewUrl;
          this.$nextTick(() => this.$refs.previewUrlInput.$refs.input.focus());
        } else {
          this.$store.commit('setCurrentProjectProperty', { key: 'previewUrl', value: null });
          this.$store.dispatch('saveCurrentProject');
        }
      },
    },
    projectAutoquotes() {
      return this.$store.state.currentProject.autoquotes || {};
    },
    projectLanguages: {
      get() {
        return this.$store.state.currentProject.languages;
      },
      set(v) {
        this.$store.commit('setCurrentProjectProperty', { key: 'languages', value: v });
        this.$store.dispatch('saveCurrentProject');
      },
    },
    slugifyOptions_lowercase: {
      get() {
        return this.currentProject.slugifyOptions && this.currentProject.slugifyOptions.lowercase;
      },
      set(v) {
        let newOptions;
        if (!this.currentProject.slugifyOptions) newOptions = { lowercase: v };
        else newOptions = { ...this.currentProject.slugifyOptions, lowercase: v };
        this.$store.commit('setCurrentProjectProperty', { key: 'slugifyOptions', value: newOptions });
        this.$store.dispatch('saveCurrentProject');
      },
    },
    slugifyOptions_decamelize: {
      get() {
        return this.currentProject.slugifyOptions && this.currentProject.slugifyOptions.decamelize;
      },
      set(v) {
        let newOptions;
        if (!this.currentProject.slugifyOptions) newOptions = { decamelize: v };
        else newOptions = { ...this.currentProject.slugifyOptions, decamelize: v };
        this.$store.commit('setCurrentProjectProperty', { key: 'slugifyOptions', value: newOptions });
        this.$store.dispatch('saveCurrentProject');
      },
    },
    slugifyOptions_preserveLeadingUnderscore: {
      get() {
        return this.currentProject.slugifyOptions && this.currentProject.slugifyOptions.preserveLeadingUnderscore;
      },
      set(v) {
        let newOptions;
        if (!this.currentProject.slugifyOptions) newOptions = { preserveLeadingUnderscore: v };
        else newOptions = { ...this.currentProject.slugifyOptions, preserveLeadingUnderscore: v };
        this.$store.commit('setCurrentProjectProperty', { key: 'slugifyOptions', value: newOptions });
        this.$store.dispatch('saveCurrentProject');
      },
    },
    slugifyOptions_preserveTrailingDash: {
      get() {
        return this.currentProject.slugifyOptions && this.currentProject.slugifyOptions.preserveTrailingDash;
      },
      set(v) {
        let newOptions;
        if (!this.currentProject.slugifyOptions) newOptions = { preserveTrailingDash: v };
        else newOptions = { ...this.currentProject.slugifyOptions, preserveTrailingDash: v };
        this.$store.commit('setCurrentProjectProperty', { key: 'slugifyOptions', value: newOptions });
        this.$store.dispatch('saveCurrentProject');
      },
    },
    slugifyOptions_preserveCharacters: {
      get() {
        return (this.currentProject.slugifyOptions && this.currentProject.slugifyOptions.slugifyOptions_preserveCharacters) || [];
      },
      set(v) {
        if (v && v.includes(this.slugifyOptions_separator)) {
          this.errors.slugifyPreserveCharacters = 'The separator character cannot be preserved';
          v.splice(v.indexOf(this.slugifyOptions_separator), 1);
        } else this.errors.slugifyPreserveCharacters = '';
        let newOptions;
        if (!this.currentProject.slugifyOptions) newOptions = { preserveCharacters: v };
        else newOptions = { ...this.currentProject.slugifyOptions, preserveCharacters: v };
        this.$store.commit('setCurrentProjectProperty', { key: 'slugifyOptions', value: newOptions });
        this.$store.dispatch('saveCurrentProject');
      },
    },
    slugifyOptions_separator: {
      get() {
        if (this.currentProject.slugifyOptions && typeof this.currentProject.slugifyOptions.separator !== 'undefined') return this.currentProject.slugifyOptions.separator;
        return '-';
      },
      set(v) {
        if (this.currentProject.slugifyOptions && this.currentProject.slugifyOptions.slugifyOptions_preserveCharacters && this.currentProject.slugifyOptions.slugifyOptions_preserveCharacters.includes(v)) {
          this.currentProject.slugifyOptions.slugifyOptions_preserveCharacters.splice(this.currentProject.slugifyOptions.slugifyOptions_preserveCharacters.indexOf(v), 1);
        }
        let newOptions;
        if (!this.currentProject.slugifyOptions) newOptions = { separator: v };
        else newOptions = { ...this.currentProject.slugifyOptions, separator: v };
        this.$store.commit('setCurrentProjectProperty', { key: 'slugifyOptions', value: newOptions });
        this.$store.dispatch('saveCurrentProject');
      },
    },
  },
  async created() {
    this.projectName = this.currentProject.name;
    this.projectProxy = this.currentProject.corsProxy;
    this.projectPreviewUrl = this.currentProject.previewUrl;
    const dir = `/projects/${this.currentProject.id}`;
    const [remotes, branches, projectBranch] = await Promise.all([
      listRemotes({ fs: PlainFS, dir }),
      listBranches({ fs: PlainFS, dir }),
      currentBranch({ fs: PlainFS, dir }),
    ]);
    this.projectRepo = remotes[0].url;
    this.repoBranches = branches;
    this.projectBranch = projectBranch;
    this.fetchAvatar();
  },
  data() {
    return {
      avatar: null,
      errors: {
        name: null,
        previewUrl: null,
        proxy: null,
        repo: null,
      },
      projectBranch: null,
      projectName: null,
      projectPreviewUrl: null,
      projectProxy: null,
      projectRepo: null,
      repoBranches: [],
    };
  },
  methods: {
    changeBranch() {
      // TODO: implement branch switching → this would also mean that we should add an option to check out a remote branch that isn’t on the machine yet since we only clone one branch at a time to save disk-space
    },
    changeName() {
      if (this.projectName === this.currentProject.name) return;

      if (!this.projectName || !this.projectName.trim()) this.errors.name = 'A name is required';
      else if (this.projectName.length > 32) this.errors.name = 'Name is too long';
      else this.errors.name = '';

      if (this.errors.name) return;

      this.$store.commit('setCurrentProjectProperty', { key: 'name', value: this.projectName.trim() });

      if (!this.avatar) this.$store.commit('setCurrentProjectProperty', { key: 'avatar', value: null });

      this.$store.dispatch('saveCurrentProject');
    },
    changeProxy() {
      if (this.projectProxy === this.currentProject.corsProxy) return;

      this.$store.commit('setCurrentProjectProperty', { key: 'corsProxy', value: this.projectProxy.trim() });
      this.$store.dispatch('saveCurrentProject');
    },
    changeRepo() {
      // TODO: allow changing remote? Even adding a new one?
    },
    async fetchAvatar() {
      try {
        const avatarData = await fs.readFile(`/projects/${this.currentProject.id}/.mattrbld/avatar.jpg`);
        this.avatar = URL.createObjectURL(new Blob([avatarData], { type: 'image/jpeg' })); // revoking is handled by the ProjectAvatar component
      } catch (err) {
        if (err.code !== 'ENOENT') throw err;
      }
    },
    async handleAvatarReady(avatar) {
      try {
        // Save the avatar uri as Uint8Array along with the rest of the user configuration data
        // Based on https://stackoverflow.com/questions/12168909/blob-from-dataurl
        const byteString = window.atob(avatar.split(',')[1]);
        const avatarData = Uint8Array.from(byteString, (ch) => ch.charCodeAt(0));
        const path = `/projects/${this.currentProject.id}/.mattrbld/avatar.jpg`;
        await fs.writeFile(path, avatarData, 'utf8'); // we know it’s a image/jpeg because we converted it ourselves in AvatarUploader
        this.$store.commit('addLocallyChangedFile', path);
        this.avatar = URL.createObjectURL(new Blob([avatarData], { type: 'image/jpeg' })); // revoking is handled by the ProjectAvatar component
        this.$store.commit('setCurrentProjectProperty', { key: 'avatar', value: this.avatar }); // might become an issue if the url is already revoked → then we just need to create a new object URL for this one
      } catch (err) {
        this.$store.commit('addToast', { message: `Something went wrong while saving the project avatar: ${err.message}`, type: 'error' });
      }
    },
    removeAvatar() {
      const path = `/projects/${this.currentProject.id}/.mattrbld/avatar.jpg`;

      this.avatar = null;
      this.$store.commit('setCurrentProjectProperty', { key: 'avatar', value: null });

      this.$store.commit('addToast', {
        action: async () => {
          await this.fetchAvatar();
          this.$store.commit('setCurrentProjectProperty', { key: 'avatar', value: this.avatar }); // might become an issue if the url is already revoked → then we just need to create a new object URL for this one
        },
        actionLabel: 'Undo',
        message: 'Deleted project avatar',
        onClose: async (undone) => {
          if (undone) return;

          try {
            await fs.unlink(path);
            this.$store.commit('addLocallyChangedFile', path);
          } catch (err) {
            this.$store.commit('addToast', { message: `Something went wrong while deleting the project avatar: ${err.message}`, type: 'error' });
          }
        },
        timeout: 5000,
        type: 'warning',
      });
    },
    setAutoquotesForLang(quotes, lang) {
      this.$store.commit('setCurrentProjectProperty', { key: 'autoquotes', value: { ...this.projectAutoquotes, [lang]: quotes } });
      this.$store.dispatch('saveCurrentProject');
    },
    setPreviewUrl() {
      if (this.projectPreviewUrl === this.currentProject.previewUrl) return;

      if (!this.projectPreviewUrl || !this.projectPreviewUrl.trim()) this.errors.previewUrl = 'A valid preview URL is required';
      else if (!/^(https?:\/\/)?(www\.)?(localhost:[0-9]{4}|[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6})\b([-a-zA-Z0-9@:%_+.~#?&//=]*$)/.test(this.projectPreviewUrl)) this.errors.previewUrl = 'Invalid URL'; // Regex based on: https://graphcms.com/user-guides/working-with/field-validations
      else this.errors.previewUrl = '';

      if (this.errors.previewUrl) return;

      this.$store.commit('setCurrentProjectProperty', { key: 'previewUrl', value: this.projectPreviewUrl.trim() });

      this.$store.dispatch('saveCurrentProject');
    },
  },
  props: {
    dark: Boolean,
  },
};
</script>

<style lang="scss" scoped>
  @use '../../assets/styles/breakpoints' as *;

  .general-settings {
    user-select: none;

    .wrapper {
      max-width: 40rem;
      margin-left: auto;
      margin-right: auto;

      &:not(:last-child) {
        margin-bottom: 8rem;

        @media #{$mobile} {
          margin-bottom: 4rem;
        }
      }

      .input {
        display: flex;
      }

      .input,
      .tag-input {
        width: 100%;
        margin-bottom: 2rem;
        margin-top: 2rem;

        & + h2 {
          margin-top: 1rem;
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

      .avatar-label {
        margin: 0;
        margin-left: 0.625rem;
        margin-bottom: 0.25rem;
        font-size: 0.75rem;
        color: var(--text-secondary);

        &.dark {
          color: var(--text-secondary-dark);
        }
      }

      .avatar-wrapper {
        display: flex;
        align-items: center;

        @media #{$mobile} {
          flex-direction: column;
        }

        .project-avatar {
          border-radius: var(--radius-s);
          flex-shrink: 0;
          margin-right: 0.5rem;

          @media #{$mobile} {
            margin-right: 0;
            margin-bottom: 0.5rem;
          }
        }

        .buttons {
          text-align: center;
          width: 100%;

          .button {
            margin: 0.5rem;

            @media #{$mobile} {
              width: 100%;
              margin-left: 0;
              margin-right: 0;
              max-width: rem(320);
            }
          }
        }
      }

      .toggle {
        margin-bottom: 1rem;
      }

      .select-wrapper,
      .file-picker-wrapper,
      .input-wrapper,
      .tag-wrapper {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 2rem;

        > span {
          margin-right: 1rem;
          white-space: nowrap;
        }

        > .file-picker {
          max-width: none;
          overflow: hidden;
        }
      }

      .input-wrapper {
        &:not(:last-child) {
          margin-bottom: 1rem;
        }

        .input {
          margin-top: 0;
          margin-bottom: 0;
          width: auto;
        }
      }

      .tag-wrapper .tag-input {
        max-width: rem(286);
        margin-top: 0;
        margin-bottom: 0;
      }

      .per-language-autoquotes {
        list-style: none;
        margin: 0;
      }

      .select-wrapper,
      .file-picker-wrapper,
      .input-wrapper,
      .per-language-autoquotes {

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
  }
</style>
