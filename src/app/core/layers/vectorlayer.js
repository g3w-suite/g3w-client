import GeoLayerMixin from 'core/layers/mixins/geo';

const Layer          = require('core/layers/layer');
const TableLayer     = require('core/layers/tablelayer');
const VectorMapLayer = require('core/layers/map/vectorlayer');

module.exports = class VectorLayer extends GeoLayerMixin(TableLayer) {
  
  constructor(config={}, options) {
    super(config, options);
    this._mapLayer = null; // later tah will be added to map
    this.type = Layer.LayerTypes.VECTOR;
    // need a ol layer for add to map
    this.setup(config, options);
    this.onafter('setColor', color => {});
  }

  getEditingLayer() {
    return this.getMapLayer().getOLLayer();
  }

  resetEditingSource(features=[]){
    this.getMapLayer().resetSource(features)
  }

  getEditingGeometryType() {
    return this.config.editing.geometrytype;
  }

  getMapLayer() {
    if (!this._mapLayer) {
        this._mapLayer = new VectorMapLayer({
        id:           this.getId(),
        geometryType: this.getGeometryType(),
        color:        this.getColor(),
        style:        this.isEditingLayer() ? this.getEditingStyle() : this.getCustomStyle(),
        provider:     this.getProvider('data'),
        features:     this._editor && this._editor.getEditingSource().getFeaturesCollection()
      });
    }
    return this._mapLayer;
  }

};