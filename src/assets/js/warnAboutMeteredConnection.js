import Store from '../../store';

export default function warnAboutMeteredConnection() {
  const { connection } = navigator;

  if (!connection) return;

  if (connection.saveData || connection.type === 'cellular' || (connection.effectiveType && connection.effectiveType !== '4g')) {
    Store.commit('addToast', {
      id: 'connectionMayBeMetered',
      closeOnRouteChange: true,
      message: 'It seems like you might be on a slow / metered connection. Importing a project can use a lot of data, so you may want to connect to WiFi before you do so',
      timeout: false,
      type: 'warning',
    });
  }
}
