import Store from '../../store';

/**
 * A function that requests persistent storage if available when the storage is not yet
 * marked as persistent. This is done to avoid data loss when Mattrbld isn’t used for a
 * while and browsers decide to purge all local data.
 */
export default async function requestPersistentStorage() {
  if (navigator.storage && navigator.storage.persisted) {
    const persistent = await navigator.storage.persisted();
    if (!persistent && navigator.storage.persist) {
      const persisted = await navigator.storage.persist();
      if (!persisted) Store.commit('addToast', { message: 'Mattrbld was not granted persistent storage privileges. You may lose unsynchronised local changes if you don’t use Mattrbld regularly.', timeout: false, type: 'warning' });
    }
  }
}
