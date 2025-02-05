<template>
  <transition duration="350">
    <div v-if="isTablet && visible" class="mask" :class="{ dark, swiping }" :style="{ opacity: maskOpacity }" @click="visible = false" />
  </transition>
  <transition>
    <div v-if="currentProject.id" v-show="visible" v-bind="$attrs" class="project-sidebar" :class="{ dark, swiping }" ref="el" :style="{ transform: sidebarTransform }" tabindex="-1" @touchstart="swipeStart" @touchmove="swipeUpdate" @touchend="swipeEnd">
      <router-link custom :to="{ name: 'Project' }" v-slot="{ navigate }">
        <MbProjectAvatar :avatar="currentProject.avatar" :project-id="currentProject.id" :project-name="currentProject.name" @click="goTo(navigate)" />
      </router-link>
      <div class="meta">
        <p>{{currentProject.name}}</p>
        <MbChip v-if="gitStatus.label" :color="gitStatus.color" :label="gitStatus.label" :loading="gitStatus.loading" @click="$emit('git-status-click')" @mouseenter="handleChipTooltip" />
      </div>
      <ul class="custom options">
        <template v-for="(option, index) in sidebarOptions" :key="index">
          <router-link v-if="option.target" custom :to="option.target" v-slot="{ isExactActive, navigate }">
            <!-- the :class below is an ugly hack since isExactActive ignores queries on nested routes apparently -->
            <li :class="{ active: option.target && option.target.query && option.target.query.tab ? isExactActive && $route.query.tab === option.target.query.tab : isExactActive }" role="link" tabindex="0" @click="goTo(navigate)" @keydown.space.prevent @keyup.enter.space="goTo(navigate)">
              <MbIcon :icon="option.icon || (option.target && option.target.name === 'Project.Collection' && 'folder') || 'document'" />
              <span>{{option.label}}</span>
            </li>
          </router-link>
          <li class="separator" v-else-if="option.label">{{option.label}}</li>
          <li class="separator line" v-else></li>
        </template>
      </ul>
      <MbButton class="back-button" :dark="dark" icon="chevron-left" icon-first @click="backToProjects">Back to all projects</MbButton>
    </div>
  </transition>
</template>

<script>
import isPrivilegedUser from '../../mixins/isPrivilegedUser';
import { projectDefaults } from '../../store';

export default {
  beforeUnmount() {
    if (this.visible) this.$store.commit('setAppProperty', { key: 'sidebarVisible', value: false });
    window.removeEventListener('touchstart', this.windowSwipeStart, { passive: false });
  },
  computed: {
    currentProject() {
      return this.$store.state.currentProject;
    },
    isTablet() {
      return this.$store.state.application.tablet;
    },
    projectDir() {
      return `/projects/${this.currentProject.id}`;
    },
    sidebarOptions() {
      if (this.currentProject.sidebar) {
        const sidebarCopy = [...this.currentProject.sidebar];
        const includesDashboard = sidebarCopy.find((entry) => entry.target?.name === 'Project');
        const includesMediaLibrary = sidebarCopy.find((entry) => entry.target?.name === 'Project.MediaLibrary');
        const includesSettings = sidebarCopy.find((entry) => entry.target?.name === 'Project.Settings');

        if (!includesDashboard || !includesMediaLibrary || !includesSettings) {
          sidebarCopy.push({ separator: true });
        }

        if (!includesDashboard) {
          sidebarCopy.push({
            label: 'Dashboard',
            icon: 'grid',
            target: {
              name: 'Project',
            },
            protected: true,
          });
        }

        if (!includesMediaLibrary) {
          sidebarCopy.push({
            label: 'Media Library',
            icon: 'image-stack',
            target: {
              name: 'Project.MediaLibrary',
            },
            protected: true,
          });
        }

        if (!includesSettings) {
          sidebarCopy.push({
            label: 'Settings',
            icon: 'settings',
            target: {
              name: 'Project.Settings',
            },
            onlyPrivileged: true,
            protected: true,
          });
        }

        return sidebarCopy
          .filter((entry) => {
            if (entry.onlyPrivileged && !this.isPrivilegedUser) return false;
            return !entry.limitToRoles
            || entry.limitToRoles.length === 0
            || entry.limitToRoles.includes(this.$store.getters.userInCurrentProject.role);
          })
          .map((entry) => {
            if (!entry.target) return entry;
            return { ...entry, target: this.transformRouterTarget(entry.target) };
          });
      }

      return projectDefaults.sidebar;
    },
    visible: {
      get() {
        return this.$route.meta.sidebar && this.$store.state.application.sidebarVisible;
      },
      set(v) {
        this.$store.commit('setAppProperty', { key: 'sidebarVisible', value: v });
      },
    },
  },
  created() {
    if (!this.isTablet) this.$store.commit('setAppProperty', { key: 'sidebarVisible', value: true });
    else window.addEventListener('touchstart', this.windowSwipeStart, { passive: false });
  },
  data() {
    return {
      maskOpacity: null,
      maxSwipeDistance: null,
      sidebarTransform: null,
      swipeStartX: 0,
      swipeStartY: 0,
      swiping: false,
      windowSwipe: false,
    };
  },
  emits: ['git-status-click'],
  inheritAttrs: false,
  methods: {
    backToProjects() {
      if (!window.opener || window.opener.closed || window.opener.location.pathname !== '/') this.$router.push({ name: 'Home' });
      else {
        window.close();
        window.opener.focus();
      }
    },
    goTo(navigate) {
      navigate();
      if (this.isTablet) window.setTimeout(() => { this.visible = false; }, 0); // so the leave animation plays properly
    },
    handleChipTooltip(e) {
      const { message } = this.gitStatus;
      if (message) {
        this.$store.commit(
          'setTooltip',
          {
            position: 'right',
            message,
            target: e.target,
          },
        );
      }
    },
    async swipeEnd(e) {
      if (!this.swiping) return;
      const finalX = e.changedTouches[0].clientX;
      const distance = finalX - this.swipeStartX;
      this.swiping = false;

      await this.$nextTick(); // wait a tick so the swiping class is removed and the transitions can take over

      if (distance < 0 && Math.abs(distance) > this.maxSwipeDistance / 2) {
        this.sidebarTransform = 'translateX(-100%)';
        this.maskOpacity = 0;
        this.visible = false;
      } else {
        this.sidebarTransform = null;
        this.maskOpacity = null;
      }
    },
    swipeStart(e) {
      if (!this.isTablet) return;
      this.maxSwipeDistance = this.$refs.el.getBoundingClientRect().width;
      this.swipeStartX = e.changedTouches[0].clientX;
      this.swipeStartY = e.changedTouches[0].clientY;
      this.swiping = true;
    },
    swipeUpdate(e) {
      if (!this.swiping) return;
      const currentX = e.changedTouches[0].clientX;
      const currentY = e.changedTouches[0].clientY;
      const distance = currentX - this.swipeStartX;
      const distanceY = currentY - this.swipeStartY;

      if (Math.abs(distance) < 15 && Math.abs(distanceY) > Math.abs(distance)) { // if we haven’t moved much horizontally, but the y direction is bigger, we want to scroll, so abort
        this.swipeEnd(e);
        return;
      }

      this.sidebarTransform = `translateX(${Math.min(distance, 0)}px)`;
      this.maskOpacity = Math.min(1 + distance / this.maxSwipeDistance, 1);
    },
    transformRouterTarget(target) {
      if (!target) return null;
      const transformedTarget = {
        name: target.name,
        params: target.params ? { ...target.params } : {},
        query: target.query ? { ...target.query } : {},
      };

      transformedTarget.params.id = this.currentProject.id;

      if (target.name === 'Edit Content') transformedTarget.params.path = `${this.projectDir}${target.params.path}`;
      return transformedTarget;
    },
    async windowSwipeEnd(e) {
      window.removeEventListener('touchmove', this.windowSwipeUpdate, { passive: false });
      window.removeEventListener('touchend', this.windowSwipeEnd);
      if (!this.swiping) return;
      const finalX = e.changedTouches[0].clientX;
      const distance = finalX - this.swipeStartX;
      this.swiping = false;
      this.windowSwipe = false;

      await this.$nextTick(); // wait a tick so the swiping class is removed and the transitions can take over

      if (this.maxSwipeDistance && distance > this.maxSwipeDistance / 3) {
        this.sidebarTransform = null;
        this.maskOpacity = null;
      } else {
        this.sidebarTransform = 'translateX(-100%)';
        this.maskOpacity = 0;
        this.visible = false;
      }
    },
    windowSwipeStart(e) {
      if (!this.isTablet || this.swiping || this.visible || this.$store.state.application.openModals.length > 0) return;
      if (e.changedTouches[0].clientX > 48) return;

      // e.preventDefault(); // this would be needed to prevent chromes and safaris swipe to go back, but it also prevents clicks from firing, maybe it could be avoided with overscroll-behaviour on body?

      this.swipeStartX = e.changedTouches[0].clientX;
      this.swipeStartY = e.changedTouches[0].clientY;
      this.sidebarTransform = 'translateX(-100%)';
      this.maskOpacity = 0;

      window.addEventListener('touchmove', this.windowSwipeUpdate, { passive: false });
      window.addEventListener('touchend', this.windowSwipeEnd);
    },
    windowSwipeUpdate(e) {
      const currentX = e.changedTouches[0].clientX;
      const currentY = e.changedTouches[0].clientY;
      const distance = currentX - this.swipeStartX;
      const distanceY = currentY - this.swipeStartY;

      if (distance > 5) {
        if (e.cancelable) e.preventDefault();
        this.windowSwipe = true;
        this.swiping = true;
        this.$nextTick(() => { // wait a tick so it picks up on the set transform and opacity
          this.visible = true;
          this.$nextTick(() => { // wait another tick so we actually have the correct width
            this.maxSwipeDistance = this.$refs.el.getBoundingClientRect().width;
          });
        });
      }
      if (!this.swiping) return;

      if (Math.abs(distance) < 15 && Math.abs(distanceY) > Math.abs(distance)) { // if we haven’t moved much horizontally, but the y direction is bigger, we want to scroll, so abort
        this.windowSwipeEnd(e);
        return;
      }

      this.sidebarTransform = `translateX(${Math.min(-this.maxSwipeDistance + distance, 0)}px)`;
      this.maskOpacity = Math.min(distance / this.maxSwipeDistance, 1);
    },
  },
  mixins: [
    isPrivilegedUser,
  ],
  props: {
    dark: Boolean,
    gitStatus: {
      type: Object,
      default: () => ({}),
    },
  },
  watch: {
    isTablet(nv) {
      if (nv && this.visible) {
        this.visible = false;
        window.addEventListener('touchstart', this.windowSwipeStart, { passive: false });
      } else if (!nv && !this.visible) {
        this.visible = true;
        window.removeEventListener('touchstart', this.windowSwipeStart, { passive: false });
      }
    },
    visible(nv) {
      if (nv) {
        if (!this.windowSwipe) {
          if (this.sidebarTransform) this.sidebarTransform = null;
          if (this.maskOpacity !== null) this.maskOpacity = null;
        }
        this.$nextTick(() => this.$refs.el.focus());
      }
    },
  },
};
</script>

<style lang="scss" scoped>
  @use '../../assets/styles/breakpoints' as *;

  .mask {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: color-mix(in srgb, var(--bg-dark) 60%, transparent);

    &:not(.swiping) {
      transition: opacity 200ms ease;
    }

    &.dark {
      background-color: color-mix(in srgb, black 60%, transparent);
    }

    &.v-enter-active:not(.swiping),
    &.v-leave-active:not(.swiping) {
      transition: opacity 350ms ease;

      &.v-enter-from,
      &.v-leave-to {
        opacity: 0 !important;
      }
    }
  }

  .project-sidebar {
    position: fixed;
    top: 0rem;
    left: 0rem;
    width: rem(320);
    max-width: calc(100vw - 2rem);
    height: 100%;
    padding: 1rem;
    background-color: var(--bg-secondary);
    display: flex;
    flex-direction: column;
    overflow-x: hidden;
    overflow-y: auto;
    user-select: none;
    touch-action: pan-y;

    @media #{$tablet} {
      border-top-right-radius: var(--radius-l);
      border-bottom-right-radius: var(--radius-l);
    }

    &:not(.swiping) {
      transition: transform 200ms ease;
    }

    &.dark {
      background-color: var(--bg-secondary-dark);

      .options {
        li:not(.separator) {
          &.disabled {
            color: var(--text-tertiary-dark);
          }

          &:hover,
          &:focus-visible {
            background-color: var(--bg-tertiary-dark);
          }
        }

        li.separator {
          color: var(--text-tertiary-dark);
        }
      }
    }

    &.v-enter-active:not(.swiping),
    &.v-leave-active:not(.swiping) {
      transition: transform 350ms cubic-bezier(0.215, 0.61, 0.355, 1);

      &.v-enter-from,
      &.v-leave-to {
        transform: translateX(-100%);
      }
    }

    &.v-leave-active {
      transition-timing-function: cubic-bezier(0.645, 0.045, 0.355, 1);
    }

    .project-avatar {
      margin-bottom: 1rem;
      width: 100%;
      border-radius: var(--radius-s);
      cursor: pointer;
    }

    .meta {
      display: flex;
      margin-bottom: 2rem;
      padding-left: 0.75rem;
      align-items: center;
      justify-content: space-between;

      p {
        margin: 0;
        margin-right: 0.5rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .chip {
        flex-shrink: 0;
        cursor: pointer;

        &:active {
          transform: translateY(0.125rem);
        }
      }
    }

    .options {
      list-style: none;
      margin: 0;
      padding: 0;
      margin-bottom: 2rem;

      li:not(.separator) {
        padding: 0.75rem 1rem;
        cursor: pointer;
        border-radius: var(--radius-m);
        transition: background-color 200ms ease;
        display: flex;
        align-items: center;

        &:not(:last-child) {
          margin-bottom: 0.5rem;
        }

        &.active {
          background-color: var(--accent);
          color: var(--text-dark);
        }

        &.disabled {
          pointer-events: none;
          color: var(--text-tertiary);
        }

        &:focus-visible {
          box-shadow: inset 0 0 0, rem(2) var(--accent);
        }

        &:hover,
        &:focus-visible {
          background-color: var(--bg-tertiary);

          &.active {
            background-color: var(--accent-darkened-5);
          }
        }

        .icon {
          margin-right: 1rem;
          flex-shrink: 0;
        }

        span {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      }

      li.separator {
        padding-left: 0.75rem;
        color: var(--text-secondary);

        &:not(:last-child) {
          margin-bottom: 0.5rem;
        }

        &:not(:first-child) {
          margin-top: 1.5rem;
        }

        &.line {
          margin-block: 1.5rem;
          background-color: currentColor;
          height: rem(1);
          opacity: 0.25;

          &:first-child {
            margin-top: 0;
          }
        }
      }
    }

    .back-button {
      margin-top: auto;
      flex-shrink: 0;
    }
  }
</style>
