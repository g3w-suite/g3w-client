var utils = {
  inherit: function inherit(destination, source, addSuper) {
      var proto = destination.prototype = utils.createObject(source.prototype);
      proto.constructor = destination;

      if (addSuper || typeof addSuper === 'undefined') {
          destination._super = source.prototype;
      }
  },

  createObject: Object.create || function createObject(source) {
      var Host = function () {};
      Host.prototype = source;
      return new Host();
  },

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
  
  deferredValue: function(value){
    var deferred = $.Deferred();
    deferred.resolve(value);
    return deferred.promise();
  }
};

module.exports = utils;
