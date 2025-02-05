import TimeoutError from '../assets/js/TimeoutError';

import gitAuth from './gitAuth';

export default {
  computed: {
    cloneLabel() {
      if (!this.cloneStep) return 'Initialising';
      if (this.cloneStep === 'done') return 'Done';
      if (this.cloneStep === 'checking configuration') return 'Checking Configuration';
      return `${this.cloneStep[0].toUpperCase()}${this.cloneStep.slice(1)}: ${(this.cloneProgress * 100).toFixed(2)}%`;
    },
  },
  data() {
    return {
      cloneProgress: 0,
      cloneStep: '',
    };
  },
  methods: {
    getDefaultBranch(branches) {
      // TODO: find a way to extract the default branch? → Could be done by fetching the repo first, but might be expensive bandwidth wise
      if (branches.includes('main')) return 'main';
      if (branches.includes('master')) return 'master';
      return branches[0];
    },
    handleGitError(err) {
      if (err.code === 'UserCanceledError') {
        this.credentials = null;
        this.errors.repoURL = 'You might not have access to this repository';
      } else if (err.code === 'HttpError' && err.data && err.data.statusCode === 404) { // there might also be a 403 error if we have read- but not write-access, but that only matters if we have forPush active
        this.errors.repoURL = 'This repository doesn’t seem to exist';
      } else if (err instanceof TimeoutError || (err.name === 'TypeError' && err.message === 'Failed to fetch')) { // This is probably not the best way to catch these errors, but there’s hardly any information in that object
        this.errors.repoURL = 'This repository doesn’t exist or is refusing connections';
        this.$store.commit('addToast', { message: 'Could not fetch the repository, please check your network connection and the proxy server settings under ‘Advanced Settings’', type: 'error' });
      } else {
        this.$store.commit('addToast', { message: `Something went wrong while fetching branches: ${err.message}`, type: 'error' });
      }
    },
    async onGitProgress(progress) {
      this.cloneStep = progress.phase;
      if (progress.total) this.cloneProgress = progress.loaded / progress.total;
      else this.cloneProgress = 0;
    },
  },
  mixins: [gitAuth],
};
