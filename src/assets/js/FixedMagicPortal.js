/* eslint-disable */

// This is a nearly 1:1 copy of https://github.com/wmhilton/magic-portal/blob/master/index.js with a fix applied that hasn’t landed upstream yet
// I’ve also changed it to return an error object instead of just the message, so it includes the error codes Lightning-FS includes in its errors

class _MagicPortalImplementation {
  constructor(channel) {
    this.rpc_counter = 0;
    this.channel = channel;
    this.foreign = new Map();
    this.local = new Map();
    this.calls = new Map();
    this.queue = [];
    this.connectionEstablished = false;
    this.channel.addEventListener('message', ({ data }) => {
      if (!data) return;
      if (typeof data !== 'object') return;
      switch (data.type) {
        case 'MP_INIT': return this.onInit(data);
        case 'MP_SET': return this.onSet(data);
        case 'MP_CALL': return this.onCall(data);
        case 'MP_RETURN': return this.onReturn(data);
      }
    });
    this.channel.postMessage({ type: 'MP_INIT', id: 1, reply: true });
  }

  onInit(data) {
    this.connectionEstablished = true;
    const { queue } = this;
    this.queue = [];
    for (const msg of queue) {
      this.channel.postMessage(msg);
    }
    if (data.reply) {
      this.channel.postMessage({ type: 'MP_INIT', reply: false });
    }
  }

  onSet(data) {
    const proxy = {};
    const { object } = data;
    for (const method of data.methods) {
      const reply = !data.void.includes(method);
      proxy[method] = (...args) => {
        this.rpc_counter = (this.rpc_counter + 1) % Number.MAX_SAFE_INTEGER;
        // Send message to worker
        return new Promise((resolve, reject) => {
          this.postMessage({
            type: 'MP_CALL', object, method, id: this.rpc_counter, args, reply,
          });
          if (reply) {
            this.calls.set(this.rpc_counter, { resolve, reject });
          } else {
            resolve();
          }
        });
      };
    }
    // previous value might be a promise created by 'get'
    const prev = this.foreign.get(data.object);
    // insert the newly created proxy value where the promise was
    this.foreign.set(data.object, proxy);
    // resolve that promise
    if (typeof prev === 'function') prev(proxy);
  }

  onCall(data) {
    const object = this.local.get(data.object);
    if (object) {
      object[data.method](...data.args)
        .then((result) => data.reply && this.channel.postMessage({ type: 'MP_RETURN', id: data.id, result }))
        .catch((err) => this.channel.postMessage({ type: 'MP_RETURN', id: data.id, error: { code: err.code, data: err.data, message: err.message, name: err.name } }));
    }
  }

  onReturn(data) {
    if (this.calls.has(data.id)) {
      const { resolve, reject } = this.calls.get(data.id);
      this.calls.delete(data.id);
      data.error ? reject(data.error) : resolve(data.result);
    }
  }

  postMessage(data) {
    if (this.connectionEstablished) {
      this.channel.postMessage(data);
    } else {
      this.queue.push(data);
    }
  }

  set(name, object, opts = {}) {
    this.local.set(name, object);
    // Send a descriptor of the object to the other side
    const methods = Object.entries(object)
      .filter(([key, val]) => typeof val === 'function')
      .map(([key, val]) => key);
    this.postMessage({
      type: 'MP_SET',
      object: name,
      methods,
      void: opts.void || [],
    });
  }

  async get(name) {
    if (this.foreign.has(name)) {
      return this.foreign.get(name);
    }
    // We set the `resolve` callback into the Map so we can resolve it later
    return new Promise((resolve, reject) => this.foreign.set(name, resolve));
  }
}

// Reduce the API that's exposed by console.log
export default class MagicPortal {
  constructor(channel) {
    const mp = new _MagicPortalImplementation(channel);
    Object.defineProperties(this, {
      get: {
        writable: false,
        configurable: false,
        value: mp.get.bind(mp),
      },
      set: {
        writable: false,
        configurable: false,
        value: mp.set.bind(mp),
      },
    });
  }
}
