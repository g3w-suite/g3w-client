var utils = {
  inherit: function inherit(destination, source, addSuper) {
      var proto = destination.prototype = utils.createObject(source.prototype);
      proto.constructor = destination;

      if (addSuper || typeof addSuper === 'undefined') {
          destination._super = source.prototype;
      }
  },

  /**
   * Creates a new object with the source object nestled within its
   * prototype chain.
   *
   * @param {Object} source Method to insert into the new object's prototype.
   * @return {Object} An empty object with the source object in it's prototype chain.
   */
  createObject: Object.create || function createObject(source) {
      var Host = function () {};
      Host.prototype = source;
      return new Host();
  },

  /**
   * Mixes the specified object into your class. This can be used to add
   * certain capabilities and helper methods to a class that is already
   * inheriting from some other class. You can mix in as many object as
   * you want, but only inherit from one.
   *
   * These values are mixed into the actual prototype object of your
   * class, they are not added to the prototype chain like inherit.
   *
   * @param {Function} destination Class to mix the object into.
   * @param {Object} source Object to mix into the class.
   */
  mixin: function mixin(destination, source) {
      return utils.merge(destination.prototype, source);
  },
  
  mixininstance: function mixininstance(destination,source){
      var sourceInstance = new source;
      utils.merge(destination, sourceInstance);
      utils.merge(destination.prototype, source.prototype);
  },

  /**
   * Merges one object into another, change the object in place.
   *
   * @param {Object} destination The destination for the merge.
   * @param {Object} source The source of the properties to merge.
   */
  merge: function merge(destination, source) {
      var key;

      for (key in source) {
          if (utils.hasOwn(source, key)) {
              destination[key] = source[key];
          }
      }
  },

  /**
   * Shortcut for `Object.prototype.hasOwnProperty`.
   *
   * Uses `Object.prototype.hasOwnPropety` rather than
   * `object.hasOwnProperty` as it could be overwritten.
   *
   * @param {Object} object The object to check
   * @param {String} key The key to check for.
   * @return {Boolean} Does object have key as an own propety?
   */
  hasOwn: function hasOwn(object, key) {
      return Object.prototype.hasOwnProperty.call(object, key);
  }
};

module.exports = utils;
