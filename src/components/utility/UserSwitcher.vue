<template>
  <button class="user-switcher" :class="{dark}" @click="activatePopover">
    <span v-if="!isMobile" class="name">{{activeUser.name}}</span>
    <AsyncImage draggable="false" :src="activeUser.avatar" :alt="`${activeUser.name}’s Avatar`" />
    <MbPopover class="user-popover" :dark="dark" from-right no-content-padding :visible="popover.show" :x="popover.x" :y="popover.y" @close="popover.show = false">
      <transition mode="out-in">
        <MbLoader v-if="usersLoading || users.length === 0" />
        <div v-else class="users">
          <div v-for="user in users" class="user" :class="{ active: currentActiveUser === user.id, disabled: $route.name.startsWith('Project') && !user.projects.includes($route.params.id) }" :key="user.id" :tabindex="$route.name.startsWith('Project') && !user.projects.includes($route.params.id) ? -1: 0" @click="setActiveUser(user.id)" @keydown.space.prevent @keyup.enter.space="setActiveUser(user.id)">
            <AsyncImage :src="user.avatar" :alt="`${user.name}’s avatar`" />
            <span v-if="!isMobile">{{user.name}}</span>
            <span v-else>{{user.name.split(' ')[0]}}</span>
            <span class="email">({{user.email}})</span>
          </div>
        </div>
    </transition>
      <template #footer>
        <MbButton :dark="dark" icon="settings" @click="openUserSettings">{{ isMobile ? 'Settings' : 'User Settings' }}</MbButton>
        <MbButton :dark="dark" icon="plus" type="positive" @click="showAddUser = true; popover.show = false">{{ isMobile ? 'Add' : 'Add User' }}</MbButton>
      </template>
    </MbPopover>
    <MbModal class="settings-modal" :dark="dark" slim title="User Settings" :visible="showUserSettings" @close="handleSettingsModalClose">
      <p class="h3">Interface</p>
      <MbSegmentedSelector v-model="theme" :dark="dark" :options="themeOptions" />
      <div class="row">
        <p>UI scaling:</p>
        <MbSelect v-model="scale" :dark="dark" :options="scaleOptions" />
      </div>
      <p class="h3">Default Details</p>
      <p>These settings are used as defaults when you join a project, but can be overridden on a per-project basis.</p>
      <MbInput v-model="newUserData.name" class="name" :dark="dark" :error="errors.userName" icon="user" label="Name" @blur="validate('userName'); checkAvatarRegeneration()" />
      <MbInput v-model="newUserData.email" :dark="dark" :error="errors.userEmail" icon="mail" label="Email Address" type="email" @blur="validate('userEmail'); checkAvatarRegeneration()" />
      <p class="h3">Avatar</p>
      <div class="row avatar">
        <AvatarUploader ref="uploader" @ready="handleAvatarReady" />
        <AsyncImage :src="newUserData.avatar" :alt="`${newUserData.name}’s avatar`" />
        <MbButton v-show="avatarUploaded" :dark="dark" :disabled="formErrors" icon-first icon="trash" type="negative" @click="regenerateAvatar">Remove</MbButton>
        <MbButton :dark="dark" icon-first :icon="avatarUploaded ? 'replace-alt' : 'upload'" @click="$refs.uploader.$el.click()">{{ avatarUploaded ? 'Replace' : 'Upload' }}</MbButton>
      </div>
      <p class="h3 negative">Danger Zone</p>
      <p>Should you no longer need this user and any of their projects including all unpublished local changes on this device, you can <strong>permanently</strong> remove them with the button below.</p>
      <p>Please keep in mind, however, that this action <strong>cannot be undone</strong>.</p>
      <MbButton class="delete-user" :dark="dark" icon-first icon="trash" type="negative" @click="showDeletionConfirmation = true">Delete user and all projects</MbButton>
      <template #actions>
        <MbButton :dark="dark" @click="handleSettingsModalClose">Cancel</MbButton>
        <MbButton :dark="dark" :disabled="formErrors" type="primary" @click="saveUser">Save</MbButton>
      </template>
    </MbModal>
    <MbModal class="confirmation-modal" :dark="dark" slim title="Are you sure?" :visible="showDeletionConfirmation" @close="showDeletionConfirmation = false">
      <p>This action is <strong>destructive</strong> and cannot be undone. You will lose any local changes that were made on this machine.</p>
      <template #actions>
        <MbButton :dark="dark" @click="showDeletionConfirmation = false">Cancel</MbButton>
        <MbButton :dark="dark" type="negative" @click="deleteUser">Delete Permanently</MbButton>
      </template>
    </MbModal>
    <MbModal class="settings-modal" :dark="dark" slim title="Add New User" :visible="showAddUser" @close="handleSettingsModalClose">
      <p>You can create additional local users in case this device is used by multiple people, or to separate your personal projects from your work.</p>
      <p class="h3">Default Details</p>
      <MbInput v-model="newUserData.name" :autofocus="!isMobile" :dark="dark" :error="errors.userName" icon="user" label="Name" @blur="validate('userName'); checkAvatarRegeneration()" />
      <MbInput v-model="newUserData.email" :dark="dark" :error="errors.userEmail" icon="mail" label="Email Address" type="email" @blur="validate('userEmail'); checkAvatarRegeneration()" />
      <p class="h3">Avatar</p>
      <div class="row avatar">
        <AsyncImage :src="newUserData.avatar" :alt="`${newUserData.name}’s avatar`" />
        <MbButton v-show="avatarUploaded" :dark="dark" :disabled="formErrors" icon-first icon="trash" type="negative" @click="regenerateAvatar">Remove</MbButton>
        <MbButton :dark="dark" icon-first :icon="avatarUploaded ? 'replace-alt' : 'upload'" @click="$refs.uploader.$el.click()">{{ avatarUploaded ? 'Replace' : 'Upload' }}</MbButton>
      </div>
      <template #actions>
        <MbButton :dark="dark" @click="handleSettingsModalClose">Cancel</MbButton>
        <MbButton :dark="dark" :disabled="formErrors" type="primary" @click="createUser">Create</MbButton>
      </template>
    </MbModal>
    <MbModal class="deletion-progress-modal" :dark="dark" permanent slim title="Deleting user…" :visible="showDeletionProgress">
      <MbProgress :colors="['negative']" :dark="dark" indetermined />
    </MbModal>
  </button>
</template>

<script>
import slugify from '@sindresorhus/slugify';

import fs from '../../fs';
import { rmrf } from '../../fs/workerFS';

import generateAvatar from '../../assets/js/generateAvatar';

import AsyncImage from './AsyncImage.vue';
import AvatarUploader from './AvatarUploader.vue';

export default {
  beforeUnmount() {
    this.users.forEach((user) => {
      URL.revokeObjectURL(user.avatar);
    });
  },
  components: {
    AsyncImage,
    AvatarUploader,
  },
  computed: {
    currentActiveUser() {
      return this.$store.state.application.activeUser;
    },
    formErrors() {
      return Object.values(this.errors).some((error) => error);
    },
    isMobile() {
      return this.$store.state.application.mobile;
    },
    theme: {
      get() {
        return this.$store.state.user.theme;
      },
      set(value) {
        this.$store.commit('setUserProperty', { key: 'theme', value });
      },
    },
    scale: {
      get() {
        return this.$store.state.user.uiScale;
      },
      set(value) {
        this.$store.commit('setUserProperty', { key: 'uiScale', value });
      },
    },
  },
  created() {
    if (this.currentActiveUser) {
      this.fetchActiveUser();
      this.fetchUsers();
    }
  },
  data() {
    return {
      avatarUploaded: false,
      activeUser: {
        avatar: null,
        email: '',
        id: null,
        name: '',
      },
      errors: {
        userName: '',
        userEmail: '',
      },
      newUserData: {
        avatar: null,
        email: null,
        name: null,
      },
      popover: {
        show: false,
        x: 0,
        y: 0,
      },
      previousScale: null,
      previousTheme: null,
      scaleOptions: [
        { label: 'OS Default', value: 'auto' },
        { label: '75%', value: 0.75 },
        { label: '87%', value: 0.875 },
        { label: '100%', value: 1 },
        { label: '112%', value: 1.125 },
        { label: '125%', value: 1.25 },
        { label: '150%', value: 1.5 },
        { label: '175%', value: 1.75 },
        { label: '200%', value: 2 },
      ],
      showAddUser: false,
      showDeletionConfirmation: false,
      showDeletionProgress: false,
      showUserSettings: false,
      themeOptions: [
        { label: 'OS Default', value: 'auto' },
        { label: 'Light', value: 'light' },
        { label: 'Dark', value: 'dark' },
      ],
      users: [],
      usersLoading: false,
    };
  },
  methods: {
    async activatePopover() {
      const elRect = this.$el.getBoundingClientRect();
      this.popover.x = elRect.right;
      this.popover.y = elRect.top;
      if (this.users.length === 0) this.fetchUsers();
      this.popover.show = true;
    },
    checkAvatarRegeneration() {
      if (!this.avatarUploaded && !this.formErrors && this.newUserData.name && this.newUserData.email) this.regenerateAvatar();
    },
    async createUser() {
      try {
        let newUserId = slugify(this.newUserData.email.trim()); // WARNING: this could lead to collisions if there’s two very similar email addresses (foo-bar@exmaple.com foo.bar@example.com), but since we have a low amount of local users, I think it’s negligible
        let alreadyExists = await this.idExists(newUserId);

        while (alreadyExists) {
          newUserId += `-${Math.random().toString(36).slice(2, 9)}`;
          alreadyExists = await this.idExists(newUserId); // eslint-disable-line no-await-in-loop
        }

        const byteString = window.atob(this.newUserData.avatar.split(',')[1]);
        const avatarData = Uint8Array.from(byteString, (ch) => ch.charCodeAt(0));
        const user = {
          email: this.newUserData.email.trim(),
          id: newUserId,
          name: this.newUserData.name.trim(),
          projectAccessDates: {},
          projects: [],
        };
        await fs.writeFile(`/users/${newUserId}.json`, JSON.stringify(user, null, 2), 'utf8');
        await fs.writeFile(`/users/${newUserId}.jpg`, avatarData, 'utf8'); // we know it’s a image/jpeg because we converted it ourselves in AvatarUploader / generateAvatar
        this.users.push({
          ...user,
          avatar: URL.createObjectURL(new Blob([avatarData], { type: 'image/jpeg' })),
          id: newUserId,
        });
        this.setActiveUser(newUserId);
        this.handleSettingsModalClose();
      } catch (err) {
        this.$store.commit('addToast', { message: `Something went wrong while creating the user: ${err.message}`, type: 'error' });
      }
    },
    async deleteUser() {
      const userToDelete = this.currentActiveUser;
      const projectsOfActiveUser = this.users.find((user) => user.id === userToDelete).projects;
      let projectsReferencedByOtherUsers = [];
      this.users.forEach((user) => {
        if (user.id !== userToDelete) projectsReferencedByOtherUsers = projectsReferencedByOtherUsers.concat(user.projects);
      });
      projectsReferencedByOtherUsers = Array.from(new Set(projectsReferencedByOtherUsers));
      const projectsUniqueToActiveUser = projectsOfActiveUser.filter((project) => !projectsReferencedByOtherUsers.includes(project));
      const deletionQueue = [];

      if (projectsUniqueToActiveUser.length > 0) projectsUniqueToActiveUser.forEach((project) => deletionQueue.push(rmrf(`/projects/${project}/`)));

      deletionQueue.push(fs.unlink(`/users/${userToDelete}.json`));
      deletionQueue.push(fs.unlink(`/users/${userToDelete}.jpg`));

      try {
        this.showDeletionConfirmation = false;
        this.handleSettingsModalClose();
        this.showDeletionProgress = true;

        await Promise.all(deletionQueue);
        this.users.splice(this.users.findIndex((user) => user.id === userToDelete), 1);
        this.showDeletionProgress = false;

        if (this.users.length > 0) this.setActiveUser(this.users[0].id);
        else {
          this.$store.commit('setAppProperty', { key: 'activeUser', value: null });
          await this.$store.dispatch('saveAppData');
          this.$router.push({ name: 'Onboarding' });
        }
      } catch (err) {
        this.$store.commit('addToast', { message: `Something went wrong while deleting the user: ${err.message}`, type: 'error' });
        this.showDeletionProgress = false;
      }
    },
    async fetchActiveUser() {
      const activeUserAvatarData = await fs.readFile(`/users/${this.$store.state.application.activeUser}.jpg`);
      this.activeUser.avatar = URL.createObjectURL(new Blob([activeUserAvatarData], { type: 'image/jpeg' }));
      this.activeUser.email = this.$store.state.user.email;
      this.activeUser.name = this.$store.state.user.name;
      this.activeUser.id = this.currentActiveUser;
    },
    async fetchUsers() {
      this.usersLoading = true;
      try {
        const users = await fs.readdir('/users');
        const userIds = [];
        const userPromises = [];
        const avatarPromises = [];

        users.forEach((userFile) => {
          if (userFile.endsWith('.json')) {
            userPromises.push(fs.readFile(`/users/${userFile}`, 'utf8'));
            userIds.push(userFile.slice(0, -5)); // without .json
          }
          if (userFile.endsWith('.jpg')) avatarPromises.push(fs.readFile(`/users/${userFile}`));
        });

        const userJsonStrings = await Promise.all(userPromises);
        const avatarData = await Promise.all(avatarPromises);

        const userData = userJsonStrings.map((json) => JSON.parse(json));

        this.users = userData.map((user, index) => {
          const id = userIds[index];
          let avatar;

          if (id === this.currentActiveUser) avatar = this.activeUser.avatar;
          else avatar = URL.createObjectURL(new Blob([avatarData[index]], { type: 'image/jpeg' }));
          return { ...user, id, avatar };
        });
      } catch (err) {
        this.$store.commit('addToast', { message: `Something went wrong while fetching all users: ${err.message}`, type: 'error' });
      } finally {
        this.usersLoading = false;
      }
    },
    handleAvatarReady(avatar) {
      this.newUserData.avatar = avatar;
      this.avatarUploaded = true;
    },
    handleSettingsModalClose() {
      if (this.showUserSettings) this.showUserSettings = false;
      if (this.showAddUser) this.showAddUser = false;
      this.avatarUploaded = false;
      this.newUserData = {
        avatar: null,
        email: null,
        name: null,
      };
      if (this.previousScale) {
        this.scale = this.previousScale;
        this.previousScale = null;
      }
      if (this.previousTheme) {
        this.theme = this.previousTheme;
        this.previousTheme = null;
      }
      this.errors = {
        userName: '',
        userEmail: '',
      };
    },
    async idExists(id) {
      try {
        await fs.stat(`/users/${id}.json`);
        return true;
      } catch (err) {
        if (err.code === 'ENOENT' || err.code === 'ENOTDIR') return false;
        throw err;
      }
    },
    openUserSettings() {
      this.popover.show = false;
      this.avatarUploaded = true; // even if they have a generated avatar, it’s still uploaded
      this.previousScale = this.scale;
      this.previousTheme = this.theme;
      this.newUserData = {
        avatar: this.activeUser.avatar,
        email: this.activeUser.email,
        name: this.activeUser.name,
      };
      this.showUserSettings = true;
    },
    regenerateAvatar() {
      this.newUserData.avatar = generateAvatar(this.newUserData.name, '#A29BFE', '#6c5ce7', 'light', this.newUserData.email);
      if (this.avatarUploaded) this.avatarUploaded = false;
    },
    async saveUser() {
      if (!this.newUserData.avatar.startsWith('blob:')) { // we got a new avatar
        URL.revokeObjectURL(this.activeUser.avatar);
        try {
          // Save the avatar uri as Uint8Array along with the rest of the user configuration data
          // Based on https://stackoverflow.com/questions/12168909/blob-from-dataurl
          const byteString = window.atob(this.newUserData.avatar.split(',')[1]);
          const avatarData = Uint8Array.from(byteString, (ch) => ch.charCodeAt(0));
          await fs.writeFile(`/users/${this.activeUser.id}.jpg`, avatarData, 'utf8'); // we know it’s a image/jpeg because we converted it ourselves in AvatarUploader / generateAvatar
          const newAvatarURL = URL.createObjectURL(new Blob([avatarData], { type: 'image/jpeg' }));
          const userIndex = this.users.findIndex((existingUser) => existingUser.id === this.activeUser.id);
          this.activeUser.avatar = newAvatarURL;
          if (userIndex > -1) this.users[userIndex].avatar = newAvatarURL;
        } catch (err) {
          this.$store.commit('addToast', { message: `Something went wrong while saving the user avatar: ${err.message}`, type: 'error' });
          return; // abort
        }
      }

      const { email, name } = this.newUserData;

      this.$store.commit('setUserData', {
        ...this.$store.state.user,
        email: email.trim(),
        name: name.trim(),
        theme: this.theme,
        uiScale: this.scale,
      });

      const success = await this.$store.dispatch('saveUser');

      if (success) {
        const index = this.users.findIndex((user) => user.id === this.activeUser.id);
        this.users[index] = {
          ...this.users[index],
          avatar: this.activeUser.avatar,
          email: email.trim(),
          name: name.trim(),
          theme: this.theme,
          uiScale: this.scale,
        };
        this.activeUser.email = email;
        this.activeUser.name = name;
        this.previousScale = this.scale; // so it doesn’t get overwritten
        this.previousTheme = this.theme; // so it doesn’t get overwritten
        this.handleSettingsModalClose();
      }
    },
    setActiveUser(id) {
      this.popover.show = false;
      if (id === this.currentActiveUser) return;
      const user = this.users.find((existingUser) => existingUser.id === id);
      if (this.$route.name.startsWith('Project') && !user.projects.includes(this.$route.params.id)) return;
      const userData = {
        ...user,
        gitAuth: null,
        theme: user.theme || 'auto',
        uiScale: user.uiScale || 'auto',
      };
      this.$store.commit('setUserData', userData);
      this.$store.commit('setAppProperty', { key: 'activeUser', value: id });
      this.$store.dispatch('saveAppData');
    },
    validate(field) {
      let error = '';
      switch (field) {
        case 'userEmail':
          if (!this.newUserData.email) error = 'An email address is required';
          else if (!/^([a-z0-9_.+-]+)@([\da-z.-]+)\.([a-z.]{2,6})$/.test(this.newUserData.email)) error = 'Invalid address'; // Regex source: https://graphcms.com/user-guides/working-with/field-validations
          break;
        case 'userName':
          if (!this.newUserData.name) error = 'A name is required';
          break;
        default:
          // no op
      }
      this.errors[field] = error;
    },
  },
  props: {
    dark: Boolean,
  },
  watch: {
    currentActiveUser(nv) {
      if (nv) this.fetchActiveUser();
    },
  },
};
</script>

<style lang="scss" scoped>
  @use '../../assets/styles/breakpoints' as *;

  .user-switcher {
    user-select: none;
    background-color: transparent;
    color: currentColor;
    border: none;
    padding: 0;
    margin: 0;
    display: inline-flex;
    align-items: center;
    cursor: pointer;
    padding: rem(2);
    padding-left: 1.5rem;
    border-radius: rem(26);
    transition: background-color 200ms ease;

    @media #{$mobile} {
      padding: 0;
    }

    &:hover,
    &:focus {
      background-color: var(--bg-secondary);

      &.dark {
        background-color: var(--bg-secondary-dark);
      }
    }

    span {
      margin-right: 1rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .async-image {
      width: rem(48);
      height: rem(48);
      border-radius: 50%;
    }
  }

  .user-popover {
    &.dark {
      .users .user {
        &:hover,
        &:focus {
          background-color: var(--bg-tertiary-dark);
          color: var(--text-dark);
        }

        .email {
          color: var(--text-secondary-dark);
        }
      }
    }

    .loader,
    .users {
      max-width: 100%;
      width: rem(488);
      padding: 2rem 0.5rem;

      &.v-enter-active,
      &.v-leave-active {
        transition: opacity 200ms ease;

        &.v-enter-from,
        &.v-leave-to {
          opacity: 0;
        }
      }
    }

    .users {
      padding: 0.5rem;

      .user {
        display: flex;
        align-items: center;
        padding: 1rem;
        cursor: pointer;
        border-radius: var(--radius-m);
        transition: background-color 200ms ease;

        &:not(:last-child) {
          margin-bottom: 0.5rem;
        }

        &.active {
          background-color: var(--accent);
          color: var(--text-dark);

          .async-image {
            box-shadow: 0 0 0 2px var(--text-dark), inset 0 0 0 2px var(--text-dark);
          }

          .email {
            color: var(--text-secondary-dark);
          }
        }

        &:hover,
        &:focus {
          background-color: var(--bg-secondary);
          color: var(--text);

          &.active {
            color: var(--text-dark);
            background-color: var(--accent-darkened-5);

            .email {
              color: var(--text-secondary-dark);
            }
          }
        }

        &.disabled:not(.active) {
          color: var(--text-tertiary);
          pointer-events: none;
          padding: 1 - 0.0625 rem;
          border: 0.0625rem dashed currentColor;

          .async-image {
            opacity: 0.36;
          }

          .email {
            color: inherit;
          }
        }

        .async-image {
          width: 2rem;
          height: 2rem;
          margin-right: 1rem;
          border-radius: 50%;
        }

        span {
          text-overflow: ellipsis;
          overflow: hidden;
          white-space: nowrap;
          margin-right: 1rem;

          @media #{$mobile} {
            &:not(.email) {
              flex-shrink: 0;
            }
          }

          &.email {
            text-transform: none;
            color: var(--text-secondary);
            margin-left: auto;
            margin-right: 0;
          }
        }
      }
    }
  }

  .settings-modal {
    p {
      &.h3 {
        font-size: 1rem;
      }

      &:first-child {
        margin-top: 0;
      }

      &.negative {
        color: var(--negative-saturated);
      }
    }

    .row {
      display: flex;
      align-items: center;
      margin: 1.5rem 0;

      &:last-child {
        margin-bottom: 0;
      }

      &.avatar {
        @media #{$mobile} {
          flex-wrap: wrap;

          .button:last-child {
            margin-left: auto;
          }
        }
      }

      p {
        margin: 0;
        margin-right: auto;
      }

      .async-image {
        width: 4rem;
        height: 4rem;
        border-radius: 50%;
        margin-right: auto;

        + .button {
          margin-left: 1rem;
        }
      }

      .button:not(:last-child) {
        margin-right: 1rem;

        @media #{$mobile} {
          margin-right: 0;
          margin-bottom: 0.5rem;
        }
      }
    }

    .input {
      width: 100%;
      margin-bottom: 1rem;

      &.name {
        margin-top: 2rem;
      }
    }

    .button.delete-user {
      margin-bottom: 1rem;
      max-width: 100%;
    }
  }

  .confirmation-modal {
    p {
      margin: 0;
    }
  }

  .deletion-progress-modal {
    .progress {
      width: 100%;
    }
  }
</style>
