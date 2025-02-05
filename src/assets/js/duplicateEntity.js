import fs, {
  joinPath, pathDirname,
} from '../../fs';
import store from '../../store';

import getFilenameAndExtension from './getFilenameAndExtension';

export default async function duplicateEntity(path, fileListRef, openAction = () => {}, fileKind = 'file') {
  const directory = pathDirname(path);
  const { filename: nameWithoutExtension, extension } = getFilenameAndExtension(path);
  let counter = 1;
  let nameCandidate = `${nameWithoutExtension}-${counter}.${extension}`;
  let existingFiles;

  try {
    existingFiles = await fs.readdir(directory);
  } catch (err) {
    store.commit('addToast', { message: `Something went wrong while reading the existing files: ${err.message}`, type: 'error' });
    return;
  }

  while (existingFiles.indexOf(nameCandidate) > -1) {
    counter += 1;
    nameCandidate = `${nameWithoutExtension}-${counter}.${extension}`;
  }

  try {
    const rawFile = await fs.readFile(path, 'utf8');
    const newPath = joinPath(directory, nameCandidate);

    await fs.writeFile(newPath, rawFile, 'utf8');
    store.commit('addLocallyChangedFile', newPath);
    store.dispatch('saveAppData');
    if (fileListRef) fileListRef.refresh();
    store.commit('addToast', {
      action: () => openAction(newPath),
      actionLabel: 'Open',
      closeOnRouteChange: true,
      message: `The ${fileKind} was duplicated as “${nameCandidate}”. Would you like to open it?`,
      type: 'positive',
    });
  } catch (err) {
    store.commit('addToast', { message: `Something went wrong while duplicating the ${fileKind}: ${err.message}`, type: 'error' });
    console.error(err);
  }
}
