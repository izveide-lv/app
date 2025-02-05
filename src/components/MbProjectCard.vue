<template>
  <button class="project-card" :class="{dark}" @click="handleClick" @contextmenu.prevent="openMenu">
    <MbProjectAvatar :avatar="avatar" :project-id="id" :project-name="name" />
    <footer>
      <div>
        <p><span v-show="localChanges" class="local-changes-indicator"/>{{name}}</p>
        <p class="meta">Edited {{formattedUpdatedAt}}</p>
      </div>
      <MbButton :dark="dark" icon="more-vertical" ref="menuButton" rounded tooltip="More" @click="openMenu" />
    </footer>
    <MbModal :dark="dark" :visible="showDeleteWarning" @close="showDeleteWarning = false">
      <p>This project has <strong>local changes that haven’t been published</strong> yet. Are you sure you want to <strong>permanently delete</strong> it?</p>
      <template #actions>
        <MbButton :dark="dark" @click="showDeleteWarning = false">Cancel</MbButton>
        <MbButton :dark="dark" type="negative" @click="deleteProject(true)">Delete Project</MbButton>
      </template>
    </MbModal>
    <MbContextMenu class="options" :dark="dark" :from-right="popover.fromRight" :options="options" :show="popover.show" :target="popover.target" :x="popover.x" :y="popover.y" @close="popover.show = false" />
  </button>
</template>

<script>
import { formatDistanceToNowStrict } from 'date-fns';

export default {
  computed: {
    formattedUpdatedAt() {
      const distance = formatDistanceToNowStrict(this.updatedAt, { addSuffix: true });
      if (distance !== '0 seconds ago') return distance;
      return 'just now';
    },
  },
  data() {
    return {
      options: [
        {
          action: () => this.$router.push({ name: 'Project', params: { id: this.id } }),
          icon: 'folder-open',
          label: 'Open',
        },
        {
          action: () => {
            const routeData = this.$router.resolve({ name: 'Project', params: { id: this.id } });
            const existingTab = window.open('', `com.mattrbld.app.Project/${this.id}`); // this will focus a window of the same name (reverse domain to avoid duplicates) or open a blank new one
            if (existingTab.location.href === 'about:blank') existingTab.location.href = routeData.href; // we just opened a blank window, navigate to url
          },
          icon: 'open-new-window',
          label: 'Open in new window',
        },
        {
          action: () => this.$router.push({ name: 'Project.Settings', params: { id: this.id } }),
          icon: 'settings',
          label: 'Project settings',
        },
        {
          action: this.deleteProject,
          icon: 'trash',
          label: 'Delete',
          type: 'negative',
        },
      ],
      popover: {
        show: false,
        target: null,
        x: 0,
        y: 0,
      },
      showDeleteWarning: false,
    };
  },
  emits: ['click', 'delete'],
  methods: {
    async deleteProject(force) {
      if (this.localChanges && !force) {
        this.showDeleteWarning = true;
        return;
      }
      if (this.showDeleteWarning) {
        this.showDeleteWarning = false;
        await new Promise((res) => { window.setTimeout(res, this.$store.state.application.mobile ? 250 : 150); }); // HACK: Allow the modal close animation to play before proceeding
      }
      this.$emit('delete');
    },
    handleClick(e) {
      if (e.target === this.$refs.menuButton.$el || this.$refs.menuButton.$el.contains(e.target)) return;
      this.$emit('click', e);
    },
    openMenu(e) {
      if (e.type === 'contextmenu') {
        this.popover.x = e.clientX;
        this.popover.y = e.clientY;
        this.popover.fromRight = false;
      } else {
        const rect = e.target.getBoundingClientRect();
        this.popover.fromRight = true;
        this.popover.x = rect.right;
        this.popover.y = rect.top;
      }
      this.popover.target = e.currentTarget;
      this.popover.show = true;
    },
  },
  props: {
    avatar: String,
    dark: Boolean,
    id: {
      type: String,
      required: true,
    },
    localChanges: Boolean,
    name: String,
    updatedAt: Number,
  },
};
</script>

<style lang="scss" scoped>
  .project-card {
    position: relative;
    user-select: none;
    border: none;
    box-shadow: inset 0 0 0 0.0625rem var(--bg);
    border-radius: var(--radius-m);
    padding: 0;
    background-color: var(--bg);
    color: inherit;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    cursor: pointer;
    transition: background-color 200ms ease;

    &.dark {
      box-shadow: inset 0 0 0 0.0625rem var(--bg-tertiary-dark);
      background-color: var(--bg-tertiary-dark);

      &:focus,
      &:hover {
        background-color: var(--bg-secondary-dark);
      }

      &:active {
        background-color: var(--bg-dark);
      }

      footer div p.meta {
        color: var(--text-secondary-dark);
      }
    }

    &:focus,
    &:hover {
      background-color: var(--bg-secondary);

      .project-avatar:deep(img) {
        transform: scale(1.2);
      }
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
      z-index: 1;
      pointer-events: none;
      transition: opacity 200ms ease;
    }

    .project-avatar {
      border-bottom-left-radius: var(--radius-m);
      border-bottom-right-radius: var(--radius-m);

      &:deep(img) {
        transition: transform 350ms ease;
      }
    }

    footer {
      height: 100%;
      width: 100%;
      display: flex;
      align-items: center;
      padding: 0.5rem;
      padding-left: 1rem;

      div {
        margin-right: 1rem;
        text-align: left;
        overflow: hidden;

        p {
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;

          &.meta {
            font-size: 0.875rem;
            margin-top: 0.5rem;
            color: var(--text-secondary);
          }

          .local-changes-indicator {
            width: 0.5rem;
            height: 0.5rem;
            border-radius: 50%;
            background-color: var(--warning-saturated);
            display: inline-block;
            margin-right: 0.5rem;
            margin-top: rem(5);
            vertical-align: top;
          }
        }
      }

      .button {
        margin-left: auto;
      }
    }
  }
</style>
