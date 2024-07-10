import ApplicationState      from 'store/application-state';
import { get_legend_params } from 'utils/get_legend_params';

const MapLayer               = require('core/layers/map/maplayer');
const RasterLayers           = require('g3w-ol/layers/rasters');

module.exports = class WMSLayer extends MapLayer {

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

  getGetFeatureInfoUrl(coordinate, resolution, epsg, params) {
    return this.getOLLayer().getSource().getGetFeatureInfoUrl(coordinate,resolution,epsg,params);
  }

  getLayerConfigs() {
    return this.layers;
  }

  addLayer(layer) {
    if (!this.allLayers.find(l => l === layer)) this.allLayers.push(layer);
    if (!this.layers.find(l => l === layer))    this.layers.push(layer);
  }

  removeLayer(layer) {
    this.layers = this.layers.filter(l => l !== layer);
  }

  isVisible() {
    return this._getVisibleLayers().length > 0;
  }

  getQueryUrl() {
    if (this.layers[0].infourl && '' !== this.layers[0].infourl) {
      return this.layers[0].infourl;
    }
    return this.config.url;
  }

  getQueryableLayers() {
    return this.layers.filter(l => l.isQueryable());
  }

  _getVisibleLayers() {
    return this.layers.filter(l => l.isVisible());
  }

  /**
   * @param {boolean} withLayers
   * 
   * @returns {RasterLayers.WMSLayer}
   * 
   * @listens ol.source.ImageWMS~imageloadstart
   * @listens ol.source.ImageWMS~imageloadend
   * @listens ol.source.ImageWMS~imageloaderror
   */
  _makeOlLayer(withLayers) {
    const olLayer = RasterLayers.WMSLayer({
      layerObj: {
        url:             (this.layers[0] && this.layers[0].getWmsUrl) ? this.layers[0].getWmsUrl() : this.config.url,
        id:              this.config.id,
        projection:      this.config.projection,
        iframe_internal: this.iframe_internal,
        layers:          (withLayers) ? this.layers.map(l => l.getWMSLayerName()) : this.layers,
        /** @since 3.9.1 */
        format:          this.config.format,
      },
      extraParams: this.extraParams,
    }, this._method);

    olLayer.getSource().on('imageloadstart', () => this.emit('loadstart'));
    olLayer.getSource().on('imageloadend',   () => this.emit('loadend'));
    olLayer.getSource().on('imageloaderror', () => this.emit('loaderror'));

    return olLayer
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

    const STYLES     = [];
    const OPACITIES  = [];
    let LEGEND_ON    = undefined;
    let LEGEND_OFF   = undefined;

    layers.forEach(layer => {
      const { LEGEND_ON: on, LEGEND_OFF: off } = get_legend_params(layer);
      STYLES.push(layer.getStyle());
      OPACITIES.push(parseInt((layer.getOpacity() / 100) * 255));
      if (on)  LEGEND_ON  = undefined === LEGEND_ON  ? on  : `${LEGEND_ON};${on}`;
      if (off) LEGEND_OFF = undefined === LEGEND_OFF ? off : `${LEGEND_OFF};${off}`;
    });

    this._olLayer.setVisible(true);
    //check if a layer source has with updateParams method
    /** @TODO Check a better way to do this */
    if (this._olLayer.getSource().updateParams) {
      this._olLayer.getSource().updateParams({
        ...params,
        LEGEND_ON,
        LEGEND_OFF,
        filtertoken: ApplicationState.tokens.filtertoken,
        LAYERS:      `${layers[0].isArcgisMapserver() ? 'show:' : ''}${layers.map(l => l.getWMSLayerName()).join(',')}`,
        STYLES:      STYLES.join(','),
        /** @since 3.8 */
        OPACITIES:   OPACITIES.join(','),
      });
    }

  }

  setupCustomMapParamsToLegendUrl(params = {}){
    [].concat(this.layer || this.layers).forEach(l => l.setMapParamstoLegendUrl(params));
  }

}