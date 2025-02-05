import GitLoginModal from '../components/utility/GitLoginModal.vue';

export default {
  components: {
    GitLoginModal,
  },
  data() {
    return {
      credentialPromise: null,
      credentials: null,
      gitLoginMessage: `This repository seems to be private. Please log into your <strong>${this.gitProvider}</strong> account to confirm that you may perform this action.`,
      showGitLoginModal: false,
    };
  },
  methods: {
    async onGitAuth() {
      if (this.credentials && this.credentials.user && this.credentials.password) return { username: this.credentials.user, password: this.credentials.password };
      if (this.$store.state.user.gitAuth) {
        const { user, password } = this.$store.state.user.gitAuth;
        return { username: user, password };
      }
      this.gitLoginMessage = `This repository seems to be private. Please log into your <strong>${this.gitProvider || 'Git'}</strong> account to confirm that you may perform this action.`;
      this.credentials = await this.openGitLoginModal();
      this.showGitLoginModal = false;
      if (this.credentials === 'cancel') return { cancel: true };
      return { username: this.credentials.user, password: this.credentials.password };
    },
    async onGitAuthFailure() {
      if (this.$store.state.user.gitAuth) this.$store.commit('setUserProperty', { key: 'gitAuth', value: null });
      this.gitLoginMessage = 'Sorry, that didn’t work. This might mean that you don’t have access to this repository, or that you typed the wrong username / password combination. Please try again.';
      this.credentials = await this.openGitLoginModal();
      this.showGitLoginModal = false;

      if (this.credentials === 'cancel') return { cancel: true };
      return { username: this.credentials.user, password: this.credentials.password };
    },
    async onGitAuthSuccess() {
      if (this.credentials && this.credentials.savePassword) {
        // WARNING: This might be insecure considering XSS attacks (then again, if there’s a XSS, we probably are screwed anyway)
        this.$store.commit('setUserProperty', { key: 'gitAuth', value: { password: this.credentials.password, user: this.credentials.user } });
      }
    },
    openGitLoginModal() {
      this.showGitLoginModal = true;
      return new Promise((resolve) => { this.credentialPromise = resolve; });
    },
  },
};
