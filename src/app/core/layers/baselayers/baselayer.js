import Projections from 'g3w-ol/projection/projections';
import WMSLayer from 'core/layers/map/wmslayer';
import ImageLayer from 'core/layers/imagelayer';

class BaseLayer extends ImageLayer {
  constructor(config = {}, options = {}) {
    super(config, options);
    if (this.isWMS()) {
      const config = {
        url: this.getWmsUrl(),
        id: this.state.id,
        tiled: this.state.tiled,
      };
      this._mapLayer = new WMSLayer(config);
      this._mapLayer.addLayer(this);
    } else this._mapLayer = this;
  }

  getProjectionFromCrs(crs = {}) {
    crs.epsg = crs.epsg ? crs.epsg : 'EPSG:3857';
    return Projections.get(crs);
  }

  _makeOlLayer() {
    // TO OVERWRITE
  }

  _registerLoadingEvent() {
    this._olLayer.getSource().on('imageloadstart', () => {
      this.fire('loadstart');
    });
    this._olLayer.getSource().on('imageloadend', () => {
      this.fire('loadend');
    });
  }

  getSource() {
    return this.getOLLayer().getSource();
  }

  update(mapState, extraParams) {
    this._updateLayer(mapState, extraParams);
  }

  getOLLayer() {
    let olLayer = this._olLayer;
    if (!olLayer) {
      olLayer = this._olLayer = this._makeOlLayer();
      this._registerLoadingEvent();
      if (this._mapLayer.config.attributions) {
        this._olLayer.getSource().setAttributions(this._mapLayer.config.attributions);
      }
      olLayer.setVisible(this._mapLayer.state.visible);
    }
    return olLayer;
  }

  _updateLayer(mapState, extraParams) {
    if (this.isWMS()) {
      this._mapLayer.update(mapState, extraParams);
    }
  }

  setVisible(bool) {
    this.getOLLayer().setVisible(bool);
  }

  getMapLayer() {
    return this._mapLayer;
  }
}

export default BaseLayer;
