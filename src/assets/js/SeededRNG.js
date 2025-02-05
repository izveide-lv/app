// Adapted from somewhere on the internet a long time ago (maybe this: https://stackoverflow.com/questions/33716998/)
export default class SeededRNG {
  constructor(seed = 1) {
    if (typeof seed !== 'number') this.seed = SeededRNG.seedFromString(seed);
    else this.seed = seed;
  }

  static seedFromString(seed) {
    let hash = 0;
    let i;
    let chr;
    if (seed.length === 0) return hash;
    for (i = 0; i < seed.length; i += 1) {
      chr = seed.charCodeAt(i);
      // hash * 2 ** 5
      hash = ((hash << 5) - hash) + chr; // eslint-disable-line no-bitwise
      // Convert to 32bit integer
      hash |= 0; // eslint-disable-line no-bitwise
    }
    return Math.abs(hash);
  }

  random(min = 0, max = 1) {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    const randomNumber = this.seed / (233280.0);
    const range = max - min;
    return randomNumber * range + min;
  }
}
