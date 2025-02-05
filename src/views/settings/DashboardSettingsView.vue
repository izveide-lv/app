<template>
  <TabContent class="dashboard-settings" :dark="dark" :show-split="showSplit" @split-close="showSplit = false" @split-closed="handleSplitClosed">
    <section class="wrapper">
      <h2>News and Announcements</h2>
      <MbFileList v-if="initialised" :action="createAction" :active-file="fileBeingEdited" :dark="dark" empty-state="There are no announcement posts yet" :file-actions="fileActions" file-list-label="Announcement Posts" :filterable="!showSplit" pretty-filenames ref="fileList" :root="newsPath" @fileclick="handleFileClick" />
    </section>

    <template #right="{ isModal }">
      <div class="post-editor">
        <h2>{{fileBeingEdited ? 'Edit Post' : 'Create Post'}}</h2>
        <MbInput v-model="newPost.title" :class="{ 'in-modal': isModal }" :dark="dark" icon="heading-spaced" label="Title (optional)" />
        <MbEditor v-model="newPost.blurb" :class="{ 'in-modal': isModal }" :allow-new-lines="false" :dark="dark" :error="blurbError" label="Summary" @update:model-value="validateBlurb" />
        <MbEditor v-model="newPost.content" class="rich" :class="{ 'in-modal': isModal }" :dark="dark" label="Content (optional)" output-format="markdown" />
        <footer>
          <MbButton v-if="fileBeingEdited" class="delete-button" :dark="dark" icon="trash" type="negative" @click="deletePost(fileBeingEdited)">Delete</MbButton>
          <MbButton class="create-button" :dark="dark" :disabled="!newPost.blurb" :icon="fileBeingEdited ? 'save' : 'plus'" :type="fileBeingEdited ? 'primary' : 'positive'" @click="savePost">{{fileBeingEdited ? 'Save' : 'Create'}}</MbButton>
        </footer>
      </div>
    </template>

  </TabContent>
</template>

<script>
import matter from 'gray-matter';
import slugify from '@sindresorhus/slugify';
import { formatISO } from 'date-fns';
import { status as gitStatus } from 'isomorphic-git';
import fs, { exists, joinPath, PlainFS } from '../../fs';

import TabContent from '../../components/utility/TabContent.vue';

export default {
  components: {
    TabContent,
  },
  computed: {
    newsPath() {
      return joinPath('/projects', this.$route.params.id, '.mattrbld', 'news');
    },
  },
  async created() {
    const newsPathExists = await exists(this.newsPath);
    if (!newsPathExists) await fs.mkdir(this.newsPath);
    this.initialised = true;
  },
  data() {
    return {
      blurbError: '',
      createAction: {
        callback: () => { this.showSplit = true; },
        icon: 'plus',
        label: 'Add Post',
        type: 'primary',
      },
      fileActions: [
        {
          action: this.handleFileClick,
          icon: 'pencil',
          label: 'Edit',
        },
        {
          action: this.deletePost,
          icon: 'trash',
          label: 'Delete',
          type: 'negative',
        },
      ],
      fileBeingEdited: null,
      initialised: false,
      newPost: {
        author: '',
        blurb: '',
        content: '',
        createdAt: '',
        title: '',
      },
      showSplit: false,
    };
  },
  methods: {
    deletePost(path) {
      this.$store.commit('addToSoftDeleted', path);
      this.$store.commit('addToast', {
        action: () => {
          this.$store.commit('removeFromSoftDeleted', path);
        },
        actionLabel: 'Undo',
        message: 'The post was deleted',
        onClose: async (undone) => {
          if (undone) return;

          try {
            await fs.unlink(path);
            const projectDir = joinPath('/projects', this.$route.params.id);
            const status = await gitStatus({ fs: PlainFS, dir: projectDir, filepath: path.replace(`${projectDir}/`, '') }); // filepath needs to be relative to dir
            if (status !== 'absent' && status !== 'ignored' && status !== 'unmodified') this.$store.commit('addLocallyChangedFile', path); // unless the file is absent, ignored or unchanged we need to mark it as changed
            else this.$store.commit('removeLocallyChangedFile', path); // otherwise we can remove it from the changed files if it’s marked as changed
            if (this.$refs.fileList) this.$refs.fileList.refresh();
            this.$store.dispatch('saveAppData');
          } catch (err) {
            this.$store.commit('addToast', { message: `Something went wrong while deleting the post: ${err.message}`, type: 'error' });
          } finally {
            this.$nextTick(() => { // wait a tick to avoid flicker
              this.$store.commit('removeFromSoftDeleted', path);
            });
          }
        },
        type: 'warning',
      });
      if (this.fileBeingEdited === path) this.showSplit = false;
    },
    async handleFileClick(path) {
      if (this.fileBeingEdited === path) {
        this.showSplit = false;
        return;
      }

      const { data, content } = matter(await fs.readFile(path, 'utf8'));
      this.newPost.author = data.author;
      this.newPost.blurb = data.blurb;
      this.newPost.content = content;
      this.newPost.createdAt = data.createdAt;
      this.newPost.title = data.title;
      this.fileBeingEdited = path;
      this.showSplit = true;
    },
    handleSplitClosed() {
      this.fileBeingEdited = null;
      this.newPost = {
        author: '', blurb: '', content: '', createdAt: '', title: '',
      };
    },
    async savePost() {
      this.validateBlurb(this.newPost.blurb);
      if (this.blurbError) return;

      const file = matter.stringify(
        this.newPost.content,
        {
          author: this.newPost.author || this.$store.getters.userInCurrentProject.name,
          blurb: this.newPost.blurb,
          createdAt: this.newPost.createdAt || formatISO(new Date()),
          title: this.newPost.title,
        },
      );

      try {
        if (this.fileBeingEdited) {
          await fs.writeFile(this.fileBeingEdited, file, 'utf8');
          this.$store.commit('addLocallyChangedFile', this.fileBeingEdited);
          this.$store.commit('addToast', { message: 'The post was updated', type: 'positive' });
        } else {
          const nameCandidate = slugify((this.newPost.title.trim() || this.newPost.blurb.substring(0, 25)), this.$store.state.currentProject.slugifyOptions || { lowercase: false, decamelize: false, preserveLeadingUnderscore: true });
          let alreadyExists = await exists(joinPath(this.newsPath, `${nameCandidate}.md`));
          let counter = 1;
          let newCandidate = nameCandidate;

          while (alreadyExists) {
            newCandidate = `${nameCandidate}-${counter}`;
            alreadyExists = await exists(joinPath(this.newsPath, `${newCandidate}.md`)); // eslint-disable-line no-await-in-loop
            counter += 1;
          }

          await fs.writeFile(joinPath(this.newsPath, `${newCandidate}.md`), file, 'utf8');
          this.showSplit = false;
          this.$store.commit('addLocallyChangedFile', joinPath(this.newsPath, `${newCandidate}.md`));
        }
        this.$refs.fileList.refresh();
        this.$store.dispatch('saveAppData');
      } catch (err) {
        this.$store.commit('addToast', { message: `Something went wrong while saving the post: ${err.message}`, type: 'error' });
      }
    },
    validateBlurb(nv) {
      if (!nv || !nv.trim()) this.blurbError = 'A summary is required';
      else if (this.blurbError) this.blurbError = '';
    },
  },
  props: {
    dark: Boolean,
  },
};
</script>

<style lang="scss" scoped>
  @use '../../assets/styles/breakpoints' as *;

  .dashboard-settings {
    user-select: none;

    .wrapper {
      max-width: 60rem;
      margin-left: auto;
      margin-right: auto;

      &:not(:last-child) {
        margin-bottom: 8rem;

        @media #{$mobile} {
          margin-bottom: 4rem;
        }
      }
    }
  }

  .post-editor {
    max-width: 40rem;
    margin: 0 auto;
    margin-top: 8rem;

    @media #{$mobile} {
      margin-top: 0;

      h2 {
        margin-top: 0;
        text-align: center;
        font-size: 1.25rem;
      }
    }

    .input {
      width: 100%;
      display: flex;

      &.dark:not(.in-modal) {
        background-color: var(--bg-tertiary-dark);
      }
    }

    .editor.dark:not(.in-modal):deep(.content-wrapper) {
      background-color: var(--bg-tertiary-dark);

      &.rich:not(:focus-within) {
        box-shadow: inset 0 0.0625rem 0 0 var(--bg-tertiary-dark-lightened-10);
      }
    }

    .input,
    .editor {
      margin-bottom: 2rem;
    }

    >footer {
      text-align: right;

      .create-button,
      .delete-button {
        &:not(:last-child) {
          margin-right: 1rem;
        }

        @media #{$mobile} {
          width: 100%;

          &:not(:last-child) {
            margin-right: 0;
            margin-bottom: 1rem;
          }
        }
      }
    }
  }
</style>
