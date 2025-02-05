import { listRemotes } from 'isomorphic-git';
import fs, { PlainFS } from '../fs';

export default {
  methods: {
    async projectExists(id, url) {
      try {
        await fs.stat(`/projects/${id}`);
        const remotes = await listRemotes({ fs: PlainFS, dir: `/projects/${id}` });
        const origin = remotes.find((remote) => remote.remote === 'origin');
        if (origin && (origin.url === url || origin.url === url.replace('http', 'https') || origin.url === url.replace('https', 'http'))) return { remote: true, user: this.$store.state.user.projects.includes(id) };
        return true;
      } catch (err) {
        if (err.code === 'ENOENT' || err.code === 'ENOTDIR') return false;
        throw err;
      }
    },
  },
};
