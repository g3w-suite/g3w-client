import Layer from 'core/layers/layer';
import TableLayer from 'core/layers/tablelayer';
import GeoLayerMixin from 'core/layers/geolayermixin';
import VectoMapLayer from 'core/layers/map/vectorlayer';

class VectorLayer extends TableLayer {
  constructor(config={}, options={}) {
    super(config, options);
    this.setup(config, options);
    this._mapLayer = null; // later tah will be added to map
    this.type = Layer.LayerTypes.VECTOR;
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

Object.assign(VectorLayer.prototype, GeoLayerMixin);


export default  VectorLayer;
