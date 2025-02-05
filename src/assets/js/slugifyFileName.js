import slugify from '@sindresorhus/slugify';
import getFilenameAndExtension from './getFilenameAndExtension';

/**
 * A function to slugify a filename including a file extension
 *
 * @param {string} name The file name including the file extension to be slugified
 * @param {object} slugifyOptions The options to pass to the slugify function
 * @returns the slugified name including the file extension
 */
export default function slugifyFileName(name, slugifyOptions) {
  const { filename, extension } = getFilenameAndExtension(name);
  return `${slugify(filename, slugifyOptions)}.${extension}`;
}
