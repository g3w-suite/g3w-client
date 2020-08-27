const inherit = require('core/utils/utils').inherit;
const base = require('core/utils/utils').base;
const G3WObject = require('core/g3wobject');

function MapLayer(config={}) {
  this.config = config;
  this.id = config.id;
  this.iframe_internal = config.iframe_internal || false;
  this.extent = config.extent;
  this.projection = config.projection;
  base(this);
}

inherit(MapLayer, G3WObject);

const proto = MapLayer.prototype;

proto.getId = function(){
  return this.id;
};

proto.getOLLayer = function() {
  console.log('every sub classes has to be override')
};

module.exports = MapLayer;
