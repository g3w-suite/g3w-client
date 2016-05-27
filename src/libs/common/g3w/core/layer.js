var inherit = require('./utils').inherit;
var base = require('./utils').base;
var G3WObject = require('g3w/core/g3wobject');

function Layer(config){
  this.config = config || {};
  base(this);
}
inherit(Layer,G3WObject);

module.exports = Layer;
