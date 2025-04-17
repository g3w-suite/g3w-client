/**
 * @file ORIGINAL SOURCE: src/app/core/g3w-object.js@v3.10.2
 * @since 3.11.0
 */

import { noop }      from 'utils/noop';
import { debounce }  from 'utils/debounce';
import { throttle }  from 'utils/throttle';
import EventEmitter  from 'wolfy87-eventemitter';

/**
 * Base object to handle a setter and its listeners.
 */
export default class G3WObject extends EventEmitter {

  /**
   * @TODO end support for legacy classes (ES5) and use private class fields instead (eg. `___setters` → `#setters`)
   */

  /** @type { Object } */
  ___setters;

  /** @type { Object } */
  ___throttles;

  /** @type { Object } */
  ___debounces;

  /** @type { Object } */
  ___listeners;

  get setters() {
    return this.___setters;
  };

  set setters(value) {

    // setters is an array strings → convert it into an object
    if (Array.isArray(value)) {
      value = value.reduce((setters, i) => Object.assign(setters, { [i]: this[i] }), {});
    }

    this.___setters = value;
    if (value) {
      // all methods inside object "setters" of child class.
      this.___listeners = {
        after:  {},
        before: {},
      };
    
      for (const setter in this.___setters) {
        // Array to push before and after subscribers
        this.___listeners.after[setter]  = [];
        this.___listeners.before[setter] = [];
  
        // assign the property setter name to the object as own method
        this[setter] = function(...args) {
          //Return a Deferred object
          // When then method of defferred object is called, a new promise is return
          // and not the deferred.resolve value directly.
          // This is the reason why when we call setter methods return a promise and not the value
          return $.Deferred(deferred => {
            // listener count
            let count = 0;
            /**
             *
             * @param {undefined | Boolean} bool
             */
            const next = (bool) => {
              //check if it needs to skip (exit)
              const skip  = (true === bool || false === bool) ? !bool : false;
              //get count of before subscribers on setter function
              const len = this.___listeners.before[setter].length;
  
              // abort in case of error bool false,
              // or we reached the end of onbefore subscriber
              if (skip) {
                (this.___setters[setter] instanceof Function ? noop : (this.___setters[setter].fallback || noop)).apply(this, args);
                deferred.reject();
                return;
              }
  
              // call complete method methods and check what returns
              if (count === len) {
                // run setter function (resolve promise)
                deferred.resolve((this.___setters[setter] instanceof Function ? this.___setters[setter] : this.___setters[setter].fnc).apply(this, args));
                // call all subscribed methods after setter
                const onceListeners = [];
                this
                  .___listeners
                  .after[setter]
                  .forEach(listener => {
                    listener.fnc.apply(this, args);
                    if (listener.once) {
                      onceListeners.push(listener.key);
                    }
                  });
                onceListeners.forEach(key => this.un(setter, key));
                this.emitEvent(`set:${setter}`, args);
              }
              // still call an onbefore listener subscribers
              if (count < len) {
                //get on before listener subscribes and increment count to 1
                const listener = this.___listeners.before[setter][count++];
                //check if it is async
                if (listener.async) {
                  // add function next to argument of listener function
                  args.push(next);
                  listener.fnc.apply(this, args)
                } else {
                  // return or undefined or a boolean to tell if ok(true) can continue or not (false)
                  next(listener.fnc.apply(this, args));
                }
                //in case of listener subscribe function need to run just one time
                // after call remove it from listeners
                if (listener.once) {
                  this.___listeners.before[setter].splice(count - 1, 1);
                }
              }
            };
            // run all the subscribers and setters
            next(true);
          });
        }
      }
    }
  };

  get throttles() {
    return this.___throttles;
  };

  set throttles(value) {
    this.___throttles = value;
    if (value) {
      console.warn('[G3W-CLIENT] throttles option is deprecated');
      console.trace();
      for (const name in this.___throttles) {
        this[name] = throttle(this.___throttles[name].fnc, this.___throttles[name].delay);
      }
    }
  };

  get debounces() {
    return this.___debounces;
  };

  set debounces(value) {
    this.___debounces = value;
    if (value) {
      console.warn('[G3W-CLIENT] debounces option is deprecated');
      console.trace();
      for (const name in this.___debounces) {
        this[name] = debounce(this.___debounces[name].fnc, this.___debounces[name].delay);
      }
    }
  };

  constructor(opts) {
    super(opts);

    opts = opts || {};

    // Register the chain of events
    this.setters   = opts.setters   || this.setters;
    this.throttles = opts.throttles || this.throttles;
    this.throttles = opts.debounces || this.debounces;
  }

  /**
   * Attach an event listener after executing a setter method
   * 
   * @param {string}   setter   - function name to listen for 
   * @param {function} listener - event listener (sync)
   * @param {number}   priority - priority (lowest value executes first)
   */
  onafter(setter, listener, priority) {
    return this._onsetter('after', setter, listener, false, priority);
  }

  /**
   * Attach an event listener after executing a setter method (once)
   * 
   * @param {string}   setter   - function name to listen for 
   * @param {function} listener - event listener (sync)
   * @param {number}   priority - priority (lowest value executes first)
   */
  onceafter(setter, listener, priority) {
    return this._onsetter('after', setter, listener, false, priority, true);
  }

  /**
   * Attach an event listener before executing a setter method
   * 
   * @param {string}   setter   - function name to listen for
   * @param {function} listener - event listener (sync)
   * @param {number}   priority - priority (lowest value executes first)
   */
  onbefore(setter, listener, priority) {
    return this._onsetter('before', setter, listener, false, priority);
  }

  /**
   * Attach an event listener before executing a setter method (once)
   * 
   * @param {string}   setter   - function name to listen for
   * @param {function} listener - event listener (sync)
   * @param {number}   priority - priority (lowest value executes first)
   */
  oncebefore(setter, listener, priority) {
    return this._onsetter('before', setter, listener, false, priority, true);
  }

  /**
   * Attatch an event listener before executing a setter method (once)
   * 
   * @param {string}   setter   - function name to listen for
   * @param {function} listener - event listener (async)
   * @param {number}   priority - priority (lowest value executes first)
   */
  onbeforeasync(setter, listener, priority) {
    return this._onsetter('before', setter, listener, true, priority);
  }

  /**
   *  Loop each listeners (array) and find a setter key (before/after) to be removed
   */
  un(setter, key) {
    Object.entries(this.___listeners)
      .forEach(([_key, setters]) => {
        if (undefined === key) {
          setters[setter].splice(0);
        } else {
          setters[setter].forEach((listener, idx) => { listener.key === key && setters[setter].splice(idx, 1); })
        }
      });
  };

/**
  * Register and handle <before/after> listeners
  * 
  * @param { 'before' | 'after' } when
  * @param { string } setter function name
  * @param { Object } listener
  * @param { Boolean } async
  * @param { Number } priority
  * @param { Boolean }   once
  */
  _onsetter(when, setter, listener, async, priority = 0, once = false) {
    // unique listenerKey
    let key;
    // check if setter function is registered
    // and then add an info object to setter listeners
    // (sorted based on priority)
    if (this.___listeners && undefined !== this.___listeners[when][setter]) {
      key = `${Math.floor(Math.random() * 1000000) + Date.now()}`;
      this.___listeners[when][setter].push({ key, fnc: listener, async, priority, once});
      this.___listeners[when][setter] = this.___listeners[when][setter].sort((l1, l2) => l2.priority - l1.priority);
    }
    return key // in case of no setter register return undefined listenerKey
  }

  get(key) {
    return this[key] && !(this[key] instanceof Function) ? this[key] : null;
  }

  set(key, value) {
    this[key] = value;
  }

};