<template>
  <SvgSprite />
  <GlobalTooltipController />
  <header v-if="!$route.meta.hideAppHeader" id="appHeader">
    <MbButton v-if="$route.meta.showBack" :dark="dark" icon="chevron-left" rounded tooltip="Back" @click="$router.back" />
    <MbButton v-if="$route.meta.sidebar && $store.state.application.tablet" :dark="dark" icon="show-sidebar" rounded tooltip="Show Sidebar" @click="$store.commit('setAppProperty', { key: 'sidebarVisible', value: true })" />
    <p v-if="$route.meta.label && !isMobile" class="h3">{{$route.meta.label}}</p>
    <UserSwitcher v-show="$store.state.application.activeUser" :dark="dark" />
  </header>
  <router-view :dark="dark" />
  <ModalOverlay :dark="dark" />
  <LoadingOverlay :dark="dark" />
  <MbSnackbar :dark="dark" />
  <MbModal v-if="inDevMode" id="componentsModal" :dark="dark" :padded-body="false" :visible="showComponentsModal" @close="showComponentsModal = false">
    <Components :dark="dark" />
  </MbModal>
</template>

<script>
import { defineAsyncComponent } from 'vue';
import GlobalTooltipController from './components/utility/GlobalTooltipController.vue';
import LoadingOverlay from './components/utility/LoadingOverlay.vue';
import ModalOverlay from './components/utility/ModalOverlay.vue';
import MbSnackbar from './components/utility/MbSnackbar.vue';
import SvgSprite from './components/utility/SvgSprite.vue';
import UserSwitcher from './components/utility/UserSwitcher.vue';

export default {
  components: {
    GlobalTooltipController,
    Components: defineAsyncComponent(() => {
      if (import.meta.env.DEV) return import('./views/ComponentsView.vue');
      return undefined;
    }),
    LoadingOverlay,
    ModalOverlay,
    MbSnackbar,
    SvgSprite,
    UserSwitcher,
  },
  computed: {
    dark() {
      // HACK: Mention a reactive property so it will recomputed when we want to
      this.forceRecompute; // eslint-disable-line no-unused-expressions
      const { theme } = this.$store.state.user;
      if (theme === 'dark') return true;
      if (theme === 'light') return false;
      return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) || false;
    },
    inDevMode() {
      return import.meta.env.DEV;
    },
    isMobile() {
      return this.$store.state.application.mobile;
    },
    scale() {
      return this.$store.state.user.uiScale;
    },
    sidebarVisible() {
      return this.$route.meta.sidebar && this.$store.state.application.sidebarVisible;
    },
    tooltip() {
      return this.$store.state.application.tooltip || {};
    },
  },
  created() {
    if (this.dark) {
      document.body.classList.add('dark');
      document.querySelector('meta[name=theme-color]').setAttribute('content', '#1E1D22');
    } else document.querySelector('meta[name=theme-color]').setAttribute('content', '#ffffff');
    if (!navigator.onLine) this.handleOffline();

    window.addEventListener('scroll', this.handleScroll, { passive: true });
    if (window.matchMedia) {
      const mobileQuery = window.matchMedia('(max-width: 40rem)');
      if (mobileQuery.matches) this.$store.commit('setMobile', true);

      const tabletQuery = window.matchMedia('(max-width: 60rem)');
      if (tabletQuery.matches) this.$store.commit('setTablet', true);

      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { this.forceRecompute += 1; });
      mobileQuery.addEventListener('change', (e) => this.$store.commit('setMobile', e.matches));
      tabletQuery.addEventListener('change', (e) => this.$store.commit('setTablet', e.matches));
    }

    if (this.inDevMode) window.addEventListener('keyup', this.handleComponentsModal);
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    window.addEventListener('beforeinstallprompt', (prompt) => {
      prompt.preventDefault();
      this.$store.commit('setInstallPrompt', prompt);
    });

    if (import.meta.env.MODE === 'staging') {
      this.$store.commit('addToast', {
        id: 'stagingWarning',
        message: 'You are running a preview version of Mattrbld. Things might not work properly or may break unexpectedly.',
        timeout: false,
        type: 'warning',
      });
    }
  },
  data() {
    return {
      forceRecompute: 0,
      showComponentsModal: false,
    };
  },
  methods: {
    handleComponentsModal(e) {
      if (!this.inDevMode) return;
      if (['c', 'ç'].includes(e.key) && e.ctrlKey && e.altKey) {
        e.preventDefault();
        this.showComponentsModal = !this.showComponentsModal;
      }
    },
    handleOffline() {
      this.$store.commit('addToast', {
        id: 'appIsOffline',
        message: 'You’re working offline. Importing projects won’t work and you won’t be able to sync changes until a connection has been re-established. Please be aware that there’s a higher chance of conflicts in this state.',
        timeout: false,
        type: 'warning',
      });
    },
    handleOnline() {
      this.$store.commit('removeToast', 'appIsOffline');
      this.$store.commit('addToast', {
        id: 'appIsOnline',
        message: 'You’re back online!',
        timeout: 2000,
        type: 'positive',
      });
    },
    handleScroll() {
      if (this.$store.state.application.tooltip) this.$store.commit('setTooltip', null);
    },
  },
  watch: {
    dark(newVal) {
      if (newVal) {
        document.body.classList.add('dark');
        document.querySelector('meta[name=theme-color]').setAttribute('content', '#1E1D22');
      } else {
        document.body.classList.remove('dark');
        document.querySelector('meta[name=theme-color]').setAttribute('content', '#ffffff');
      }
    },
    $route(to) {
      if (to.name === 'Home' && this.$store.state.application.installPrompt && !this.$store.state.application.prompted) {
        this.$store.commit('addToast', {
          action: async () => {
            this.$store.state.application.installPrompt.prompt();
            const choice = await this.$store.state.application.installPrompt.userChoice;

            if (choice.outcome === 'accepted') this.$store.commit('addToast', { message: 'Great! You should see Mattrbld appear on your homescreen or app launcher any moment. You can launch the application from there and close this tab.', type: 'positive' });
            else this.$store.commit('addToast', { message: 'Alright, we won’t bother you again. If you change your mind, you can always install it via the button in your browser.' });
          },
          actionLabel: 'Install',
          message: 'Mattrbld can be installed as an app on your device, doing so will make accessing your projects even easier. Would you like to proceed?',
          onClose: (installClicked) => {
            if (!installClicked) this.$store.commit('addToast', { message: 'Alright, we won’t bother you again. If you change your mind, you can always install it via the button in your browser.' });
            this.$store.commit('setPrompted', true);
          },
          timeout: false,
        });

        this.$store.dispatch('saveAppData');
      }
    },
    scale(newVal) {
      if (typeof newVal === 'number' && newVal !== 'auto') document.documentElement.style.fontSize = `${16 * newVal}px`;
      else document.documentElement.style.removeProperty('font-size');
    },
    sidebarVisible(newVal) {
      if (newVal) document.body.classList.add('sidebar');
      else document.body.classList.remove('sidebar');
    },
  },
};
</script>

<style lang="scss">
@use './assets/styles/breakpoints' as *;

#appHeader {
  padding: 2rem;
  display: flex;
  align-items: center;

  @media #{$tablet} {
    padding: 1rem;
  }

  .button {
    margin-right: 1rem;
  }

  .h3 {
    margin: 0;
    margin-right: 2rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .user-switcher {
    margin-left: auto;
  }
}

#componentsModal {
  width: 80vw;
  max-width: rem(1536);

  @media #{$mobile} {
    width: 100%;
  }
}
</style>
