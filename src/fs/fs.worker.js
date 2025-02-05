import FS from '@isomorphic-git/lightning-fs';
import { join } from '@isomorphic-git/lightning-fs/src/path';
import MagicPortal from '../assets/js/FixedMagicPortal';

const fs = new FS('mattrfs');
const portal = new MagicPortal(self); // eslint-disable-line no-restricted-globals

async function deleteFileOrFolder(path) {
  const stat = await fs.promises.lstat(path);

  if (stat.isDirectory()) return rmrf(path); // eslint-disable-line no-use-before-define
  return fs.promises.unlink(path);
}

async function loadImage(path) {
  const rawImage = await fs.promises.readFile(path);
  const blob = new Blob([rawImage], path.endsWith('.svg') ? { type: 'image/svg+xml' } : undefined);
  return { url: URL.createObjectURL(blob), raw: blob };
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

portal.set('workerThread', {
  loadImage,
  rmrf,
});
