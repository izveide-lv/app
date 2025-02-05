import fs from '../../fs';

export default async (id) => {
  try {
    const stat = await fs.stat(`/projects/${id}/.mattrbld`);
    if (stat.isDirectory()) return true;
    return false;
  } catch (err) {
    if (err.code === 'ENOENT' || err.code === 'ENOTDIR') return false;
    throw err;
  }
};
