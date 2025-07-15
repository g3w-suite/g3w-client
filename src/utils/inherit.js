/**
 * google closure library impememtation
 */
export function inherit(childCtor, parentCtor) {
  console.warn('[G3W-CLIENT] g3wsdk.core.utils.inherit is deprecated');
  console.trace();

  function tempCtor() {}
  tempCtor.prototype = parentCtor.prototype;
  childCtor.superClass_ = parentCtor.prototype;
  childCtor.prototype = new tempCtor();
  childCtor.prototype.constructor = childCtor;
}