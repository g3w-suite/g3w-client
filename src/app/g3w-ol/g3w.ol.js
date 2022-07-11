import utils from './utils';
import maphelpers from './map/maphelpers';

(function (name, root, factory) {
  if (typeof define === 'function' && define.amd) define(factory);
  else if (typeof exports === 'object') module.exports = factory();
  else root[name] = factory();
}('g3wol3', this, () => {
  const helpers = utils.merge({}, maphelpers);
  return {
    helpers,
  };
}));
