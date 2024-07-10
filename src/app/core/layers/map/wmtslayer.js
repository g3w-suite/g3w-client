const MapLayer     = require('core/layers/map/maplayer');
const RasterLayers = require('g3w-ol/layers/rasters');

module.exports = class WMSTLayer extends MapLayer {

  constructor(options={}, extraParams={}, method='GET') {
    super(options);
    this.LAYERTYPE = {
      LAYER: 'layer',
      MULTILAYER: 'multilayer'
    };
    this.extraParams = extraParams;
    this._method = method;
  }

  getOLLayer(withLayers) {
    if (!this._olLayer) {
      this._olLayer = this._makeOlLayer(withLayers);
    }
    return this._olLayer;
  }

  getSource() {
    return this.getOLLayer().getSource();
  }

  getInfoFormat() {
    return 'application/vnd.ogc.gml';
  }

  getGetFeatureInfoUrl(coordinate,resolution,epsg,params) {
    return this.getOLLayer().getSource().getGetFeatureInfoUrl(coordinate,resolution,epsg,params);
  }

  getLayerConfigs() {
    return this.layers;
  }

  addLayer(layer) {
    if (!this.allLayers.find(_layer => layer === _layer)) {
      this.allLayers.push(layer);
    }
    if (!this.layers.find(_layer => layer === _layer)) {
      this.layers.push(layer);
    }
  }

  removeLayer(layer) {
    this.layers = this.layers.filter(_layer => layer !== _layer);
  }

  update(mapState={}, extraParams={}) {
    this._updateLayers(mapState, extraParams);
  }

  isVisible() {
    return this._getVisibleLayers().length > 0;
  }

  getQueryUrl() {
    const layer = this.layers[0];
    if (layer.infourl && layer.infourl !== '') {
      return layer.infourl;
    }
    return this.config.url;
  };

  getQueryableLayers() {
    return this.layers.filter(layer => layer.isQueryable());
  }

  _getVisibleLayers() {
    return this.layers.filter(layer => layer.isVisible());
  }

  _makeOlLayer() {
    const olLayer = new RasterLayers.WMSTLayer({
      url:        this.config.url,
      id:         this.config.id,
      projection: this.config.projection
    }, this.extraParams, this._method);

    olLayer.getSource().on('tileloadstart', () => this.emit('loadstart'));
    olLayer.getSource().on('tileloadend',   () => this.emit('loadend'));
    olLayer.getSource().on('tileloaderror', () => this.emit('loaderror'));

    return olLayer
  }

  checkLayerDisabled(layer, resolution, mapUnits) {
    layer.setDisabled(resolution, mapUnits);
    return layer.isDisabled();
  }

  // check which layers has to be disabled
  checkLayersDisabled(resolution, mapUnits) {
    this.allLayers.forEach(layer => {
      this.checkLayerDisabled(layer, resolution, mapUnits);
    });
  }

  //update Layers
  _updateLayers(mapState = {}, extraParams = {}) {
    let {
      force=false,
      ...params
    } = extraParams;

    //check disabled layers
    if (!force) {
      this.checkLayersDisabled(mapState.resolution, mapState.mapUnits);
    } 

    const layers = this._getVisibleLayers(mapState) || [];

    // skip when ..
    if (layers.length <= 0) {
      this._olLayer.setVisible(false);
      return;
    }

    this._olLayer.setVisible(true);
    this._olLayer.getSource().updateParams({
      ...params,
      LAYERS: `${layers[0].isArcgisMapserver() ? 'show:' : ''}${layers.map(l => l.getWMSLayerName()).join(',')}`
    });
  }

};