import { createApp } from 'vue';
import { registerSW } from 'virtual:pwa-register'; // eslint-disable-line import/no-unresolved

import App from './App.vue';
import router from './router';
import store from './store';

import 'modern-normalize';

import './assets/styles/base.scss';

const app = createApp(App).use(store).use(router);

// import base components for convenience
const modules = import.meta.glob('./components/Mb*.{vue,js}', { eager: true });

Object.entries(modules).forEach(([filePath, module]) => {
  const componentName = filePath.split('/').pop().replace(/\.\w+$/, '');
  app.component(componentName, module.default || module);
});

app.mount('#app');

const updateSW = registerSW({
  onNeedRefresh() {
    store.commit('addToast', {
      action: updateSW,
      actionLabel: 'Refresh',
      id: 'refresh-to-update',
      message: 'A new version of Mattrbld is available, refresh to start using the newest verison',
      timeout: false,
    });
  },
  onOfflineReady() {
    store.commit('addToast', { message: 'Mattrbld was cached on your device and is available offline from now on', type: 'positive' });
  },
});
