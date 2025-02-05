import { readFileSync } from 'fs';
import { basename } from 'path';
import { createFilter } from 'vite'; // eslint-disable-line import/no-extraneous-dependencies
import { optimize } from 'svgo'; // eslint-disable-line import/no-extraneous-dependencies

export default (options = { include: '**/*.svg' }) => {
  const transformedFiles = new Set();

  return {
    name: 'svgo',
    transform: (source, id) => {
      const filter = createFilter(options.include || '**/*.svg', options.exclude);
      if (!filter(id)) return null;

      const code = readFileSync(id);
      const result = optimize(code, { path: id, ...options.svgo });

      transformedFiles.add(basename(id));

      return {
        map: { mappings: '' },
        code: `export default '${result.data}'`,
      };
    },
    generateBundle: (_, bundle) => {
      Object.entries(bundle).forEach(([id, item]) => {
        if (item.type === 'asset' && transformedFiles.has(item.name)) delete bundle[id]; // eslint-disable-line no-param-reassign
      });
    },
  };
};
