/**
 * Based on google closure library implementation
 */
export function base(target) {

  console.warn('[G3W-CLIENT] g3wsdk.core.utils.base is deprecated');
  console.trace();

  // reference to previous function (caller)
  const caller = arguments.callee.caller;

  // call superclass constructor (that inherits from superClass_)
  if (caller.superClass_) {
    // CASE: `super(opts)`
    if ('Function' === caller.superClass_.constructor.name) {
      return caller.superClass_.constructor.apply(target, Array.prototype.slice.call(arguments, 1));
    }
    // CASE: `base(this) for example in case set some attributes/methods to this before call base(this)
    // example http://github.com/g3w-suite/g3w-client-plugin-qtimeseries/blob/dev/service.js#L16-L21`
    if (1 === arguments.length) {
      return Object.assign(
        target,
        Reflect.construct(caller.superClass_.constructor, arguments, target.constructor)
      )
    }
    // CASE: `base(this, opts)`
    return Object.assign(
      target,
      Reflect.construct(caller.superClass_.constructor, Array.prototype.slice.call(arguments, 1), target.constructor)
    );
  }

  let foundCaller = false;

  // traverse prototype chain
  for (let ctor = target.constructor; ctor; ctor = ctor.superClass_?.constructor) {
    if (ctor.prototype[arguments[1]] === caller) {
      foundCaller = true;
    } else if (foundCaller) {
      return ctor.prototype[arguments[1]].apply(target, Array.prototype.slice.call(arguments, 2));
    }
  }

  // caller is an instance method
  if (target[arguments[1]] === caller) {
    return target.constructor.prototype[arguments[1]].apply(target, Array.prototype.slice.call(arguments, 2));
  }

  // method was called by wrong caller
  throw Error('base called from a method of one name to a method of a different name');
}