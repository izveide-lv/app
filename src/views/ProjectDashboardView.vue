<template>
  <div class="project-dashboard">
    <header>
      <h1>Welcome back, {{firstName}}!</h1>
    </header>
    <section class="wrapper cards">
      <MbScroller>
        <div class="card" :class="{ dark }">
          <p v-if="locallyChangedFiles.length > 0" class="number h1">{{locallyChangedFiles.length}}</p>
          <MbIcon v-else icon="check" />
          <p class="label">{{locallyChangedFiles.length === 1 ? 'Local change' : locallyChangedFiles.length !== 0 ? 'Local changes' : 'Everything is in sync'}}</p>
          <MbButton :dark="dark" type="primary" @click="$emit('push')">{{ locallyChangedFiles.length !== 0 ? 'Synchronise' : 'Check for Updates'}}</MbButton>
        </div>
        <div v-for="entry in sidebarCards" class="card" :class="{ dark }" :key="entry.label">
          <MbIcon :icon="entry.icon || (entry.target.name === 'Project.Collection' ? 'folder' : 'document')" />
          <p class="label">{{entry.label}}</p>
          <MbButton v-if="entry.target.name === 'Edit Content'" :dark="dark" @click="$router.push({ name: 'Edit Content', params: { ...entry.target.params, path: `${projectDir}${entry.target.params.path}` } })">Edit</MbButton>
          <MbButton v-else :dark="dark" @click="$router.push(entry.target)">Open</MbButton>
        </div>
      </MbScroller>
    </section>
    <section class="wrapper news">
      <h2>News and Announcements</h2>
      <transition mode="out-in">
        <MbLoader v-if="newsLoading" />
        <div v-else>
          <section v-for="(article, index) in sortedNews" class="news-section" :class="[article.type, { dark }]" :key="index">
            <template v-if="article.type === 'changelog'">
              <p>You’re running version {{changelog.version}} of Mattrbld. <a href="#" @click.prevent="openChangelog">See what’s new</a></p>
              <footer>
                <span>{{article.author}}, {{article.formattedDate}}</span>
              </footer>
            </template>
            <template v-else>
              <h3 v-if="article.title">{{article.title}}</h3>
              <p>{{article.blurb}} <a v-if="article.renderedContent" href="#" @click.prevent="activeNews = article; showDetails = true">Read more</a></p>
              <footer>
                <span>{{article.author}}, {{article.formattedDate}}</span>
              </footer>
            </template>
          </section>
        </div>
      </transition>
    </section>
    <section class="wrapper commits">
      <h2>Recent Updates</h2>
      <transition mode="out-in">
        <MbLoader v-if="logLoading" />
        <ul v-else>
          <li v-for="(commit, index) in log" :class="{ dark }" :key="index">
            <AsyncImage :src="commit.author.avatar" />
            <span class="message">{{commit.message}}</span>
            <span>{{commit.author.name}}, {{commit.formattedDate}}</span>
          </li>
        </ul>
      </transition>
    </section>
    <section class="wrapper local-changes">
      <h2>Local Changes</h2>
      <ul>
        <li v-for="(path, index) in locallyChangedFiles" class="change-indicator" :class="{ dark }" :key="index">
          <span class="path">{{path.replace(`${projectDir}/`, '')}}</span>
        </li>
        <li v-if="locallyChangedFiles.length === 0" class="empty-state" :class="{ dark }">Your local changes will appear here once you edit some content</li>
      </ul>
    </section>
    <MbModal class="details-modal" :dark="dark" :title="activeNews.type === 'changelog' ? 'Changelog' : activeNews.title" :visible="showDetails" @close="showDetails = false">
      <article v-html="activeNews.type === 'changelog' ? renderedChangelog : activeNews.renderedContent" />
      <template #actions>
        <MbButton :dark="dark" @click="showDetails = false">Close</MbButton>
      </template>
    </MbModal>
  </div>
</template>

<script>
import { formatDistanceToNow } from 'date-fns';
import { log } from 'isomorphic-git';
import matter from 'gray-matter';

// eslint-disable-next-line import/no-unresolved
import CHANGELOG from '../../CHANGELOG.md?raw'; // false positive because plugin-import can't handle query strings

import fs, { joinPath, PlainFS } from '../fs';
import MarkdownParser from '../assets/js/MarkdownParser';

import generateAvatar from '../assets/js/generateAvatar';

import AsyncImage from '../components/utility/AsyncImage.vue';

const md = new MarkdownParser();

export default {
  beforeUnmount() {
    this.log.forEach((entry) => {
      if (entry.author.avatar && entry.author.avatar.startsWith('blob:')) URL.revokeObjectURL(entry.author.avatar);
    });
  },
  components: {
    AsyncImage,
  },
  computed: {
    changelog() {
      const { data, content } = matter(CHANGELOG);
      return { content, date: new Date(data.updatedAt), version: data.currentVersion };
    },
    firstName() {
      if (!this.$store.getters.userInCurrentProject) return 'Anonymous'; // Dashboard gets unloaded after Project so this is needed to avoid an error
      return this.$store.getters.userInCurrentProject.name.split(' ')[0];
    },
    locallyChangedFiles() {
      return this.$store.state.application.locallyChangedFiles.filter((path) => path.startsWith(this.projectDir));
    },
    projectDir() {
      return `/projects/${this.$store.state.currentProject.id}`;
    },
    sidebarCards() {
      const { sidebar } = this.$store.state.currentProject;
      return sidebar
        .filter((entry) => entry.showInDashboard && entry.target && (!entry.limitToRoles || entry.limitToRoles.length === 0 || entry.limitToRoles.includes(this.$store.getters.userInCurrentProject.role)))
        .map((entry) => {
          // old configs may still store static projectIDs in the sidebar, this ensures there's no unexpected results
          if (entry.target.params?.id) entry.target.params.id = this.$store.state.currentProject.id; // eslint-disable-line no-param-reassign
          return entry;
        });
    },
    sortedNews() {
      if (this.newsLoading) return [];
      const news = [
        ...this.news,
        {
          author: 'Mattrbld', createdAt: this.changelog.date, formattedDate: formatDistanceToNow(this.changelog.date, { addSuffix: true }), type: 'changelog',
        },
      ];
      return news.sort((a, b) => b.createdAt - a.createdAt);
    },
  },
  created() {
    this.refresh();
  },
  data() {
    return {
      activeNews: {},
      log: [],
      logLoading: true,
      news: [],
      newsLoading: true,
      renderedChangelog: null,
      showDetails: false,
    };
  },
  emits: ['push'],
  methods: {
    async fetchLog() {
      const rawLog = await log({
        fs: PlainFS,
        dir: this.projectDir,
        depth: 10,
      });
      const userIds = new Map();
      const userEmails = []; // needed to assign avatars to emails

      rawLog.forEach((entry) => {
        const { email, name } = entry.commit.author;
        const { id } = this.$store.state.currentProject.users.find((user) => user.email === email) || {};
        userIds.set(email, { id, name });
      });

      const usersPath = joinPath(this.projectDir, '.mattrbld', 'users');
      const [avatarFiles, localAvatars] = await Promise.all([fs.readdir(usersPath), fs.readdir('/users')]);
      const avatarPromises = [];

      userIds.forEach(({ id, name }, email) => {
        if (avatarFiles.includes(`${id}.jpg`)) avatarPromises.push(fs.readFile(`${usersPath}/${id}.jpg`));
        else if (localAvatars.includes(`${id}.jpg`)) avatarPromises.push(fs.readFile(`/users/${id}.jpg`)); // only works if the local user id matches the repo user’s id, which should be the case
        else if (email === this.$store.state.user.email && localAvatars.includes(`${this.$store.state.user.id}.jpg`)) avatarPromises.push(fs.readFile(`/users/${this.$store.state.user.id}.jpg`)); // if not at least we can show the current users local avatar, since we know their local id
        else {
          avatarPromises.push(generateAvatar(name, '#A29BFE', '#6c5ce7', 'light', email));
        }
        userEmails.push(email);
      });

      const avatars = await Promise.all(avatarPromises);
      const avatarMap = new Map();
      avatars.forEach((avatar, index) => {
        if (typeof avatar !== 'string') avatarMap.set(userEmails[index], URL.createObjectURL(new Blob([avatar]), { type: 'image/jpeg' }));
        else avatarMap.set(userEmails[index], avatar);
      });

      this.log = rawLog.map((entry) => {
        const { commit } = entry;
        const cleanCommit = {
          message: commit.message.split('\n')[0],
          date: commit.committer.timestamp * 1000,
          formattedDate: formatDistanceToNow(new Date(commit.committer.timestamp * 1000), { addSuffix: true }),
          author: {
            avatar: avatarMap.get(commit.author.email),
            name: commit.author.name,
          },
        };
        return cleanCommit;
      });
      this.logLoading = false;
    },
    async fetchNews() {
      try {
        const newsPath = joinPath(this.projectDir, '.mattrbld', 'news');
        const newsFiles = (await fs.readdir(newsPath)).filter((path) => path.endsWith('.md'));
        const rawNews = await Promise.all(newsFiles.map((name) => fs.readFile(joinPath(newsPath, name), 'utf8')));

        this.news = []; // so we don’t end up with duplicates if some news were already loaded

        rawNews.forEach((item) => {
          const { data, content } = matter(item);
          this.news.push({
            author: data.author,
            blurb: data.blurb,
            createdAt: new Date(data.createdAt),
            formattedDate: formatDistanceToNow(new Date(data.createdAt), { addSuffix: true }),
            renderedContent: md.parse(content),
            title: data.title,
            type: 'article',
          });
        });
      } catch (err) {
        if (err.code !== 'ENOENT') this.$store.commit('addToast', { message: `Something went wrong while fetching the news: ${err.message}`, type: 'error' });
      }
      this.newsLoading = false;
    },
    openChangelog() {
      if (this.renderedChangelog === null) this.renderedChangelog = md.parse(this.changelog.content);
      this.activeNews = this.sortedNews.find((news) => news.type === 'changelog');
      this.showDetails = true;
    },
    refresh() {
      this.logLoading = true;
      this.newsLoading = true;
      this.fetchLog();
      this.fetchNews();
    },
  },
  props: {
    dark: Boolean,
  },
};
</script>

<style lang="scss" scoped>
  @use '../assets/styles/breakpoints' as *;

  .project-dashboard {
    padding: 0 2rem 8rem 2rem;
    user-select: none;
    overflow-y: auto;
    overflow-x: hidden;
    height: 100%;

    @media #{$mobile} {
      padding-left: 1rem;
      padding-right: 1rem;
      padding-bottom: 4rem;
    }

    header,
    section.wrapper {
      max-width: rem(1120);
      margin: 0 auto;
    }

    header {
      margin-bottom: 4rem;

      h1 {
        margin-top: 1.5rem;
        line-height: 2.5rem;
      }
    }

    section.wrapper {
      &:not(:last-child) {
        margin-bottom: 8rem;

        @media #{$mobile} {
          margin-bottom: 4rem;
        }
      }

      &.cards {
        @media #{$mobile} {
          margin-left: -1rem;
          margin-right: -1rem;
        }

        .scroller:deep(.scroll-area) {
          display: flex;

          @media #{$mobile} {
            padding-left: 1rem;
            padding-right: 1rem;
          }
        }

        .card {
          min-width: 16rem;
          padding: 0.5rem;
          border-radius: var(--radius-l);
          border: 0.0625rem solid color-mix(in srgb, var(--text) 12%, transparent);
          text-align: center;

          &.dark {
            border-color: color-mix(in srgb, var(--text-dark) 12%, transparent);
          }

          &:not(:last-child) {
            margin-right: 1rem;
          }

          .number {
            margin-top: 3.5rem;
            margin-bottom: 0.5rem;
          }

          .icon {
            margin: 3.5rem auto 0.5rem auto;
            width: 3rem;
            height: 3rem;
          }

          .label {
            margin: 0;
            margin-bottom: rem(56);
          }

          .button {
            width: 100%;
          }
        }
      }

      &.news {
        .loader,
        > div {
          &.v-enter-active,
          &.v-leave-active {
            transition: opacity 200ms ease;

            &.v-enter-from,
            &.v-leave-to {
              opacity: 0;
            }
          }
        }

        .news-section {
          &.dark {
            > footer {
              color: var(--text-secondary-dark);
            }
          }

          &:not(:last-child) {
            margin-bottom: 3rem;
          }

          > h3 {
            margin-bottom: 0.5rem;
          }

          > p {
            margin-top: 0.5rem;
            margin-bottom: 0.5rem;
            max-width: 40rem;
          }

          > footer {
            font-size: rem(14);
            color: var(--text-secondary);
          }
        }
      }

      &.commits,
      &.local-changes {
        .loader,
        ul {
          &.v-enter-active,
          &.v-leave-active {
            transition: opacity 200ms ease;

            &.v-enter-from,
            &.v-leave-to {
              opacity: 0;
            }
          }
        }

        ul {
          list-style: none;
          margin: 0;

          li {
            display: flex;
            align-items: center;
            padding: 1rem;
            border: 0.0625rem solid color-mix(in srgb, var(--text) 12%, transparent);
            border-radius: var(--radius-m);

            &.dark {
              border-color: color-mix(in srgb, var(--text-dark) 12%, transparent);

              span:last-of-type:not(:first-of-type) {
                color: var(--text-secondary-dark);
              }
            }

            &.change-indicator::before {
              content: '';
              display: block;
              width: 0.5rem;
              height: 0.5rem;
              border-radius: 50%;
              background-color: var(--warning-saturated);
              margin-right: 1rem;
              flex-shrink: 0;
            }

            &.empty-state {
              border: none;
              color: var(--text-secondary);
              justify-content: center;

              &.dark {
                color: var(--text-secondary-dark);
              }
            }

            &:not(:last-child) {
              margin-bottom: 1rem;
            }

            .async-image {
              width: 2.5rem;
              height: 2.5rem;
              border-radius: 50%;
              margin-right: 1rem;

              @media #{$mobile} {
                width: 1.5rem;
                height: 1.5rem;
              }
            }

            span {
              white-space: nowrap;
              flex-shrink: 0;
              text-overflow: ellipsis;
              overflow: hidden;

              &.message,
              &.path {
                flex-shrink: 1;
                margin-right: auto;
              }

              &:last-of-type:not(:first-of-type) {
                color: var(--text-secondary);
                font-size: rem(14);
                margin-left: 1rem;

                @media #{$mobile} {
                  display: none;
                }
              }
            }
          }
        }
      }
    }
  }

  .details-modal article {
    &:deep(> *:first-child) {
      margin-top: 0;
    }

    &:deep(img) {
      display: block;
      max-width: 100%;
      margin: 2rem auto;
    }
  }
</style>
