var inherit = require('./utils').inherit;
var base = require('./utils').base;
var G3WObject = require('g3w/core/g3wobject');

function Layer(options){
  this.options = options || {};
  base(this);
}
inherit(Layer,G3WObject);

module.exports = Layer;
