/**
 * google closure library implementation
 */
export function base(me, opt_methodName, var_args) {
  // who call base
  // noinspection JSAnnotator
  const caller = arguments.callee.caller;
  if (caller.superClass_) {
    // This function constructor (that inherit from superClass_). Call the superclass constructor.
    //It is a easy way to cal super class in binding to this
    return caller.superClass_.constructor.apply(
        me, Array.prototype.slice.call(arguments, 1));
  }
  const args = Array.prototype.slice.call(arguments, 2);
  let foundCaller = false;
  //constructor is the constructor function of the object
  for (let ctor = me.constructor;
       ctor; ctor = ctor.superClass_ && ctor.superClass_.constructor) {
    if (ctor.prototype[opt_methodName] === caller) {
      foundCaller = true;
    } else if (foundCaller) {
      return ctor.prototype[opt_methodName].apply(me, args);
    }
  }
  // If we did not find the caller in the prototype chain,
  // then one of two things happened:
  // 1) The caller is an instance method.
  // 2) This method was not called by the right caller.
  if (me[opt_methodName] === caller) {
    // call the function from prototype object
    return me.constructor.prototype[opt_methodName].apply(me, args);
  } else {
    throw Error(
        'base called from a method of one name ' +
        'to a method of a different name');
  }
};