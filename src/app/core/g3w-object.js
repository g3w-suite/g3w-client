const { noop, debounce, throttle } = require('utils');

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
  // Field is already available within parent constructor
  // in case of ES5 inheritance (ie. `inherit(ChildClass, G3WObject);`)
  if (initVal) {
    return cb.call(obj, initVal);
  }
  // Field is not available within parent constructor
  // in case ES6 inheritance (ie. `class ChildClass extends G3WObject { };`);
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

  constructor() {
    super();

    // Register the chain of events

    defineClassField(this, 'setters',   this._setupListenersChain, this.setters);
    defineClassField(this, 'throttles', this._setupThrottles,      this.throttles);
    defineClassField(this, 'debounces', this._setupDebounces,      this.debounces);
  }

  /**
   * Attatch an event listener after executing a setter method 
   * 
   * @param {string}   setter   - function name to listen for 
   * @param {function} listener - event listener (sync)
   * @param {number}   priority - priority (lowest value executes first)
   */
  onafter(setter, listener, priority) {
    return this._onsetter('after', setter, listener, false, priority);
  }

  /**
   * Attatch an event listener after executing a setter method (once)
   * 
   * @param {string}   setter   - function name to listen for 
   * @param {function} listener - event listener (sync)
   * @param {number}   priority - priority (lowest value executes first)
   */
  onceafter(setter, listener, priority) {
    return this._onsetter('after', setter, listener, false, priority, true);
  }

  /**
   * Attatch an event listener before executing a setter method
   * 
   * @param {string}   setter   - function name to listen for
   * @param {function} listener - event listener (sync)
   * @param {number}   priority - priority (lowest value executes first)
   */
  onbefore(setter, listener, priority) {
    return this._onsetter('before', setter, listener, false, priority);
  }

  /**
   * Attatch an event listener before executing a setter method (once)
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
   *  Cicle each settersListeners (array) and find setter key (before/after) to be removed
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
  * @param { 'sync' | 'async' }   type
  */
  _onsetter(when, setter, listener, async, priority = 0, once = false) {
    // unique listenerKey
    let key;
    // check if setter function is registered
    // and then add info object to setters listeners
    // (sorted based on priority)
    if (this.settersListeners && undefined !== this.settersListeners[when][setter]) {
      key = `${Math.floor(Math.random() * 1000000) + Date.now()}`;
      this.settersListeners[when][setter].push({ key, fnc: listener, async, priority, once});
      this.settersListeners[when][setter] = _.sortBy(this.settersListeners[when][setter], listener => listener.priority);
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

        // listener count
        let count = 0;

        const deferred = $.Deferred();

        const next = (bool) => {
          let skip  = _.isBoolean(bool) ? !bool : false;
          const len = this.settersListeners.before[setter].length;

          // abort in case of error 
          // check if count is false or we reached the end of onbefore subscriber
          if (skip !== false) {
            (_.isFunction(setters[setter]) ? noop : (setters[setter].fallback || noop)).apply(this, args);
            deferred.reject();
          }

          // call complete method methods and check what returns
          if (
            skip === false &&
            count === len &&
            [undefined, true].includes((
              () => {
                // run setter function (resolve promise)
                deferred.resolve((_.isFunction(setters[setter]) ? setters[setter] : setters[setter].fnc).apply(this, args));
                // call all subscribed methods afet setter
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
              }
            )())
          ) {
            this.emitEvent(`set:${setter}`,args);
          }
          
          if (!skip && skip === false && count !== len) {
            const listener = this.settersListeners.before[setter][count++];
            if (listener.async) {
              // add function next to argument of listener function
              args.push(next);
              listener.fnc.apply(this, args)
            } else {
              // return or undefined or a boolen to tell if ok(true) can conitnue or not (false)
              next(listener.fnc.apply(this, args));
            }
            if (listener.once) {
              this.settersListeners.before[setter].splice(count - 1, 1);
            }
          }

        };

        // run all the subscribers and setters
        next();

        return deferred.promise();
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