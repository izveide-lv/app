import { createRouter, createWebHistory } from 'vue-router';
import Store from '../store';

import GeneralError from '../views/GeneralErrorView.vue';
import Forbidden from '../views/ForbiddenView.vue';
import Home from '../views/HomeView.vue';
import NotFound from '../views/NotFoundView.vue';
import Onboarding from '../views/OnboardingView.vue';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: {
      title: 'Projects',
    },
  },
  {
    path: '/general-error',
    name: 'Error',
    component: GeneralError,
    meta: {
      title: 'Something went wrong',
      hideAppHeader: true,
    },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: NotFound,
    meta: {
      title: '404',
      hideAppHeader: true,
    },
  },
  {
    path: '/access-denied',
    name: 'Forbidden',
    component: Forbidden,
    meta: {
      title: 'Access Denied',
      hideAppHeader: true,
    },
  },
  {
    path: '/onboarding',
    name: 'Onboarding',
    component: Onboarding,
    meta: {
      title: 'Welcome',
      hideAppHeader: true,
    },
    beforeEnter: () => {
      if (Store.state.application.activeUser) return { name: 'Home' };
      return true;
    },
  },
  {
    path: '/import',
    name: 'Import',
    component: () => import('../views/ImportView.vue'),
    meta: {
      title: 'Import Project',
      hideAppHeader: true,
    },
  },
  {
    path: '/project/:id',
    // name: 'Project',
    // route level code-splitting
    // this generates a separate chunk (Project.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import('../views/ProjectView.vue'),
    meta: {
      sidebar: true,
      title: 'Project',
    },
    children: [
      {
        name: 'Project',
        path: '', // this sub-route will be loaded when we enter the parent route
        component: () => import('../views/ProjectDashboardView.vue'),
        meta: {
          label: 'Dashboard',
          title: 'Project Dashboard',
        },
      },
      {
        name: 'Project.MediaLibrary',
        path: 'media',
        component: () => import('../views/ProjectMediaLibraryView.vue'),
        meta: {
          title: 'Project Media Library',
        },
      },
      {
        name: 'Project.Collection',
        path: 'collection/:path',
        component: () => import('../views/ProjectCollectionView.vue'),
        meta: {
          label: 'Collection',
          title: 'Collection Details',
        },
      },
      {
        name: 'Project.Documentation',
        path: 'documentation/:path',
        component: () => import('../views/ProjectDocumentationView.vue'),
        meta: {
          label: 'Documentation',
          title: 'Project Documentation',
        },
      },
      {
        name: 'Project.Settings',
        path: 'settings',
        component: () => import('../views/ProjectSettingsView.vue'),
        meta: {
          label: 'Settings',
          title: 'Project Settings',
        },
      },
    ],
    beforeEnter: (to) => {
      if (!Store.state.user.projects.includes(to.params.id)) return { name: 'Forbidden', replace: true };
      return true;
    },
  },
  {
    path: '/edit-schema/:id/:path',
    name: 'Edit Schema',
    component: () => import('../views/EditSchemaView.vue'),
    meta: {
      label: 'Edit Schema',
      projectRoute: true,
      showBack: true,
      title: 'Edit Schema',
    },
    beforeEnter: (to) => {
      if (!Store.state.user.projects.includes(to.params.id)) return { name: 'Forbidden', replace: true };
      return true;
    },
  },
  {
    path: '/edit-custom-field/:id/:path',
    name: 'Edit Custom Field',
    component: () => import('../views/EditCustomFieldView.vue'),
    meta: {
      label: 'Edit Custom Field',
      projectRoute: true,
      showBack: true,
      title: 'Edit Custom Field',
    },
    beforeEnter: (to) => {
      if (!Store.state.user.projects.includes(to.params.id)) return { name: 'Forbidden', replace: true };
      return true;
    },
  },
  {
    path: '/edit-content/:id/:collection/:path',
    name: 'Edit Content',
    component: () => import('../views/EditContentView.vue'),
    meta: {
      label: 'Edit Content',
      projectRoute: true,
      showBack: true,
      title: 'Edit Content',
    },
    beforeEnter: (to) => {
      if (!Store.state.user.projects.includes(to.params.id)) return { name: 'Forbidden', replace: true };
      return true;
    },
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

router.beforeEach(async (to) => {
  if (Store.state.application.openModals.length !== 0) {
    Store.commit('closeTopmostModal');
    return false;
  }

  Store.dispatch('startApplicationLoading');

  // Initialise App if it hasn’t yet
  if (!Store.state.application.initialised) {
    try {
      await Store.dispatch('initialiseApplication');
    } catch (err) {
      // We pretend we initialised, so we can move to the error route
      Store.commit('setAppProperty', { key: 'initialised', value: true });
      return {
        name: 'Error',
        state: {
          code: err.code,
          message: err.message,
          name: err.name,
          stage: 'init',
        },
      };
    }
  }

  if (to.name !== 'Error' && to.name !== 'Onboarding' && to.name !== 'Import' && !Store.state.application.activeUser) return { name: 'Onboarding', replace: true };
  return true;
});

router.afterEach((to) => {
  Store.dispatch('stopApplicationLoading');
  if (to.meta && to.meta.title) document.title = `${to.meta.title} | Izveide`;
  else document.title = 'Izveide';
});

router.onError((err) => {
  router.push({ name: 'Error', state: { code: err.code, message: err.message, name: err.name } });
});

export default router;
