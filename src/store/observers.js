/* eslint no-param-reassign: ["error", { "props": true, "ignorePropertyModificationsFor": ["state"] }] */

export default {
  namespaced: true,
  state: () => ({
    resizeObserver: null,
    resizeCallbacks: new Map(),
  }),
  mutations: {
    addResizeListener(state, { el, cb }) {
      if (!state.resizeObserver) {
        if ('ResizeObserver' in window) {
          state.resizeObserver = new ResizeObserver((entries) => { // entries are just the elements that changed size
            entries.forEach((entry) => {
              const callback = state.resizeCallbacks.get(entry.target);
              if (callback) {
                const contentRectUsed = entry.borderBoxSize && entry.borderBoxSize.length > 0;
                const width = contentRectUsed ? entry.borderBoxSize[0].inlineSize : entry.contentRect.width;
                const height = contentRectUsed ? entry.borderBoxSize[0].blockSize : entry.contentRect.height;
                callback(width, height, contentRectUsed);
              }
            });
          });
        } else {
          console.warn('Resize Observers aren’t supported in this browser / context'); // eslint-disable-line no-console
        }
      }

      state.resizeObserver.observe(el);
      state.resizeCallbacks.set(el, cb);
    },
    removeResizeListener(state, element) {
      if (!state.resizeObserver) return;
      state.resizeObserver.unobserve(element);
      state.resizeCallbacks.delete(element);

      if (state.resizeCallbacks === 0) {
        state.resizeObserver.disconnect();
        state.resizeObserver = null;
      }
    },
  },
  actions: {

  },
};
