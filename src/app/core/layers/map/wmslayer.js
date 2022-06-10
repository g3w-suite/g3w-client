import ApplicationState from 'core/applicationstate';
import MapLayer from './maplayer';
import RasterLayers from 'g3w-ol/src/layers/rasters';

class WMSLayer extends MapLayer{
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
    if (!this._olLayer) this._olLayer = this._makeOlLayer(withLayers);
    return this._olLayer;
  };

  getSource() {
    return this.getOLLayer().getSource();
  };

  getInfoFormat() {
    return 'application/vnd.ogc.gml';
  };

  getGetFeatureInfoUrl(coordinate,resolution,epsg,params) {
    return this.getOLLayer().getSource().getGetFeatureInfoUrl(coordinate,resolution,epsg,params);
  };

  getLayerConfigs(){
    return this.layers;
  };

  addLayer(layer) {
    if (!this.allLayers.find(_layer => layer === _layer)) this.allLayers.push(layer);
    if (!this.layers.find(_layer =>  layer === _layer)) this.layers.push(layer);
  };

  removeLayer(layer) {
    this.layers = this.layers.filter((_layer) => {
      return layer !== _layer;
    })
  };

  isVisible(){
    return this._getVisibleLayers().length > 0;
  };

  getQueryUrl() {
    const layer = this.layers[0];
    if (layer.infourl && layer.infourl !== '') return layer.infourl;
    return this.config.url;
  };

  getQueryableLayers() {
    return this.layers.filter(layer => layer.isQueryable());
  };

  _getVisibleLayers() {
    return this.layers.filter(layer => layer.isVisible());
  };

  _makeOlLayer(withLayers) {
    const wmsConfig = {
      url: this.config.url,
      id: this.config.id,
      projection: this.config.projection,
      iframe_internal: this.iframe_internal,
      layers: this.layers
    };
    if (withLayers) wmsConfig.layers = this.layers.map(layer => layer.getWMSLayerName());
    const representativeLayer = this.layers[0];
    if (representativeLayer && representativeLayer.getWmsUrl) wmsConfig.url = representativeLayer.getWmsUrl();
    const olLayer = new RasterLayers.WMSLayer(wmsConfig, this.extraParams, this._method);
    olLayer.getSource().on('imageloadstart', () => this.emit("loadstart"));
    olLayer.getSource().on('imageloadend', () => this.emit("loadend"));
    olLayer.getSource().on('imageloaderror', ()=> this.emit("loaderror"));
    return olLayer
  };

//update Layers
  _updateLayers(mapState={}, extraParams={}) {
    let {force=false, ...params} = extraParams;
    //check disabled layers
    !force && this.checkLayersDisabled(mapState.resolution, mapState.mapUnits);
    const visibleLayers = this._getVisibleLayers(mapState) || [];
    if (visibleLayers.length > 0) {
      const STYLES = visibleLayers.map(layer => layer.getStyle()).join(',');
      const prefix = visibleLayers[0].isArcgisMapserver() ? 'show:' : '';
      params = {
        ...params,
        filtertoken: ApplicationState.tokens.filtertoken,
        STYLES,
        LAYERS: `${prefix}${visibleLayers.map((layer) => {
          return layer.getWMSLayerName();
        }).join(',')}`
      };
      this._olLayer.setVisible(true);
      this._olLayer.getSource().updateParams(params);
    } else this._olLayer.setVisible(false);
  };

  setupCustomMapParamsToLegendUrl(params={}){
    if (this.layer) this.layer.setMapParamstoLegendUrl(params);
    else this.layers.forEach(layer => layer.setMapParamstoLegendUrl(params));
  };
}

export default  WMSLayer;
