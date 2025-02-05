import GitWorker from './git.worker?worker'; // eslint-disable-line

import MagicPortal from '../assets/js/FixedMagicPortal';

const worker = new GitWorker();
const portal = new MagicPortal(worker);

async function addAllAndCommit(changes, gitOptions) {
  const workerThread = await portal.get('workerThread');
  return workerThread.addAllAndCommit(changes, gitOptions);
}

async function clone(gitOptions, onAuth, onAuthFailure, onAuthSuccess, onProgress) {
  portal.set('mainThread', {
    onAuth,
    onAuthFailure,
    onAuthSuccess,
    onProgress,
  });

  const workerThread = await portal.get('workerThread');
  return workerThread.clone(gitOptions);
}

async function listRemoteBranches(gitOptions, onAuth, onAuthFailure, onAuthSuccess) {
  portal.set('mainThread', {
    onAuth,
    onAuthFailure,
    onAuthSuccess,
  });

  const workerThread = await portal.get('workerThread');
  return workerThread.listRemoteBranches(gitOptions);
}

async function pull(gitOptions, onAuth, onAuthFailure, onAuthSuccess, onProgress) {
  portal.set('mainThread', {
    onAuth,
    onAuthFailure,
    onAuthSuccess,
    onProgress,
  });

  const workerThread = await portal.get('workerThread');
  return workerThread.pull(gitOptions);
}

async function push(gitOptions, onAuth, onAuthFailure, onAuthSuccess, onProgress) {
  portal.set('mainThread', {
    onAuth,
    onAuthFailure,
    onAuthSuccess,
    onProgress,
  });

  const workerThread = await portal.get('workerThread');
  return workerThread.push(gitOptions);
}

export {
  addAllAndCommit,
  clone,
  listRemoteBranches,
  pull,
  push,
};
