import fs from 'node:fs';
import path from 'node:path';

export default () => {
  let rootConfig;

  return {
    name: 'robots',
    enforce: 'post',
    apply: 'build',
    configResolved(resolvedConfig) {
      rootConfig = resolvedConfig;
    },
    async closeBundle() {
      const { outDir } = rootConfig.build;
      const allRobots = fs.readdirSync(outDir).filter((filepath) => filepath.match(/robots\..+\.txt/));
      const modeSpecificRobots = `robots.${rootConfig.mode}.txt`;

      if (allRobots.includes(modeSpecificRobots)) {
        fs.renameSync(path.resolve(outDir, modeSpecificRobots), path.resolve(outDir, 'robots.txt'));
        allRobots.splice(allRobots.indexOf(modeSpecificRobots), 1);
      }

      const deletionPromises = allRobots.map((filename) => fs.promises.rm(path.resolve(outDir, filename)));
      await Promise.all(deletionPromises);
    },
  };
};
