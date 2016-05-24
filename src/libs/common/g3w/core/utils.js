var utils = {
  mixin: function mixin(destination, source) {
      return utils.merge(destination.prototype, source);
  },
  
  mixininstance: function mixininstance(destination,source){
      var sourceInstance = new source;
      utils.merge(destination, sourceInstance);
      utils.merge(destination.prototype, source.prototype);
  },


  merge: function merge(destination, source) {
      var key;

      for (key in source) {
          if (utils.hasOwn(source, key)) {
              destination[key] = source[key];
          }
      }
  },

  hasOwn: function hasOwn(object, key) {
      return Object.prototype.hasOwnProperty.call(object, key);
  },
  
  inherit:function(childCtor, parentCtor) {
    function tempCtor() {};
    tempCtor.prototype = parentCtor.prototype;
    childCtor.superClass_ = parentCtor.prototype;
    childCtor.prototype = new tempCtor();
    childCtor.prototype.constructor = childCtor;
  },
  
  base: function(me, opt_methodName, var_args) {
    var caller = arguments.callee.caller;
    if (caller.superClass_) {
      // This is a constructor. Call the superclass constructor.
      return caller.superClass_.constructor.apply(
          me, Array.prototype.slice.call(arguments, 1));
    }

    var args = Array.prototype.slice.call(arguments, 2);
    var foundCaller = false;
    for (var ctor = me.constructor;
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
      return me.constructor.prototype[opt_methodName].apply(me, args);
    } else {
      throw Error(
          'base called from a method of one name ' +
          'to a method of a different name');
    }
  },
  
  noop: function(){},
  
  truefnc: function(){return true},
  
  falsefnc: function(){return true},
  
  resolvedValue: function(value){
    var deferred = $.Deferred();
    deferred.resolve(value);
    return deferred.promise();
  },
  
  rejectedValue: function(value){
    var deferred = $.Deferred();
    deferred.reject(value);
    return deferred.promise();
  }
};

module.exports = utils;
