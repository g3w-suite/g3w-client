const inherit = require('core/utils/utils').inherit;
const base = require('core/utils//utils').base;
const mixin = require('core/utils/utils').mixin;
const Layer = require('./layer');
const TableLayer = require('./tablelayer');
const GeoLayerMixin = require('./geolayermixin');
const VectoMapLayer = require('./map/vectorlayer');

function VectorLayer(config={}, options) {
  base(this, config, options);
  this._mapLayer = null; // later tah will be added to map
  this.type = Layer.LayerTypes.VECTOR;
  // need a ol layer for add to map
  this.setup(config, options);
  this.onafter('setColor', (color) => {})
}

inherit(VectorLayer, TableLayer);

mixin(VectorLayer, GeoLayerMixin);

const proto = VectorLayer.prototype;

proto.getEditingLayer = function() {
  return this.getMapLayer().getOLLayer();
};

proto.resetEditingSource = function(features=[]){
  this.getMapLayer().resetSource(features)
};

proto._setOtherConfigParameters = function(config) {
  this.config.editing.geometrytype = config.geometrytype;
};

proto.getEditingGeometryType = function() {
  return this.config.editing.geometrytype;
};

proto.getMapLayer = function() {
  if (this._mapLayer)
    return this._mapLayer;
  const id = this.getId();
  const geometryType =  this.getGeometryType();
  const color = this.getColor();
  const style = this.getStyle();
  const provider = this.getProvider('data');
  this._mapLayer = new VectoMapLayer({
    id,
    geometryType,
    color,
    style,
    provider,
    features: this._editor && this._editor.getEditingSource().getFeaturesCollection()
  });
  return this._mapLayer;
};


module.exports = VectorLayer;
