import { loadEnv } from 'vite'; // eslint-disable-line import/no-extraneous-dependencies

const env = loadEnv('production', process.cwd());

export default () => ({
  name: 'umami',
  transformIndexHtml(html) {
    if (!env.VITE_UMAMI_ID || !env.VITE_UMAMI_SCRIPT) return html;

    return [
      {
        tag: 'script',
        attrs: {
          async: null,
          defer: null,
          'data-website-id': env.VITE_UMAMI_ID,
          'data-auto-track': false,
          'data-do-not-track': true,
          src: env.VITE_UMAMI_SCRIPT,
        },
        injectTo: 'head',
      },
    ];
  },
});
