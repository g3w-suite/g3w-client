import utils from 'core/utils/utils';
import _ from 'lodash';
import {EventEmitter} from '@billjs/event-emitter';

/**
 * Base object to handle a setter and its listeners.
 * @constructor
 */

class G3WObject extends EventEmitter {
  constructor(options= {}) {
    super();
    const {setters, debounces, throttles} = options;
    //check if setters property is set. Register the chain of events
    setters && this._setupListenersChain(setters);
    // check debounces
    debounces && this._setupDebounces(debounces);
    //check throttles
    throttles && this._setupThrottles(throttles);
  }
  /**
   * Insert a listener on afeter setter was executed
   * @param {string} setter - IMethod name to register a listener function
   * @param {function} listener - listener function (only syncron)
   * @param {number} priority - Priorità di esecuzione: valore minore viene eseuito prima
   */
  onafter(setter, listener, priority) {
    return this._onsetter('after', setter, listener, false, priority);
  };

  onceafter(setter, listener, priority) {
    return this._onsetter('after', setter, listener, false, priority, true);
  };

  /**
   * Listern before cal sesster
   * @param {string} setter - Method name setter
   * @param {function} listener - function to call
   * @param {number} priority - Priority
   */
  onbefore(setter, listener, priority) {
    return this._onsetter('before', setter, listener, false, priority);
  };

  // once before
  oncebefore(setter, listener, priority) {
    return this._onsetter('before', setter, listener, false, priority, true);
  };

  /**
   * @param {string} setter - Method name setter
   * @param {function} listener - function to call
   * @param {number} priority - Priority
   */
  onbeforeasync(setter, listener, priority) {
    return this._onsetter('before', setter, listener, true, priority);
  };

  un(setter, key) {
    // cicle on after before (key) and for each settersListeners (array) find key
    Object.entries(this.settersListeners).forEach(([_key, settersListeners]) => {
      if (key === undefined) settersListeners[setter].splice(0);
      else settersListeners[setter].forEach((setterListener, idx) => {
        if (setterListener.key === key) {
          settersListeners[setter].splice(idx, 1);
        }
      })
    });
  };

  // base function to handle onafter or before listeners
  /*
    when=before|after,
    type=sync|async
  */
  _onsetter(when, setter, listener, async, priority=0, once=false) {
    const settersListeners = this.settersListeners[when];
    const listenerKey = `${Math.floor(Math.random()*1000000) + Date.now()}`;
    const settersListeneres = settersListeners[setter];
    settersListeneres.push({
      key: listenerKey,
      fnc: listener,
      async,
      priority,
      once
    });
    // reader array based on priority
    settersListeners[setter] = _.sortBy(settersListeneres, setterListener => setterListener.priority);
    // return key
    return listenerKey;
  };

  _setupListenersChain(setters) {
    const {noop, toRawType} = utils;
    // initialize all methods inside object "setters" of child class.
    this.settersListeners = {
      after: {},
      before: {}
    };
    for (const setter in setters) {
      const setterOption = setters[setter];
      let setterFnc = noop;
      let setterFallback = noop;
      if (toRawType(setterOption) === 'Function') setterFnc = setterOption;
      else {
        setterFnc = setterOption.fnc;
        setterFallback = setterOption.fallback || noop; // method called in case of error
      }
      // create array to push before and after subscribers
      this.settersListeners.after[setter] = [];
      this.settersListeners.before[setter] = [];
      // assign the property settern name to the object as own method
      this[setter] = (...args) => {
        return new Promise((resolve, reject) =>{
          let returnVal = null;
          let counter = 0;
          // function to call original function(setter function)
          const callSetter = () => {
            // run setter function
            returnVal = setterFnc.apply(this, args);
            // resolve promise
            resolve(returnVal);
            //call all subscribed methods afet setter
            const onceListenerKeys = [];
            const afterListeners = this.settersListeners.after[setter];
            afterListeners.forEach(listener => {
              listener.fnc.apply(this, args);
              listener.once && onceListenerKeys.push(listener.key);
            });
            onceListenerKeys.forEach(key => this.un(setter, key));
          };
          //  abort function
          const abort = () => {
            setterFallback.apply(this, args);
            reject();
          };
          // get all before listeners functions of setter
          const beforeListeners = this.settersListeners['before'][setter];
          // listener counter
          counter = 0;
          const next = bool => {
            // initilize cont to true (continue)
            let cont = true;
            // check if bool is Boolean
            if (toRawType(bool) === 'Boolean') cont = bool;
            // check if count is false or we are arrived to the end of onbefore subscriber
            if (cont === false) {
              // found an error so we can abort
              abort.apply(this, args);
            } else if (counter === beforeListeners.length) {
              // call complete method methods
              const completed = callSetter();
              if (completed === undefined || completed === true) {
                this.emitEvent(`set:${setter}`,args);
              }
            } else if (cont) {
              const listenerObj = beforeListeners[counter];
              const currentCounter = counter;
              // if is async functtion
              if (beforeListeners[counter].async) {
                //add function next to argument of listnerFunction
                args.push(next);
                // update counter
                counter += 1;
                listenerObj.fnc.apply(this, args)
              } else {
                // return or undefine or a boolen to tell if ok(true) can conitnue or not (false)
                const bool = listenerObj.fnc.apply(this, args);
                //update counter
                counter += 1;
                next(bool);
              }
              listenerObj.once && beforeListeners.splice(currentCounter, 1);
            }
          };
          // run next to start to run all the subscribers and setrer its self
          next();
          // retun a promise
        })
      }
    }
    return this.settersListeners
  };

  _setupDebounces(debounces) {
    const {debounce} = utils;
    for (const name in debounces) {
      const delay = debounces[name].delay;
      const fnc = debounces[name].fnc;
      this[name] = debounce(fnc, delay);
    }
  };

  _setupThrottles(throttles) {
    const {throttle} = utils;
    for (const name in throttles) {
      const delay = throttles[name].delay;
      const fnc = throttles[name].fnc;
      this[name] = throttle(fnc, delay);
    }
  };

  //method get
  get(key) {
    return this[key] && !(this[key] instanceof Function) ? this[key] : null;
  };

  //method set
  set(key, value) {
    this[key] = value;
  };
}

export default G3WObject;
