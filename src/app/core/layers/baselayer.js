const { base, inherit } = require('utils');
const Projections       = require('g3w-ol/projection/projections');
const WMSLayer          = require('core/layers/map/wmslayer');
const ImageLayer        = require('core/layers/imagelayer');

function BaseLayer(config = {}, options={}) {
  base(this, config, options);
  if (this.isWMS()) {
    this._mapLayer = new WMSLayer({
      url:   this.getWmsUrl(),
      id:    this.state.id,
      tiled: this.state.tiled,
    });
    this._mapLayer.addLayer(this);
  } else {
    this._mapLayer = this;
  }
}

inherit(BaseLayer, ImageLayer);

const proto = BaseLayer.prototype;

proto.getProjectionFromCrs = function(crs = {}) {
  crs.epsg = crs.epsg ? crs.epsg : 'EPSG:3857';
  return Projections.get(crs);
};

proto._makeOlLayer = function() {
  //TO OVERWRITE
};

proto._registerLoadingEvent = function() {
  this._olLayer.getSource().on('imageloadstart', () => this.emit("loadstart"));
  this._olLayer.getSource().on('imageloadend',   () => this.emit("loadend"));
};

proto.getSource = function(){
  return this.getOLLayer().getSource();
};

proto.update = function(mapState, extraParams) {
  this._updateLayer(mapState, extraParams);
};

proto.getOLLayer = function() {
  if (!this._olLayer) {
    this._olLayer = this._makeOlLayer();
    this._registerLoadingEvent();
    if (this._mapLayer.config.attributions) {
      this._olLayer.getSource().setAttributions(this._mapLayer.config.attributions);
    }
    this._olLayer.setVisible(this._mapLayer.state.visible)
  }
  return this._olLayer;
};

proto._updateLayer = function(mapState, extraParams) {
  if (this.isWMS()) {
    this._mapLayer.update(mapState, extraParams)
  }
};

proto.setVisible = function(bool) {
  this.getOLLayer().setVisible(bool)
};

proto.getMapLayer = function() {
  return this._mapLayer;
};

module.exports = BaseLayer;
