var inherit = require('core/utils/utils').inherit;
var base = require('core/utils/utils').base;
var G3WObject = require('core/g3wobject');

var Plugin = function() {
  this.name = '(no name)';
  this.config = null;
  
  base(this);
}
inherit(Plugin,G3WObject);

var proto = Plugin.prototype;

module.exports = Plugin;
