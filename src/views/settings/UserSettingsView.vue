<template>
  <TabContent class="user-settings" :class="{ dark }" :dark="dark">
    <section class="wrapper wide">
      <h1 class="h2">Users</h1>
      <header>
        <MbInput v-model="userFilter" :dark="dark" icon="search" placeholder="Filter users" />
        <MbButton :dark="dark" icon="plus" type="positive" @click="handleAddUser">Add user</MbButton>
      </header>
      <transition-group tag="ul">
        <li v-for="(user) in filteredUsers" :key="user.details.id" tabindex="0" @click="handleUserClick(user.details.id, $event)" @contextmenu.prevent="openContextMenu('userContextMenu', $event, user.details)" @keydown.space.prevent @keyup.space.enter="handleUserClick(user.details.id)">
          <AsyncImage :src="user.avatar" />
          <span v-show="user.localChanges" class="local-changes-indicator"/>
          <span :class="{ changed: user.localChanges }">{{user.details.name}}</span>
          <span class="secondary">{{user.details.email}}</span>
          <span class="secondary">{{labelForRole(user.details.role)}}</span>
          <MbButton class="invite-link" :dark="dark" icon="invite-link-alt" rounded tooltip="Copy invite link" @click="copyInviteLinkForUser(user.details)" />
        </li>
      </transition-group>
    </section>
    <section class="wrapper wide">
      <h2>Custom Roles</h2>
      <header>
        <MbButton :dark="dark" icon="plus" type="positive" @click="handleAddRole">Add custom role</MbButton>
      </header>
      <header v-if="customRolesWithoutSoftDeleted.length > 0" class="legend">
        <span>Name</span>
        <span class="secondary">Value</span>
        <span>Access Level</span>
      </header>
      <transition-group class="roles" tag="ul">
        <li v-for="(role, index) in customRolesWithoutSoftDeleted" :key="role.value" tabindex="0" @click="handleRoleClick(role.value, $event)" @contextmenu.prevent="openContextMenu('roleContextMenu', $event, role, index)" @keydown.space.prevent @keyup.space.enter="handleRoleClick(role.value, $event)">
          <span>{{role.label}}</span>
          <span class="secondary">{{role.value}}</span>
          <span class="secondary access-level">{{role.accessLevel}}</span>
          <MbButton :dark="dark" icon="trash" rounded tooltip="Delete role" type="negative" @click="removeCustomRole(index, role)" />
        </li>
        <li v-if="customRolesWithoutSoftDeleted.length === 0" class="empty-state">
          <span class="secondary" v-html="emptyStateMessage" />
        </li>
      </transition-group>
    </section>
    <!-- <section class="wrapper">
      <MbHighlightBox color="negative" :dark="dark">
        <p>The user’s role and the privileges that come with each role are <strong>only enforced on the client</strong>. This means that the might be circumvented by tampering with the code (the client can’t be trusted).</p>
        <p>Make sure to not rely on these settings as your only security and configure your server-side Git-environment to reflect these permissions as closely as possible. This also means making sure that users can actually read and write to the branches you use for your content.</p>
      </MbHighlightBox>
    </section> -->
    <MbModal class="role-modal" :dark="dark" :title="roleBeingEdited.new ? 'Create new custom role' : 'Edit custom role'" :visible="showRoleModal" @close="showRoleModal = false" @after-close="resetRoleBeingEdited">
      <div class="input-wrapper">
        <MbInput v-model="roleBeingEdited.label" :dark="dark" :error="errors.roleLabel" icon="tag" label="Role label" :max-len="16" @blur="showRoleModal && validate('roleLabel')" />
        <MbInput v-model="roleBeingEdited.value" :dark="dark" :disabled="!roleBeingEdited.new" :error="errors.roleValue" icon="hash" label="Role value" :max-len="16" @blur="showRoleModal && validate('roleValue')" />
      </div>
      <div class="select-wrapper">
        <span>Access level:</span>
        <MbSelect v-model="roleBeingEdited.accessLevel" :dark="dark" :options="availableRoles" />
      </div>
      <template #actions>
        <MbButton :dark="dark" @click="showRoleModal = false">Cancel</MbButton>
        <MbButton :dark="dark" :disabled="formErrors" type="primary" @click="saveCustomRole">Save</MbButton>
      </template>
    </MbModal>
    <MbModal class="user-modal" :dark="dark" slim :title="userBeingEdited.new ? 'Add new user' : 'Edit user'" :visible="showUserModal" @close="showUserModal = false" @after-close="resetUserBeingEdited">
      <MbInput v-model="userBeingEdited.name" class="name-input" :dark="dark" :error="errors.userName" icon="user" label="Name" @blur="showUserModal && validate('userName'); checkAvatarRegeneration()" />
      <MbInput v-model="userBeingEdited.email" :dark="dark" :error="errors.userEmail" icon="mail" label="Email Address" type="email" @blur="showUserModal && validate('userEmail'); checkAvatarRegeneration()" />
      <div class="select-wrapper">
        <span>Role:</span>
        <MbSelect :dark="dark" inline :model-value="userBeingEdited.role" :options="combinedRoles" placeholder="Select a role…" @update:model-value="validateRole" />
      </div>
      <div class="avatar-wrapper">
        <AsyncImage :src="userBeingEdited.avatar" :alt="`${userBeingEdited.name}’s avatar`" />
        <MbButton v-show="avatarUploaded" :dark="dark" :disabled="formErrors" icon-first icon="trash" type="negative" @click="regenerateAvatar">Remove</MbButton>
        <MbButton :dark="dark" icon-first :icon="avatarUploaded ? 'replace-alt' : 'upload'" @click="$refs.uploader.$el.click()">{{ avatarUploaded ? 'Replace' : 'Upload' }}</MbButton>
      </div>
      <MbHighlightBox v-if="userBeingEdited.new" color="warning" :dark="dark">
        <p>Adding a user here allows you to set their details (such as role, name, and avatar) for this project. It will also generate a link with which you can invite them to Mattrbld, so they can work on the project without having to set up anything.</p>
        <p>How you send them this link is up to you. It is also your responsibility to make sure they have the appropriate access to the Git repository this project is stored in.</p>
      </MbHighlightBox>
      <MbHighlightBox v-else color="negative" :dark="dark" label="Remove user">
        <p>Remove the user will only remove their settings from the project. Make sure to also revoke their access to the Git repository to avoid them joining again!</p>
        <MbButton :dark="dark" icon="trash" type="negative" @click="removeUser">Remove user</MbButton>
      </MbHighlightBox>
      <AvatarUploader ref="uploader" @ready="handleAvatarReady" />
      <template #actions>
        <MbButton :dark="dark" @click="showUserModal = false">Cancel</MbButton>
        <MbButton :dark="dark" :disabled="formErrors" type="primary" @click="saveUser">Save</MbButton>
      </template>
    </MbModal>
    <MbContextMenu :dark="dark" :options="userContextMenu.options" :show="userContextMenu.show" :target="userContextMenu.target" :x="userContextMenu.x" :y="userContextMenu.y" @close="resetContextMenu('userContextMenu')" />
    <MbContextMenu :dark="dark" :options="roleContextMenu.options" :show="roleContextMenu.show" :target="roleContextMenu.target" :x="roleContextMenu.x" :y="roleContextMenu.y" @close="resetContextMenu('roleContextMenu')" />
  </TabContent>
</template>

<script>
import slugify from '@sindresorhus/slugify';
import { currentBranch, listRemotes } from 'isomorphic-git';

import fs, { PlainFS } from '../../fs';

import AvatarUploader from '../../components/utility/AvatarUploader.vue';
import AsyncImage from '../../components/utility/AsyncImage.vue';
import TabContent from '../../components/utility/TabContent.vue';

import availableRoles from '../../data/availableRoles';
import generateAvatar from '../../assets/js/generateAvatar';

export default {
  beforeUnmount() {
    this.users.forEach((user) => {
      if (user.avatar && user.avatar.startsWith('blob:')) URL.revokeObjectURL(user.avatar);
    });
  },
  components: {
    AvatarUploader,
    AsyncImage,
    TabContent,
  },
  computed: {
    combinedRoles() {
      return [...availableRoles, ...this.currentProject.customRoles];
    },
    currentProject() {
      return this.$store.state.currentProject;
    },
    customRolesWithoutSoftDeleted() {
      return this.currentProject.customRoles.filter((role) => !this.$store.getters.isSoftDeleted(`customRole/${role.value}`));
    },
    filteredUsers() {
      if (!this.userFilter) return this.usersWithoutSoftDeleted;
      return this.usersWithoutSoftDeleted.filter((user) => user.details.name.includes(this.userFilter) || user.details.email.includes(this.userFilter));
    },
    formErrors() {
      return Object.values(this.errors).some((error) => error);
    },
    usersWithoutSoftDeleted() {
      return this.users.filter((user) => !this.$store.getters.isSoftDeleted(`user/${this.currentProject.id}/${user.details.id}`));
    },
  },
  created() {
    this.users = this.currentProject.users.map((user) => ({ details: user }));
    this.users.forEach((user) => {
      if (this.$store.getters.hasLocalChanges(`/projects/${this.currentProject.id}/.mattrbld/users/${user.details.id}.json`)) user.localChanges = true; // eslint-disable-line no-param-reassign
    });
    this.fetchUserAvatars();
  },
  data() {
    return {
      availableRoles,
      avatarUploaded: false,
      emptyStateMessage: 'There are currently no custom roles for this project. <a href="https://mattrbld.com/docs/roles/#custom-roles" target="_blank">What are custom roles?</a>',
      errors: {
        roleLabel: null,
        roleValue: null,
        userEmail: null,
        userName: null,
      },
      roleBeingEdited: {
        accessLevel: 'editor',
        label: '',
        new: false,
        value: '',
      },
      roleContextMenu: {
        options: [
          {
            action: () => this.handleRoleClick(this.roleContextMenu.item.role.value),
            label: 'Edit',
            icon: 'pencil',
          },
          {
            action: () => this.removeCustomRole(this.roleContextMenu.item.index, this.roleContextMenu.item.role),
            label: 'Delete',
            icon: 'trash',
            type: 'negative',
          },
        ],
        item: null,
        show: false,
        target: null,
        x: 0,
        y: 0,
      },
      showRoleModal: false,
      showUserModal: false,
      users: [],
      userFilter: '',
      userBeingEdited: {
        avatar: null,
        email: '',
        id: null,
        name: '',
        new: false,
        role: 'editor',
      },
      userContextMenu: {
        options: [
          {
            action: () => this.handleUserClick(this.userContextMenu.item.id),
            label: 'Edit',
            icon: 'pencil',
          },
          {
            action: () => this.copyInviteLinkForUser(this.userContextMenu.item),
            label: 'Copy invite link',
            icon: 'invite-link-alt',
          },
        ],
        item: null,
        show: false,
        target: null,
        x: 0,
        y: 0,
      },
    };
  },
  methods: {
    checkAvatarRegeneration() {
      if (!this.avatarUploaded && !this.formErrors && this.userBeingEdited.name && this.userBeingEdited.email) this.regenerateAvatar();
    },
    async copyInviteLink(link) {
      try {
        await navigator.clipboard.writeText(link);
        this.$store.commit('addToast', { message: 'Copied invite link to clipboard!', timeout: 1000, type: 'positive' });
      } catch (err) {
        this.$store.commit('addToast', { message: `Unable to copy link: ${err}`, type: 'error' });
      }
    },
    async copyInviteLinkForUser(user) {
      const link = await this.generateInviteLink(user);
      this.copyInviteLink(link);
    },
    async fetchUserAvatars() {
      const usersPath = `/projects/${this.currentProject.id}/.mattrbld/users`;
      const [avatarFiles, localAvatars] = await Promise.all([fs.readdir(usersPath), fs.readdir('/users')]);

      const avatarPromises = this.users.reduce((acc, user) => {
        const { email, id, name } = user.details;

        if (avatarFiles.includes(`${id}.jpg`)) acc.push(fs.readFile(`${usersPath}/${id}.jpg`));
        else if (localAvatars.includes(`${id}.jpg`)) acc.push(fs.readFile(`/users/${id}.jpg`)); // only works if the local user id matches the repo user’s id, which should be the case
        else if (email === this.$store.state.user.email && localAvatars.includes(`${this.$store.state.user.id}.jpg`)) acc.push(fs.readFile(`/users/${this.$store.state.user.id}.jpg`)); // if not at least we can show the current users local avatar, since we know their local id
        else acc.push(new Promise((res) => { res(generateAvatar(name, '#A29BFE', '#6c5ce7', 'light', email)); }));

        return acc;
      }, []);

      const avatars = await Promise.all(avatarPromises);
      avatars.forEach((avatar, index) => {
        if (typeof avatar !== 'string') this.users[index].avatar = URL.createObjectURL(new Blob([avatar]), { type: 'image/jpeg' });
        else this.users[index].avatar = avatar;
      });
    },
    async generateInviteLink(user) {
      const dir = `/projects/${this.currentProject.id}`;
      const [remotes, branch] = await Promise.all([
        listRemotes({ fs: PlainFS, dir }),
        currentBranch({ fs: PlainFS, dir }),
      ]);

      const proxyParam = `&proxy=${window.encodeURIComponent(this.currentProject.corsProxy)}`;

      return `${window.location.protocol}//${window.location.host}/import?name=${window.encodeURIComponent(user.name)}&email=${window.encodeURIComponent(user.email)}&repo=${window.encodeURIComponent(remotes[0].url)}&branch=${window.encodeURIComponent(branch)}${this.currentProject.corsProxy ? proxyParam : ''}&inviter=${window.encodeURIComponent(this.$store.state.user.name)}&projectName=${window.encodeURIComponent(this.currentProject.name)}`;
    },
    handleAddRole() {
      this.roleBeingEdited.new = true;
      this.showRoleModal = true;
    },
    handleAddUser() {
      this.userBeingEdited.new = true;
      this.showUserModal = true;
    },
    handleAvatarReady(avatar) {
      if (this.userBeingEdited.avatar && this.userBeingEdited.avatar.startsWith('blob:')) URL.revokeObjectURL(this.userBeingEdited.avatar); // we’re removing an existing avatar and should revoke the reference
      this.userBeingEdited.avatar = avatar;
      this.avatarUploaded = true;
    },
    handleRoleClick(roleValue, e) {
      if (e && e.target.classList.contains('button')) return; // buttons have a ::before that covers them completely, so this is enough

      const role = this.currentProject.customRoles.find((customRole) => customRole.value === roleValue);
      if (!role) return;

      this.roleBeingEdited.accessLevel = role.accessLevel;
      this.roleBeingEdited.label = role.label;
      this.roleBeingEdited.value = role.value;

      this.showRoleModal = true;
    },
    async handleUserClick(id, e) {
      if (e && e.target.classList.contains('button')) return; // buttons have a ::before that covers them completely, so this is enough

      const user = this.users.find((existingUser) => existingUser.details.id === id);
      if (!user) return;

      this.userBeingEdited.email = user.details.email;
      this.userBeingEdited.id = user.details.id;
      this.userBeingEdited.name = user.details.name;
      this.userBeingEdited.role = user.details.role;

      const avatars = await fs.readdir(`/projects/${this.currentProject.id}/.mattrbld/users`);
      const userAvatar = avatars.find((avatar) => avatar === `${user.details.id}.jpg`);

      if (userAvatar) {
        this.avatarUploaded = true;
      }

      this.userBeingEdited.avatar = user.avatar;

      this.showUserModal = true;
    },
    async idExists(id) {
      try {
        await fs.stat(`/projects/${this.currentProject.id}/.mattrbld/users/${id}.json`);
        return true;
      } catch (err) {
        if (err.code === 'ENOENT' || err.code === 'ENOTDIR') return false;
        throw err;
      }
    },
    isLastOwner(user) {
      const localUser = this.users.find((existingUser) => user.id === existingUser.details.id);

      if (localUser.details.role === 'owner' && this.users.filter((existingUser) => existingUser.details.role === 'owner').length <= 1) return true;
      return false;
    },
    labelForRole(role) {
      const builtinRole = availableRoles.find((availableRole) => availableRole.value === role);
      const customRole = this.currentProject.customRoles.find((availableRole) => availableRole.value === role);

      return (customRole && customRole.label) || (builtinRole && builtinRole.label) || 'Unknown';
    },
    openContextMenu(menu, e, item, index) {
      if (menu === 'roleContextMenu') this[menu].item = { role: item, index };
      else this[menu].item = item;
      this[menu].target = e.currentTarget;
      this[menu].x = e.clientX;
      this[menu].y = e.clientY;
      this[menu].show = true;
    },
    regenerateAvatar() {
      if (this.userBeingEdited.avatar && this.userBeingEdited.avatar.startsWith('blob:')) URL.revokeObjectURL(this.userBeingEdited.avatar); // we’re removing an existing avatar and should revoke the reference
      this.userBeingEdited.avatar = generateAvatar(this.userBeingEdited.name, '#A29BFE', '#6c5ce7', 'light', this.userBeingEdited.email);
      if (this.avatarUploaded) this.avatarUploaded = false;
    },
    removeCustomRole(index, { value, label, accessLevel }) {
      this.$store.commit('addToSoftDeleted', `customRole/${value}`);
      this.$store.commit('addToast', {
        action: () => {
          this.$store.commit('removeFromSoftDeleted', `customRole/${value}`);
        },
        actionLabel: 'Undo',
        message: `The custom role “${label}” was deleted`,
        onClose: async (undone) => {
          if (undone) return;
          // find all users that have the role being deleted
          const usersWithRole = this.currentProject.users.filter((user) => user.role === value);

          try {
            if (usersWithRole.length > 0) {
              const promises = usersWithRole.map((user) => {
                const userCopy = { ...user, role: accessLevel }; // reset the role to its access level
                const userPath = `/projects/${this.currentProject.id}/.mattrbld/users/${user.id}.json`;
                this.$store.commit('addLocallyChangedFile', userPath);
                this.updateUser(userCopy);
                return fs.writeFile(`/projects/${this.currentProject.id}/.mattrbld/users/${user.id}.json`, JSON.stringify(userCopy, null, 2), 'utf8');
              });

              await Promise.all(promises);
            }
            const customRoles = [...this.currentProject.customRoles];
            customRoles.splice(index, 1);
            this.$store.commit('setCurrentProjectProperty', { key: 'customRoles', value: customRoles });
            this.$store.dispatch('saveCurrentProject');
          } catch (err) {
            this.$store.commit('addToast', { message: `Something went wrong while deleting the custom role: ${err.message}`, type: 'error' });
          } finally {
            this.$store.commit('removeFromSoftDeleted', `customRole/${value}`);
          }
        },
        timeout: 5000,
        type: 'warning',
      });
    },
    removeUser() {
      if (this.isLastOwner(this.userBeingEdited)) {
        this.$store.commit('addToast', { message: 'This user cannot be removed because there has to be at least one Project Owner per project', type: 'negative' });
        return;
      }
      const userBeingDeleted = this.userBeingEdited.id;

      this.$store.commit('addToSoftDeleted', `user/${this.currentProject.id}/${userBeingDeleted}`);
      this.$store.commit('addToast', {
        action: () => {
          this.$store.commit('removeFromSoftDeleted', `user/${this.currentProject.id}/${userBeingDeleted}`);
        },
        actionLabel: 'Undo',
        message: `“${this.userBeingEdited.name}” was removed`,
        onClose: async (undone) => {
          if (undone) return;

          try {
            const userPath = `/projects/${this.currentProject.id}/.mattrbld/users`;
            await fs.unlink(`${userPath}/${userBeingDeleted}.json`);
            try {
              await fs.unlink(`${userPath}/${userBeingDeleted}.jpg`);
            } catch (err) {
              if (err.code !== 'ENOENT') throw err;
            }

            // delete user first the in-component users
            let userIndex = this.users.findIndex((existingUser) => userBeingDeleted === existingUser.details.id);
            if (userIndex > -1) this.users.splice(userIndex, 1);

            // then the ones in the store
            userIndex = this.currentProject.users.findIndex((existingUser) => userBeingDeleted === existingUser.id);
            const users = [...this.currentProject.users];
            users.splice(userIndex, 1);
            this.$store.commit('setCurrentProjectProperty', { key: 'users', value: users });
            this.$store.commit('removeLocallyChangedFile', `${userPath}/${userBeingDeleted}.json`);
            this.$store.commit('removeLocallyChangedFile', `${userPath}/${userBeingDeleted}.jpg`);
            await this.$store.dispatch('saveAppData');
          } catch (err) {
            this.$store.commit('addToast', { message: `Something went wrong while deleting the user: ${err.message}`, type: 'error' });
          } finally {
            this.$store.commit('removeFromSoftDeleted', `user/${this.currentProject.id}/${userBeingDeleted}`);
          }
        },
        timeout: 5000,
        type: 'warning',
      });
      this.showUserModal = false;
    },
    resetContextMenu(menu) {
      this[menu].show = false;
      this[menu].item = null;
      this[menu].target = null;
      this[menu].x = 0;
      this[menu].y = 0;
    },
    resetRoleBeingEdited() {
      this.roleBeingEdited.accessLevel = 'editor';
      this.roleBeingEdited.label = '';
      this.roleBeingEdited.new = false;
      this.roleBeingEdited.value = '';

      this.errors.roleLabel = '';
      this.errors.roleValue = '';
    },
    resetUserBeingEdited() {
      this.userBeingEdited.avatar = null;
      this.userBeingEdited.email = '';
      this.userBeingEdited.id = null;
      this.userBeingEdited.name = '';
      this.userBeingEdited.new = false;
      this.userBeingEdited.role = 'editor';

      this.errors.userName = '';
      this.errors.userEmail = '';

      this.avatarUploaded = false;
    },
    async saveCustomRole() {
      this.validate('roleLabel');
      if (this.roleBeingEdited.new) this.validate('roleValue'); // can only be changed with new roles
      if (this.formErrors) return;

      let customRoles;

      if (this.roleBeingEdited.new) {
        customRoles = [...this.currentProject.customRoles, { label: this.roleBeingEdited.label.trim(), value: this.roleBeingEdited.value.toLowerCase().trim(), accessLevel: this.roleBeingEdited.accessLevel }];
      } else {
        const roleIndex = this.currentProject.customRoles.findIndex((existingRole) => this.roleBeingEdited.value === existingRole.value);
        customRoles = [...this.currentProject.customRoles];
        customRoles.splice(roleIndex, 1, { label: this.roleBeingEdited.label.trim(), value: this.roleBeingEdited.value.toLowerCase().trim(), accessLevel: this.roleBeingEdited.accessLevel });
      }

      this.$store.commit('setCurrentProjectProperty', { key: 'customRoles', value: customRoles });
      const saved = await this.$store.dispatch('saveCurrentProject');

      if (saved) this.showRoleModal = false;
    },
    async saveUser() {
      this.validate('userName');
      this.validate('userEmail');

      if (this.formErrors) return;

      // write user and avatar files
      try {
        let userId = this.userBeingEdited.id;

        if (!userId) {
          userId = slugify(this.userBeingEdited.email.trim()); // WARNING: this could lead to collisions if there’s two very similar email addresses (foo-bar@exmaple.com foo.bar@example.com), but since we have a low amount of local users, I think it’s negligible
          let alreadyExists = await this.idExists(userId);

          while (alreadyExists) {
            userId += `-${Math.random().toString(36).slice(2, 9)}`;
            alreadyExists = await this.idExists(userId); // eslint-disable-line no-await-in-loop
          }
        }

        const user = {
          email: this.userBeingEdited.email.trim(),
          id: userId,
          name: this.userBeingEdited.name.trim(),
          role: this.userBeingEdited.role || 'editor',
        };
        const userPath = `/projects/${this.currentProject.id}/.mattrbld/users`;
        await fs.writeFile(`${userPath}/${userId}.json`, JSON.stringify(user, null, 2), 'utf8');
        this.$store.commit('addLocallyChangedFile', `${userPath}/${userId}.json`);

        let avatarData;
        if (!this.userBeingEdited.avatar.startsWith('blob:')) {
          const byteString = window.atob(this.userBeingEdited.avatar.split(',')[1]);
          avatarData = Uint8Array.from(byteString, (ch) => ch.charCodeAt(0));
          if (this.avatarUploaded) {
            await fs.writeFile(`${userPath}/${userId}.jpg`, avatarData, 'utf8'); // we know it’s a image/jpeg because we converted it ourselves in AvatarUploader / generateAvatar
            this.$store.commit('addLocallyChangedFile', `${userPath}/${userId}.jpg`);
          } else if (!this.userBeingEdited.new) { // it might have been removed
            try {
              await fs.unlink(`${userPath}/${userId}.jpg`);
            } catch (err) {
              if (err.code !== 'ENOENT') throw err;
            }
          }
        }

        // update users in component and store
        this.updateUser(user, avatarData, this.userBeingEdited.new);

        const saved = await this.$store.dispatch('saveAppData');

        // show toast with copyable invite link
        if (this.userBeingEdited.new) {
          this.$store.commit('addToast', {
            action: async () => {
              const inviteLink = await this.generateInviteLink(user);
              this.copyInviteLink(inviteLink);
            },
            actionLabel: 'Copy invite-link',
            message: `“${user.name}” was added sucessfully`,
            type: 'positive',
          });
        }

        // close modal
        if (saved) this.showUserModal = false;
      } catch (err) {
        this.$store.commit('addToast', { message: `Something went wrong while saving the user: ${err.message}`, type: 'error' });
      }
    },
    updateUser(user, avatarData, isNew) {
      let users;
      if (isNew) {
        this.users.push({
          details: user,
          avatar: URL.createObjectURL(new Blob([avatarData], { type: 'image/jpeg' })),
          localChanges: true,
        });
        users = [...this.currentProject.users, user];
      } else {
        // first the in-component users
        let userIndex = this.users.findIndex((existingUser) => user.id === existingUser.details.id);
        if (userIndex > -1) {
          this.users[userIndex].details = user;
          this.users[userIndex].avatar = avatarData ? URL.createObjectURL(new Blob([avatarData], { type: 'image/jpeg' })) : this.users[userIndex].avatar;
          this.users[userIndex].localChanges = true;
        }
        // then the ones in the store
        userIndex = this.currentProject.users.findIndex((existingUser) => user.id === existingUser.id);
        users = [...this.currentProject.users];
        users.splice(userIndex, 1, user);
      }
      this.$store.commit('setCurrentProjectProperty', { key: 'users', value: users });
    },
    validate(field) {
      let error = '';
      switch (field) {
        case 'roleLabel':
          if (!this.roleBeingEdited.label || !this.roleBeingEdited.label.trim()) error = 'A label is required';
          else if (this.roleBeingEdited.label.trim().length > 16) error = 'The label is too long';
          else if (this.roleBeingEdited.new && this.currentProject.customRoles.find((role) => role.label === this.roleBeingEdited.label)) error = 'A role with this label already exists';
          break;
        case 'roleValue':
          if (!this.roleBeingEdited.value || !this.roleBeingEdited.value.trim()) error = 'A value is required';
          else if (this.roleBeingEdited.value.trim().length > 16) error = 'The value is too long';
          else if (!/^[a-zA-Z-]+$/.test(this.roleBeingEdited.value)) error = 'The value contains invalid characters';
          else if (this.currentProject.customRoles.find((role) => role.value === this.roleBeingEdited.value)) error = 'A role with this value already exists';
          break;
        case 'userEmail':
          if (!this.userBeingEdited.email) error = 'An email address is required';
          else if (!/^([a-z0-9_.+-]+)@([\da-z.-]+)\.([a-z.]{2,6})$/.test(this.userBeingEdited.email)) error = 'Invalid address'; // Regex source: https://graphcms.com/user-guides/working-with/field-validations
          else if (this.userBeingEdited.new && this.currentProject.users.find((user) => user.email === this.userBeingEdited.email)) error = 'A user with this email address ahs already been added to the project';
          break;
        case 'userName':
          if (!this.userBeingEdited.name) error = 'A name is required';
          break;
        default:
      }
      this.errors[field] = error;
    },
    validateRole(newRole) {
      if (!this.userBeingEdited.new && newRole !== 'owner' && this.isLastOwner(this.userBeingEdited)) {
        this.$store.commit('addToast', { message: 'There has to be at least one Project Owner per project', type: 'negative' });
      } else this.userBeingEdited.role = newRole;
    },
  },
  props: {
    dark: Boolean,
  },
  watch: {
    'roleBeingEdited.label': {
      handler(nv, ov) {
        if (!this.roleBeingEdited.new) return;
        const slugifiedOv = slugify(ov, this.currentProject.slugifyOptions || {});

        if (!this.roleBeingEdited.value || this.roleBeingEdited.value === slugifiedOv) {
          this.roleBeingEdited.value = slugify(nv, this.currentProject.slugifyOptions || {});
          if (this.errors.roleValue) this.errors.roleValue = '';
        }
      },
    },
  },
};
</script>

<style lang="scss" scoped>
  @use '../../assets/styles/breakpoints' as *;

  .user-settings {
    user-select: none;

    &.dark {
      .wrapper.wide {
        header.legend {
          color: var(--text-secondary-dark);
        }

        ul li {
          background-color: var(--bg-secondary-dark);

          &:hover {
            background-color: var(--bg-tertiary-dark);
          }

          &:active {
            background-color: var(--bg-dark);
          }

          span.secondary {
            color: var(--text-secondary-dark);
          }
        }
      }
    }

    .wrapper {
      max-width: 40rem;
      margin-left: auto;
      margin-right: auto;

      &.wide {
        max-width: rem(960);
        margin-bottom: 8rem;

        @media #{$mobile} {
          margin-bottom: 4rem;
        }

        header {
          display: flex;
          margin-bottom: 2rem;

          &.legend {
            color: var(--text-secondary);
            padding-left: 1.5rem;
            padding-right: rem(58);
            margin-bottom: 1rem;

            span {
              flex: 1 1 100%;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;

              @media #{$mobile} {
                font-size: 0.875rem;

                &.secondary {
                  display: none;
                }
              }
            }
          }

          &:not(.legend) {
            align-items: center;

            @media #{$mobile} {
              flex-direction: column-reverse;
            }

            .input {
              margin: 0;
              margin-right: 1rem;
              max-width: 30rem;

              @media #{$mobile} {
                margin-right: 0;
                margin-top: 1rem;
              }
            }

            .button {
              margin-left: auto;

              @media #{$mobile} {
                width: 100%;
              }
            }
          }
        }

        ul {
          list-style: none;
          margin: 0;
          position: relative;

          &.roles {
            li {
              padding: 0.5rem;
              padding-left: 1.5rem;

              span {
                text-transform: none;
              }
            }
          }

          li {
            position: relative;
            background-color: var(--bg-secondary);
            padding: 1rem;
            border-radius: var(--radius-m);
            display: flex;
            align-items: center;
            cursor: pointer;
            transition: background-color 200ms ease;

            &.v-enter-active,
            &.v-leave-active,
            &.v-move {
              transition: opacity 200ms ease, transform 350ms ease;

              &.v-enter-from,
              &.v-leave-to {
                opacity: 0;
              }
            }

            &.v-leave-active {
              position: absolute;
              width: 100%;
            }

            &:hover {
              background-color: var(--bg-tertiary);
            }

            &:not(:last-child) {
              margin-bottom: 1rem;
            }

            &:focus,
            &:active {
              &::before {
                opacity: 1;
              }
            }

            &:active {
              transform: translateY(0.125rem);
              background-color: var(--bg);
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

            &.empty-state {
              text-align: center;
              background-color: transparent;

              &:hover {
                background-color: transparent;
              }

              &::before {
                content: none;
              }

              @media #{$mobile} {
                span.secondary {
                  display: inline;
                  white-space: normal;
                }
              }
            }

            .local-changes-indicator {
              flex: none;
              width: 0.5rem;
              height: 0.5rem;
              border-radius: 50%;
              background-color: var(--warning-saturated);
              display: inline-block;
              margin-right: 0.5rem;
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
              margin-right: 1rem;
              white-space: nowrap;
              text-overflow: ellipsis;
              overflow: hidden;
              flex: 1 1 33.33%;

              &.changed {
                flex-basis: calc(33.33% - 1rem);
              }

              &.secondary {
                color: var(--text-secondary);

                @media #{$mobile} {
                  display: none;
                }

                &.access-level {
                  text-transform: capitalize;

                  @media #{$mobile} {
                    display: inline;
                  }
                }
              }
            }

            .button.invite-link {
              &:hover,
              &:focus {
                background-color: var(--bg-secondary);
              }

              &.dark {
                &:hover,
                &:focus {
                  background-color: var(--bg-tertiary-dark-lightened-5);
                }
              }
            }
          }
        }
      }

      .input {
        width: 100%;
        margin-bottom: 2rem;

        & + h2 {
          margin-top: 1rem;
        }
      }
    }
  }

  .role-modal,
  .user-modal {
    .input {
      width: 100%;
      margin-bottom: 1rem;

      & + .select-wrapper {
        margin-top: 1.5rem;
      }
    }

    .input-wrapper,
    .select-wrapper {
      display: flex;
      align-items: center;
      margin-bottom: 1rem;

      .input {
        margin-bottom: 0;

        &:not(:last-child) {
          margin-right: 1rem;
        }
      }
    }

    .input-wrapper {
      @media #{$mobile} {
        display: block;
        margin-bottom: 1.5rem;
      }
    }

    .select-wrapper {
      > span {
        margin-right: 1rem;
      }

      &:deep(.select),
      .button {
        margin-left: auto;
      }
    }

    .avatar-wrapper {
      display: flex;
      align-items: center;
      margin-top: 2.5rem;
      margin-bottom: 2.5rem;

      @media #{$mobile} {
        flex-wrap: wrap;

        .button:last-child {
          margin-left: auto;
        }
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

    .highlight-box {
      .button {
        display: flex;
        margin-left: auto;

        @media #{$mobile} {
          width: 100%;
        }
      }
    }
  }
</style>
