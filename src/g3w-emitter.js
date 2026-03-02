/**
 * @file ORIGINAL SOURCE: src/g3w-object.js@v4.0.0
 * 
 * @since 4.1.0
 */

/**
 * Base class for managing events (setters and listeners).
 * 
 * Based on: EventEmitter v5.2.9 - git.io/ee
 */
export default class Emitter {

  /**
   * @TODO end support for legacy classes (ES5) and use private class fields instead (eg. `___events` → `#events`)
   */

  /** @type { Object } */
  ___events = {};

  /** @type { Object } */
  ___setters = {};

  get setters() {
    return this.___setters;
  }

  set setters(value) {
    // setters is an array strings → convert it into an object
    if (Array.isArray(value)) {
      value = value.reduce((setters, i) => Object.assign(setters, { [i]: this[i] }), {});
    }

    this.___setters = value || {};

    // register and handle setters (before/after)
    Object.entries(this.___setters).forEach(([evt, listener]) => {
      this[evt] = new Proxy(listener, {
        apply: (target, ctx, args) => {
          this.trigger(`onbefore:${evt}`, args);  // call "onbefore" listeners
          const result = target.apply(ctx, args); // execute setter function
          this.trigger(`onafter:${evt}`, args);   // call "onafter" listeners
          return result;
        }
      });
    });
  }

  constructor(opts) {
    opts = opts || {};

    this.setters = opts.setters || this.setters || {};
  }

  /**
   * Adds a listener function to the specified event.
   * The listener will not be added if it is a duplicate.
   * If the listener returns true then it will be removed after it is called.
   *
   * @param {string}   evt      - name of the event.
   * @param {Function} listener - Method to be called when the event is emitted. If the function returns true then it will be removed after calling.
   * @param {number}   priority - priority (lowest value executes first)
   * @param {boolean}  keyEvent - whether it should return registered event key. 
   */
  on(evt, listener, priority, once = false, keyEvent = false) {
    this.___events[evt] = this.___events[evt] || [];

    let key;

    // register listener (sorted by priority)
    if (-1 === this.___events[evt].findIndex(l => l.listener === listener)) {
      key = `${Math.floor(Math.random() * 1000000) + Date.now()}`;
      this.___events[evt].push({ listener, priority, once, key });
      this.___events[evt] = this.___events[evt].sort((l1, l2) => l2.priority - l1.priority);
    }

    return keyEvent ? key : this;
  }

  /**
   * Add a event listener and automatically remove it after its first execution.
   *
   * @param {string} evt name of the event.
   * @param {Function} listener Method to be called when the event is emitted. If the function returns true then it will be removed after calling.
   */
  once(evt, listener, priority) {
    this.on(evt, listener, priority, true);
    return this;
  }

  /**
   * Removes a listener function from the specified event.
   *
   * @param {string} evt name of the event.
   * @param {Function} listener Method to remove from the event.
   */
  off(evt, listener) {
    // remove all listeners
    if (undefined === evt || undefined === listener) {
      this.___events[evt]?.splice(0);
      return;
    }

    // remove a specific listener
    this.___events[evt] = this.___events[evt] || [];

    const idx = 'string' === typeof listener
      ? this.___events[evt].findIndex(l => l.key === listener)       // remove listener by key
      : this.___events[evt].findIndex(l => l.listener === listener); // remove listener by reference

    if (idx >= 0) {
      this.___events[evt].splice(idx, 1);
    }

    return this;
  }
  
  /**
   * Emits an event of your choice.
   * 
   * @param {string} evt name of the event to emit.
   * @param {...*} args list of arguments to be passed to each listener.
   */
  emit(evt) {
    return this.trigger(evt, Array.prototype.slice.call(arguments, 1));
  }

  /**
   * Emits an event of your choice.
   *
   * @param {string} evt name of the event to emit.
   * @param {Array} [args] array of arguments to be passed to each listener.
   */
  trigger(evt, args) {
    this.___events[evt] = this.___events[evt] || [];
    let listener, listeners = this.___events[evt].slice(0);
    for (let i = 0; i < listeners.length; i++) {
      listener = listeners[i];
      if (true === listener.once) {
        this.off(evt, listener.listener);
      }
      // remove listener when it returns true
      if (true === listener.listener.apply(this, args || [])) {
          this.off(evt, listener.listener);
      }
    }
    return this;
  }

  /**
   * Attach an event listener after executing a setter method
   * 
   * @param {string}   setter   - function name to listen for 
   * @param {function} listener - event listener (sync)
   * @param {number}   priority - priority (lowest value executes first)
   */
  onafter(setter, listener, priority) {
    return this.on(`onafter:${setter}`, listener, priority, false, true);
  }

  /**
   * Attach an event listener after executing a setter method (once)
   * 
   * @param {string}   setter   - function name to listen for 
   * @param {function} listener - event listener (sync)
   * @param {number}   priority - priority (lowest value executes first)
   */
  onceafter(setter, listener, priority) {
    return this.on(`onafter:${setter}`, listener, priority, true, true);
  }

  /**
   * Attach an event listener before executing a setter method
   * 
   * @param {string}   setter   - function name to listen for
   * @param {function} listener - event listener (sync)
   * @param {number}   priority - priority (lowest value executes first)
   */
  onbefore(setter, listener, priority) {
    return this.on(`onbefore:${setter}`, listener, priority, false, true);
  }

  /**
   * Attach an event listener before executing a setter method (once)
   * 
   * @param {string}   setter   - function name to listen for
   * @param {function} listener - event listener (sync)
   * @param {number}   priority - priority (lowest value executes first)
   */
  oncebefore(setter, listener, priority) {
    return this.on(`onbefore:${setter}`, listener, priority, true, true);
  }

  /**
   *  Loop each listeners (array) and find a setter key (before/after) to be removed
   */
  un(setter, key) {
    this.off(`onbefore:${setter}`, key);
    this.off(`onafter:${setter}`, key);
  };

  get(key) {
    return this[key] && !(this[key] instanceof Function) ? this[key] : null;
  }

  set(key, value) {
    this[key] = value;
  }

  /**
   * Used by the following plugins: "processing" 
   * 
   * @deprecated
   */
  removeAllListeners() {
    console.warn('[G3W-CLIENT] g3wsdk.core.G3WObject.removeAllListeners. Use g3wsdk.core.G3WObject.off() instead');
    this.off();
  }

};