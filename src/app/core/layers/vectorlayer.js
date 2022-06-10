import utils from 'core/utils/utils';
import Layer  from './layer';
import TableLayer  from './tablelayer';
import GeoLayerMixin  from './geolayermixin';
import VectoMapLayer  from './map/vectorlayer';

class VectorLayer extends TableLayer{
  constructor(config={}, options) {
    super(config, options);
    this._mapLayer = null; // later tah will be added to map
    this.type = Layer.LayerTypes.VECTOR;
    // need a ol layer for add to map
    this.setup(config, options);
    this.onafter('setColor', color => {})
  }

  getEditingLayer() {
    return this.getMapLayer().getOLLayer();
  };

  resetEditingSource(features=[]) {
    this.getMapLayer().resetSource(features)
  };

  _setOtherConfigParameters(config) {
    this.config.editing.geometrytype = config.geometrytype;
  };

  getEditingGeometryType() {
    return this.config.editing.geometrytype;
  };

  getMapLayer() {
    if (this._mapLayer)
      return this._mapLayer;
    const id = this.getId();
    const geometryType =  this.getGeometryType();
    const color = this.getColor();
    const style = this.isEditingLayer() ? this.getEditingStyle() : this.getCustomStyle();
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
}

utils.mixin(VectorLayer, GeoLayerMixin);


export default  VectorLayer;
