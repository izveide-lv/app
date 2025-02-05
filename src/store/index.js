/* eslint no-param-reassign: ["error", { "props": true, "ignorePropertyModificationsFor": ["state"] }] */

import { createStore } from 'vuex';
import { set as _set } from 'lodash-es';

import fs from '../fs';

import observers from './observers';

const persistentAppProperties = ['activeUser', 'corsProxy', 'initialised', 'locallyChangedFiles', 'prompted'];
const persistentProjectProperties = ['autoquotes', 'brandColors', 'corsProxy', 'name', 'sidebar', 'slugifyOptions', 'customRoles', 'draftsDir', 'previewUrl', 'languages', 'media'];
const persistentUserProperties = ['email', 'id', 'name', 'projectAccessDates', 'projects', 'role', 'theme', 'uiScale'];

export const projectDefaults = {
  autoquotes: null,
  avatar: null,
  brandColors: [],
  corsProxy: null,
  customRoles: [],
  draftsDir: null,
  id: null,
  languages: [],
  media: {
    advanced: false,
    customFields: null,
    dir: null,
    maxSize: null,
    outputPath: null,
    permissions: {
      everybody: ['everything'],
    },
  },
  name: null,
  previewUrl: null,
  sidebar: [
    {
      label: 'The sidebar has not yet been configured for this project',
    },
    {
      icon: 'wrench-and-driver',
      label: 'Configure now',
      target: {
        name: 'Project.Settings',
        query: { tab: 'sidebar' },
      },
      onlyPrivileged: true,
    },
    {
      separator: true,
    },
    {
      label: 'Dashboard',
      icon: 'grid',
      target: {
        name: 'Project',
      },
      protected: true,
    },
    {
      label: 'Media Library',
      icon: 'image-stack',
      target: {
        name: 'Project.MediaLibrary',
      },
      protected: true,
    },
    {
      label: 'Settings',
      icon: 'settings',
      target: {
        name: 'Project.Settings',
      },
      onlyPrivileged: true,
      protected: true,
    },
  ],
  slugifyOptions: null,
  users: [],
};

export default createStore({
  state: {
    application: {
      activeUser: null,
      corsProxy: null,
      dragActive: false,
      initialised: false,
      installPrompt: null,
      locallyChangedFiles: [],
      loading: false,
      loadingTimeout: null,
      mobile: false,
      tablet: false,
      openModals: [],
      permanentModals: [],
      prompted: false,
      sidebarVisible: false,
      softDeleted: [],
      temporaryContentStorage: null,
      temporaryCustomFieldStorage: null,
      temporarySchemaStorage: null,
      toasts: [],
      tooltip: null,
    },
    currentProject: { ...projectDefaults },
    user: {
      avatar: null,
      email: null,
      gitAuth: null,
      id: null,
      name: null,
      projectAccessDates: {},
      projects: [],
      theme: 'auto',
      uiScale: 'auto',
    },
  },
  getters: {
    hasLocalChanges(state) {
      return (path) => state.application.locallyChangedFiles.some((filepath) => filepath.startsWith(path));
    },
    isSoftDeleted(state) {
      return (path) => state.application.softDeleted.includes(path);
    },
    userInCurrentProject(state) {
      if (!state.currentProject.id) return null;
      return state.currentProject.users.find((user) => user.email === state.user.email);
    },
  },
  mutations: {
    addLocallyChangedFile(state, path) {
      if (!state.application.locallyChangedFiles.includes(path)) state.application.locallyChangedFiles.push(path);
    },
    addOpenModal(state, modal) {
      state.application.openModals.push(modal.el);
      if (modal.permanent) state.application.permanentModals.push(modal.el);
    },
    addProjectToActiveUser(state, id) {
      state.user.projects.push(id);
    },
    addToast(state, toast) {
      if (toast.id && state.application.toasts.find((existingToast) => toast.id === existingToast.id)) return;

      let timeout = 5000;

      if (toast.timeout && toast.timeout > 999) timeout = toast.timeout;
      if (toast.type === 'error' || toast.timeout === 0 || toast.timeout === false || toast.permanent) timeout = 0;

      if (state.application.toasts.length > 5) state.application.toasts.shift();

      state.application.toasts.push({
        id: toast.id || Math.random().toString(36).substring(2, 9),
        ...toast,
        timeout, // override the timeout set in the toast-object
        type: toast.type === 'error' ? 'negative' : toast.type, // error toasts are negative toasts that don’t disappear
      });
    },
    addToSoftDeleted(state, path) {
      if (!state.application.softDeleted.includes(path)) state.application.softDeleted.push(path);
    },
    clearCurrentProject(state) {
      state.currentProject = { ...projectDefaults };
    },
    clearToasts(state) {
      state.application.toasts = [];
    },
    closeModal(state, index) {
      state.application.openModals.splice(index, 1);
      state.application.permanentModals.splice(index, 1);
    },
    closeTopmostModal(state) {
      const topmost = state.application.openModals[state.application.openModals.length - 1];
      if (topmost && state.application.permanentModals.indexOf(topmost) === -1) state.application.openModals.pop();
    },
    removeFromSoftDeleted(state, path) {
      const index = state.application.softDeleted.indexOf(path);
      if (index > -1) state.application.softDeleted.splice(index, 1);
    },
    removeLocallyChangedFile(state, path) {
      const index = state.application.locallyChangedFiles.indexOf(path);
      if (index > -1) state.application.locallyChangedFiles.splice(index, 1);
    },
    removeLocallyChangedFolder(state, path) {
      state.application.locallyChangedFiles = state.application.locallyChangedFiles.filter((file) => !file.startsWith(path));
    },
    removeProjectFromActiveUser(state, id) {
      const index = state.user.projects.indexOf(id);
      if (index > -1) state.user.projects.splice(index, 1);
    },
    removeToast(state, id) {
      const index = state.application.toasts.findIndex((toast) => toast.id === id);
      if (index > -1) state.application.toasts.splice(index, 1);
    },
    setAppData(state, data) {
      state.application = data;
    },
    setApplicationLoading(state, value) {
      state.application.loading = value;
    },
    setAppProperty(state, { key, value }) {
      state.application[key] = value;
    },
    setCurrentProject(state, data) {
      state.currentProject = data;
    },
    setCurrentProjectProperty(state, { key, value }) {
      _set(state.currentProject, key, value);
    },
    setInstallPrompt(state, prompt) {
      state.application.installPrompt = prompt;
    },
    setLoadingTimeout(state, value) {
      state.application.loadingTimeout = value;
    },
    setLocallyChangedFiles(state, value) {
      state.application.locallyChangedFiles = value;
    },
    setMobile(state, value) {
      state.application.mobile = value;
    },
    setModalPermanence(state, { el, value }) {
      const index = state.application.permanentModals.indexOf(el);
      if (value && index === -1) state.application.permanentModals.push(el);
      else if (index !== -1) state.application.permanentModals.splice(index, 1);
    },
    setProjectAccessDate(state, { project, value }) {
      state.user.projectAccessDates[project] = value;
    },
    setPrompted(state, value) {
      state.application.prompted = value;
    },
    setUserData(state, data) {
      state.user = data;
    },
    setUserProperty(state, { key, value }) {
      state.user[key] = value;
    },
    setTablet(state, value) {
      state.application.tablet = value;
    },
    setTooltip(state, tooltip) {
      state.application.tooltip = tooltip;
    },
  },
  actions: {
    async initialiseApplication({ commit, state }) {
      try {
        const jsonString = await fs.readFile('/mattrbld.conf', 'utf8');
        commit('setAppData', {
          ...state.application,
          ...JSON.parse(jsonString),
        });

        if (state.application.activeUser) { // load the active user
          const userJsonString = await fs.readFile(`/users/${state.application.activeUser}.json`, 'utf8');
          commit('setUserData', {
            ...state.user,
            ...JSON.parse(userJsonString),
          });
        }
      } catch (err) {
        if (err.code !== 'ENOENT') throw err;
        else commit('setAppProperty', { key: 'initialised', value: true }); // if the file doesn’t exist, we’re doing a cold start with default state
      }
    },
    async saveAppData({ commit, state }) {
      try {
        const appData = {};

        persistentAppProperties.forEach((prop) => { appData[prop] = state.application[prop]; });
        await fs.writeFile('/mattrbld.conf', JSON.stringify(appData, null, 2), 'utf8');
        return true;
      } catch (err) {
        commit('addToast', { message: `Something went wrong while saving the app configuration: ${err.message}`, type: 'error' });
        return false;
      }
    },
    async saveCurrentProject({ commit, dispatch, state }) {
      try {
        const currentProjectData = {};
        persistentProjectProperties.forEach((prop) => { currentProjectData[prop] = state.currentProject[prop]; });

        await fs.writeFile(`/projects/${state.currentProject.id}/.mattrbld/config.json`, JSON.stringify(currentProjectData, null, 2), 'utf8');
        commit('addLocallyChangedFile', `/projects/${state.currentProject.id}/.mattrbld/config.json`);
        dispatch('saveAppData');
        return true;
      } catch (err) {
        commit('addToast', { message: `Something went wrong while saving the configuration of the current project: ${err.message}`, type: 'error' });
        return false;
      }
    },
    async saveUser({ commit, state }) {
      try {
        const userData = {};
        persistentUserProperties.forEach((prop) => { userData[prop] = state.user[prop]; });

        await fs.writeFile(`/users/${state.application.activeUser}.json`, JSON.stringify(userData, null, 2), 'utf8');
        return true;
      } catch (err) {
        commit('addToast', { message: `Something went wrong while saving the active user: ${err.message}`, type: 'error' });
        return false;
      }
    },
    startApplicationLoading({ commit, state }) {
      if (state.application.loadingTimeout) {
        window.clearTimeout(state.application.loadingTimeout);
        commit('setLoadingTimeout', null);
      }
      const timeoutId = window.setTimeout(() => commit('setApplicationLoading', true), 100);
      commit('setLoadingTimeout', timeoutId);
    },
    stopApplicationLoading({ commit, state }) {
      if (state.application.loadingTimeout) {
        window.clearTimeout(state.application.loadingTimeout);
        commit('setLoadingTimeout', null);
      }
      commit('setApplicationLoading', false);
    },
  },
  modules: {
    observers,
  },
});
