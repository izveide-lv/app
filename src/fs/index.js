import FS from '@isomorphic-git/lightning-fs';
import { basename, dirname, join } from '@isomorphic-git/lightning-fs/src/path';

const fs = new FS('mattrfs');

async function deleteFileOrFolder(path) {
  const stat = await fs.promises.lstat(path);

  if (stat.isDirectory()) return rmrf(path); // eslint-disable-line no-use-before-define
  return fs.promises.unlink(path);
}

// Adapted from https://github.com/isomorphic-git/isomorphic-git/blob/main/src/models/FileSystem.js
async function exists(filepath) {
  try {
    await fs.promises.stat(filepath);
    return true;
  } catch (err) {
    if (err.code === 'ENOENT' || err.code === 'ENOTDIR') return false;
    throw err;
  }
}

// Adapted from https://github.com/isomorphic-git/isomorphic-git/blob/main/src/models/FileSystem.js
async function mkdirp(filepath, _selfCall = false) {
  try {
    await fs.promises.mkdir(filepath);
  } catch (err) {
    // If err is null then operation succeeded!
    if (err === null) return;
    // If the directory already exists, that's OK!
    if (err.code === 'EEXIST') return;
    // Avoid infinite loops of failure
    if (_selfCall) throw err;
    // If we got a "no such file or directory error" backup and try again.
    if (err.code === 'ENOENT') {
      const parent = dirname(filepath);
      // Check to see if we've gone too far
      if (parent === '.' || parent === '/' || parent === filepath) throw err;
      // Infinite recursion, what could go wrong?
      await mkdirp(parent);
      await mkdirp(filepath, true);
    }
  }
}

/*
Return a flat list of all the files nested inside a directory

Based on an elegant concurrent recursive solution from SO
https://stackoverflow.com/a/45130990/2168416

Adapted from https://github.com/isomorphic-git/isomorphic-git/blob/main/src/models/FileSystem.js
*/
async function readdirDeep(dir) {
  const subdirs = await fs.promises.readdir(dir);
  const files = await Promise.all(
    subdirs.map(async (subdir) => {
      const res = `${dir}/${subdir}`;
      return (await fs.promises.stat(res)).isDirectory()
        ? readdirDeep(res)
        : res;
    }),
  );
  return files.reduce((a, f) => a.concat(f), []);
}

async function rmrf(path) {
  if (!path || typeof path !== 'string' || !path.trim()) throw new Error('Invalid directory');
  if (path.trim() === '/') throw new Error('You may not delete the root directory');

  try {
    const entities = await fs.promises.readdir(path);
    await Promise.all(entities.map((entity) => {
      const fullPath = join(path, entity);
      return deleteFileOrFolder(fullPath);
    }));
    await fs.promises.rmdir(path);
  } catch (err) {
    if (err.code === 'ENOTDIR') await fs.promises.unlink(path); // it must be a file
    else throw err;
  }
}

export default fs.promises;
export {
  basename as pathBasename,
  dirname as pathDirname,
  exists,
  fs as PlainFS,
  join as joinPath,
  mkdirp,
  readdirDeep,
  rmrf,
};
