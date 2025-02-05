export default class TimeoutError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TimeoutError';
    this.code = 'TimeoutError'; // for consistency with other errors from isomorphic-git since it’s used in the same context
  }
}
