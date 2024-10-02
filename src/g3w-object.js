/**
 * @file ORIGINAL SOURCE: src/app/core/g3w-object.js@v3.10.2
 * @since 3.11.0
 */

import { noop }     from 'utils/noop';
import { debounce } from 'utils/debounce';
import { throttle } from 'utils/throttle';

/**
 * Mimics the behavior of child class fields in parent class,
 * which is the only way to define a property (eg `this.setters = { ... }`)
 * before invoking the `super()` constructor.
 * 
 * @TODO upgrade babel version in order to declare `setters`, `throttles` `debounces` as class fields
 * 
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Public_class_fields
 */
function defineClassField(obj, key, cb, initVal) {
  // The Field is already available within parent constructor
  // in case of ES5 inheritance (i.e. `inherit(ChildClass, G3WObject);`)
  if (initVal) {
    return cb.call(obj, initVal);
  }
  // The Field is not available within parent constructor
  // in case ES6 inheritance (i.e. `class ChildClass extends G3WObject { };`);
  // I.e
  // class A extends G3WObject {
  //   constructor() {
  //     super();
  //     this.setters = {
  //       foo() {},
  //       bar() {},
  //     };
  //   }
  // }
  let currVal = initVal;
  return Object.defineProperty(obj, key, {
    get() { return currVal; },
    set(value) {
      currVal = value;
      if (value) { cb.call(obj, value); }
    },
  });
}

/**
 * Base object to handle a setter and its listeners.
 */
export default class G3WObject extends EventEmitter {

  constructor(opts) {
    super(opts);

    opts = opts || {};

    // Register the chain of events

    defineClassField(this, 'setters',   this._setupListenersChain, opts.setters   || this.setters);
    defineClassField(this, 'throttles', this._setupThrottles,      opts.throttles || this.throttles);
    defineClassField(this, 'debounces', this._setupDebounces,      opts.debounces || this.debounces);
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
   *  Loop each settersListeners (array) and find a setter key (before/after) to be removed
   */
  un(setter, key) {
    Object.entries(this.settersListeners)
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
  * @param { Function } setter
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
    if (this.settersListeners && undefined !== this.settersListeners[when][setter]) {
      key = `${Math.floor(Math.random() * 1000000) + Date.now()}`;
      this.settersListeners[when][setter].push({ key, fnc: listener, async, priority, once});
      this.settersListeners[when][setter] = this.settersListeners[when][setter].sort((l1, l2) => l2.priority - l1.priority);
    }
    return key // in case of no setter register return undefined listenerKey
  }

  /**
   * @returns {Promise}
   */
  _setupListenersChain(setters) {

    // all methods inside object "setters" of child class.
    this.settersListeners = {
      after:  {},
      before: {},
    };

    for (const setter in setters) {

      // Array to push before and after subscribers
      this.settersListeners.after[setter]  = [];
      this.settersListeners.before[setter] = [];

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
            const len = this.settersListeners.before[setter].length;

            // abort in case of error bool false,
            // or we reached the end of onbefore subscriber
            if (skip) {
              (setters[setter] instanceof Function ? noop : (setters[setter].fallback || noop)).apply(this, args);
              deferred.reject();
              return;
            }

            // call complete method methods and check what returns
            if (count === len) {
              // run setter function (resolve promise)
              deferred.resolve((setters[setter] instanceof Function ? setters[setter] : setters[setter].fnc).apply(this, args));
              // call all subscribed methods after setter
              const onceListeners = [];
              this
                .settersListeners
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
              const listener = this.settersListeners.before[setter][count++];
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
                this.settersListeners.before[setter].splice(count - 1, 1);
              }
            }

          };

          // run all the subscribers and setters
          next(true);
        });

      }

    }
    return this.settersListeners;
  }

  _setupDebounces(debounces) {
    for (const name in debounces) {
      this[name] = debounce(debounces[name].fnc, debounces[name].delay);
    }
  }

  _setupThrottles(throttles) {
    for (const name in throttles) {
      this[name] = throttle(throttles[name].fnc, throttles[name].delay);
    }
  }

  get(key) {
    return this[key] && !(this[key] instanceof Function) ? this[key] : null;
  }

  set(key, value) {
    this[key] = value;
  }

};