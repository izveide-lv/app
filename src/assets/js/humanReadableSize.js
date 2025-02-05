// Adapted from https://stackoverflow.com/a/20732091, licensed under [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/)
export default function humanReadableSize(size) {
  const i = size === 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
  return `${(size / 1024 ** i).toFixed(2) * 1}${['B', 'kB', 'MB', 'GB', 'TB'][i]}`;
}
