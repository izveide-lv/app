/**
 * @typedef {object} FileInfo
 * @property {string} filename - the name of the file without an extension
 * @property {string} extension - the extension of the file without the leading dot
 */

import { pathBasename } from '../../fs';

/**
 * A function to get the name and extension of a file from a path
 * If a simple string is passed that doesn’t look like a path or filename, it
 * will be returned unchanged without an extension property
 * @param {string} path - the path of the file, may also just be the filename itself
 * @returns {FileInfo} The file information relating to this path
 */
export default function getFilenameAndExtension(path) {
  if (!path) return { filename: '', extension: null };
  const filename = pathBasename(String(path));
  const extension = filename.slice((Math.max(0, filename.lastIndexOf('.')) || Infinity) + 1); // based on https://stackoverflow.com/questions/190852/how-can-i-get-file-extensions-with-javascript/12900504#12900504
  const nameWithoutExtension = filename.substring(0, Math.max(0, filename.lastIndexOf('.')) || Infinity);

  return { filename: nameWithoutExtension, extension };
}
