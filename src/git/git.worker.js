import FS from '@isomorphic-git/lightning-fs';
import http from 'isomorphic-git/http/web/index.cjs';
import {
  add,
  commit,
  clone as gitClone,
  listServerRefs,
  pull as gitPull,
  push as gitPush,
  remove,
} from 'isomorphic-git';

import MagicPortal from '../assets/js/FixedMagicPortal';
import TimeoutError from '../assets/js/TimeoutError';

const fs = new FS('mattrfs');
const portal = new MagicPortal(self); // eslint-disable-line no-restricted-globals

async function addAllAndCommit(changes, gitOptions) {
  // git add -A adapted from https://isomorphic-git.org/docs/en/snippets
  await Promise.all(
    changes.map((change) => {
      if (change.type === 'remove') return remove({ fs, dir: gitOptions.dir, filepath: change.file });
      return add({ fs, dir: gitOptions.dir, filepath: change.file });
    }),
  );
  return commit({
    ...gitOptions,
    fs,
  });
}

async function clone(args) {
  const mainThread = await portal.get('mainThread');

  return gitClone({
    ...args,
    fs,
    http,
    onProgress(e) {
      mainThread.onProgress(e);
    },
    onAuth() {
      return mainThread.onAuth();
    },
    onAuthFailure() {
      return mainThread.onAuthFailure();
    },
    onAuthSuccess() {
      mainThread.onAuthSuccess();
    },
  });
}

async function listRemoteBranches(args) {
  const mainThread = await portal.get('mainThread');
  let timeout = null;

  const refs = await Promise.race([ // we’re racing against a timeout because the proxy sometimes silently fails to relay and we’d be waiting forever otherwise
    listServerRefs({
      ...args,
      http,
      prefix: 'refs/heads/',
      onAuth() {
        self.clearTimeout(timeout); // eslint-disable-line no-restricted-globals
        timeout = null;
        return mainThread.onAuth();
      },
      onAuthFailure() {
        return mainThread.onAuthFailure();
      },
      onAuthSuccess() {
        mainThread.onAuthSuccess();
      },
    }),
    new Promise((resolve, reject) => {
      timeout = self.setTimeout(() => { // eslint-disable-line no-restricted-globals
        self.clearTimeout(timeout); // eslint-disable-line no-restricted-globals
        timeout = null;
        reject(new TimeoutError('Connection timed out'));
      }, this.isMobile ? 10000 : 5000); // a 10s timeout might be too much here generally speaking, but on mobile it could be necessary
    }),
  ]);
  return refs.map((ref) => ref.ref.replace('refs/heads/', ''));
}

async function pull(args) {
  const mainThread = await portal.get('mainThread');

  return gitPull({
    ...args,
    fs,
    http,
    onProgress(e) {
      mainThread.onProgress(e);
    },
    onAuth() {
      return mainThread.onAuth();
    },
    onAuthFailure() {
      return mainThread.onAuthFailure();
    },
    onAuthSuccess() {
      mainThread.onAuthSuccess();
    },
  });
}

async function push(args) {
  const mainThread = await portal.get('mainThread');

  return gitPush({
    ...args,
    fs,
    http,
    onProgress(e) {
      mainThread.onProgress(e);
    },
    onAuth() {
      return mainThread.onAuth();
    },
    onAuthFailure() {
      return mainThread.onAuthFailure();
    },
    onAuthSuccess() {
      mainThread.onAuthSuccess();
    },
  });
}

portal.set('workerThread', {
  addAllAndCommit,
  clone,
  listRemoteBranches,
  pull,
  push,
});
