const { base, inherit, mixin } = require('utils');
const Layer                    = require('core/layers/layer');
const TableLayer               = require('core/layers/tablelayer');
const GeoLayerMixin            = require('core/layers/mixins/geo');
const VectorMapLayer           = require('core/layers/map/vectorlayer');

function VectorLayer(config={}, options) {
  base(this, config, options);
  this._mapLayer = null; // later tah will be added to map
  this.type = Layer.LayerTypes.VECTOR;
  // need a ol layer for add to map
  this.setup(config, options);
  this.onafter('setColor', color => {});
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
  const style = this.isEditingLayer() ? this.getEditingStyle() : this.getCustomStyle();
  const provider = this.getProvider('data');
  this._mapLayer = new VectorMapLayer({
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
