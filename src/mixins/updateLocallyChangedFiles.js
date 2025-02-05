import fs, { joinPath } from '../fs';

export default {
  methods: {
    async updateLocallyChangedFiles(path) {
      const entities = await fs.readdir(path);
      const stats = await Promise.all(entities.map((entity) => fs.stat(joinPath(path, entity))));
      return Promise.all(entities.map((entity, index) => {
        if (stats[index].isFile()) return this.$store.commit('addLocallyChangedFile', joinPath(path, entity));
        return this.updateLocallyChangedFiles(joinPath(path, entity));
      }));
    },
  },
};
