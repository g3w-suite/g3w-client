import { DOTS_PER_INCH }     from 'constant';
import ApplicationState      from 'store/application-state';
import { get_legend_params } from 'utils/get_legend_params';

const MapLayer               = require('core/layers/map/maplayer');

class WMSLayer extends MapLayer {

  constructor(options={}, extraParams={}, method='GET') {
    super(options);

    this.LAYERTYPE = {
      LAYER: 'layer',
      MULTILAYER: 'multilayer'
    };

    this.extraParams = extraParams;

    this._method     = method;

    /** @since 3.11.0 */
    this._options = options; 
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
   * @returns { WMSLayer._makeOlLayer }
   * 
   * @listens ol.source.ImageWMS~imageloadstart
   * @listens ol.source.ImageWMS~imageloadend
   * @listens ol.source.ImageWMS~imageloaderror
   */
  _makeOlLayer(withLayers) {
    let olLayer;

    /** @type { 'image' | 'tile' } */
    let image = 'image';
    
    // ARCGIS LAYER
    if ('ARCGISMAPSERVER' === this._options.type) {
      olLayer = new ol.layer.Tile({
        visible: true,
        source: new ol.source.TileArcGISRest({
          url:          this.config.url,
          projection:   this.config.projection,
        }),
      });
    }

    // WMTS LAYER
    else if ('WMTS' === this._options.type) {
      image = 'tile';
      const layerObj = {
        url:               ('mapproxy' === this.config.cache_provider) || !(this.layers[0] && this.layers[0].getWmsUrl) ? this.config.url : this.layers[0].getWmsUrl(),
        id:                this.config.id,
        projection:        this.config.projection,
        iframe_internal:   this.iframe_internal,
        layers:            (withLayers) ? this.layers.map(l => l.getWMSLayerName()) : this.layers,
        cache_provider:    this.config.cache_provider, /** @since 3.10.0 **/
        cache_type:        this.config.cache_type, /** @since 3.10.0  tms, wms**/
        cache_layer:       this.config.cache_layer,
        cache_extent:      this.config.cache_extent,
        cache_grid:        this.config.cache_grid,
        cache_grid_extent: this.config.cache_grid_extent,
      };
  
      /** @since 3.10.0 - MapProxy WMTS layer **/
      const resolutions = 'mapproxy' === layerObj.cache_provider && ol.tilegrid.createXYZ({ extent: opts.cache_grid_extent }).getResolutions();
  
      olLayer = resolutions
        ? new ol.layer.Tile({
          source: new ol.source.WMTS({
            url:         layerObj.url,
            layer:       layerObj.cache_layer,
            matrixSet:   layerObj.cache_grid,
            format:      layerObj.cache_format || 'png',
            projection:  layerObj.layers[0].getProjection(),
            tileGrid: new ol.tilegrid.WMTS({
              resolutions,
              origin:    ol.extent.getTopLeft(layerObj.cache_grid_extent),
              matrixIds: resolutions.map((_, i) => i),
            }),
            style:       layerObj.style || '',
            transparent: false,
          })
        })
        : WMSLayer._makeOlLayer({
          layerObj,
          extraParams: this.extraParams || {},
          tiled: true
        }); 
    }

    // WMS LAYER
    else {
      olLayer = WMSLayer._makeOlLayer({
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
    }

    olLayer.getSource().on(`${image}loadstart`, () => this.emit('loadstart'));
    olLayer.getSource().on(`${image}loadend`,   () => this.emit('loadend'));
    olLayer.getSource().on(`${image}loaderror`, () => this.emit('loaderror'));

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

/**
 * ORIGINAL SOURCE: src/app/g3w-ol/layers/rasters.js@v3.10.0
 * 
 * @since 3.11.0
 */
WMSLayer._makeOlLayer = function(opts = {}, method = 'GET') {
  return new (opts.tiled ? ol.layer.Tile : ol.layer.Image)({
    id:            opts.layerObj.id,
    name:          opts.layerObj.name,
    opacity:       undefined !== opts.layerObj.opacity ? opts.layerObj.opacity : 1.0,
    visible:       opts.layerObj.visible,
    extent:        opts.layerObj.extent,
    maxResolution: opts.layerObj.maxResolution,
    source: new (opts.tiled ? ol.source.TileWMS : ol.source.ImageWMS)({
      ratio:      1,
      url:        opts.layerObj.url,
      projection: (opts.layerObj.projection) ? opts.layerObj.projection.getCode() : null,
      params:     {
        ...Object.fromEntries(
          Object.entries({
            DPI:         DOTS_PER_INCH,
            TRANSPARENT: true,
            FORMAT:      opts.layerObj.format,
            LAYERS:      undefined !== opts.layerObj.layers      ? opts.layerObj.layers : '',
            VERSION:     undefined !== opts.layerObj.version     ? opts.layerObj.version : '1.3.0',
            SLD_VERSION: undefined !== opts.layerObj.sld_version ? opts.layerObj.sld_version : '1.1.0',
          })
          // prevents sending "FORMAT" parameter when undefined
          .filter(([key, val])=>('FORMAT' !== key ? true : undefined !== val))
      ),
      ...(opts.extraParams || {})
      },
      imageLoadFunction: (opts.layerObj.iframe_internal || 'POST' === method)
        ? (tile, url) => {
          fetch('POST' === method ? (url || '').split('?')[0] : url, {
            method,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
            body:    'POST' === method ? url.split('?')[1] : undefined,
          })
          .then(async response => tile.getImage().src = window.URL.createObjectURL(await response.blob()))
          .catch(e => { console.error('Invalid tile', ol.TileState.ERROR, e); tile.setState(ol.TileState.ERROR); });
        }
        : undefined,
    })
  });

};

module.exports = WMSLayer;