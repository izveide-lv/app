<template>
  <div class="project-settings">
    <MbTabs v-model="activeTab" :dark="dark" :tabs="tabs" />
    <transition mode="out-in" :name="tabTransition">
      <GeneralSettings v-if="activeTabValue === 'general'" :dark="dark" />
      <SchemaSettings v-else-if="activeTabValue === 'schemas'" :dark="dark" :last-dir="lastDir" />
      <CollectionSettings v-else-if="activeTabValue === 'collections'" :dark="dark" />
      <CustomFieldSettings v-else-if="activeTabValue === 'custom-fields'" :dark="dark" :last-dir="lastDir" />
      <DashboardSettings v-else-if="activeTabValue === 'dashboard'" :dark="dark" />
      <SidebarSettings v-else-if="activeTabValue === 'sidebar'" :dark="dark" />
      <MediaSettings v-else-if="activeTabValue === 'media'" :dark="dark" />
      <UserSettings v-else-if="activeTabValue === 'users'" :dark="dark" />
    </transition>
  </div>
</template>

<script>
import CollectionSettings from './settings/CollectionSettingsView.vue';
import CustomFieldSettings from './settings/CustomFieldSettingsView.vue';
import DashboardSettings from './settings/DashboardSettingsView.vue';
import GeneralSettings from './settings/GeneralSettingsView.vue';
import MediaSettings from './settings/MediaSettingsView.vue';
import SchemaSettings from './settings/SchemaSettingsView.vue';
import SidebarSettings from './settings/SidebarSettingsView.vue';
import UserSettings from './settings/UserSettingsView.vue';

import { pathDirname } from '../fs';
import Store from '../store';
import isPrivilegedUser from '../mixins/isPrivilegedUser';

export default {
  beforeRouteEnter(to, from, next) {
    const { userInCurrentProject } = Store.getters;
    const { customRoles } = Store.state.currentProject;

    let accessLevel = 'editor';
    if (userInCurrentProject.role === 'dev' || userInCurrentProject.role === 'owner') accessLevel = userInCurrentProject.role;
    else if (customRoles.length > 0) {
      const customRole = customRoles.find((existingCustomRole) => existingCustomRole.value === userInCurrentProject.role);
      if (customRole) accessLevel = customRole.accessLevel;
    }

    if (!['dev', 'owner'].includes(accessLevel)) return next({ name: 'Forbidden', replace: true });
    if (to.query.tab) {
      let lastDir = null;
      if (to.query.tab === 'schemas' && from && from.name === 'Edit Schema' && from.params.path) lastDir = pathDirname(from.params.path);
      if (to.query.tab === 'custom-fields' && from && from.name === 'Edit Custom Field' && from.params.path) lastDir = pathDirname(from.params.path);

      return next((vm) => {
        const activeTab = vm.tabs.findIndex((tab) => tab.value === to.query.tab);
        vm.activeTab = Math.max(activeTab, 0); // eslint-disable-line no-param-reassign
        vm.lastDir = lastDir; // eslint-disable-line no-param-reassign
      });
    }
    return next();
  },
  beforeRouteLeave() {
    this.leaving = true; // this is needed so we don’t get redirected to dashboard as soon as we try leaving the project from here
  },
  components: {
    CollectionSettings,
    CustomFieldSettings,
    DashboardSettings,
    GeneralSettings,
    MediaSettings,
    SchemaSettings,
    SidebarSettings,
    UserSettings,
  },
  computed: {
    activeTabValue() {
      if (!this.$store.state.currentProject.id) return null;
      return this.tabs[this.activeTab].value;
    },
  },
  data() {
    return {
      activeTab: 0,
      lastDir: null,
      leaving: false,
      tabs: [
        { label: 'General Settings', value: 'general' },
        { label: 'Schemas', value: 'schemas' },
        { label: 'Collections', value: 'collections' },
        { label: 'Custom Fields', value: 'custom-fields' },
        { label: 'Sidebar', value: 'sidebar' },
        { label: 'Dashboard', value: 'dashboard' },
        { label: 'Media Library', value: 'media' },
        { label: 'Users', value: 'users' },
      ],
      tabTransition: 'to-left',
    };
  },
  mixins: [isPrivilegedUser],
  props: {
    dark: Boolean,
  },
  watch: {
    $route(nv) {
      if (nv.name !== 'Project.Settings') return;
      if (nv.query.tab) this.activeTab = Math.max(this.tabs.findIndex((tab) => tab.value === nv.query.tab), 0);
      else this.activeTab = 0;
    },
    activeTab(nv, ov) {
      if (nv > ov) this.tabTransition = 'to-left';
      else this.tabTransition = 'to-right';

      this.$router.replace({ query: { tab: this.tabs[nv].value } });
    },
    isPrivilegedUser(nv) {
      if (!this.leaving && !nv) this.$router.replace({ name: 'Project' });
    },
  },
};
</script>

<style lang="scss" scoped>
.project-settings {
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow-x: hidden;

    .tabs {
      flex-shrink: 0;
      margin-top: rem(6); // so it’s aligned with the image in the sidebar
  }

  .tab-content {
    flex-grow: 1;

    &.to-left-enter-active,
    &.to-right-leave-active {
      transition: transform 200ms cubic-bezier(0.215, 0.61, 0.355, 1), opacity 200ms ease;

      &:deep(.content-wrapper) {
        overflow: hidden;
      }

      &.to-left-enter-from,
      &.to-right-leave-to {
        opacity: 0;
        transform: translateX(4rem);
      }
    }

    &.to-left-leave-active,
    &.to-right-enter-active {
      transition: transform 200ms cubic-bezier(0.645, 0.045, 0.355, 1), opacity 200ms ease;

      &:deep(.content-wrapper) {
        overflow: hidden;
      }

      &.to-left-leave-to,
      &.to-right-enter-from {
        opacity: 0;
        transform: translateX(-4rem);
      }
    }

    &.to-right-leave-active {
      transition-timing-function: cubic-bezier(0.645, 0.045, 0.355, 1);
    }

    &.to-right-enter-active {
      transition-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);
    }
  }
}
</style>
