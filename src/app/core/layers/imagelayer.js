import { DOTS_PER_INCH }      from 'constant';
import G3WObject              from 'core/g3w-object';
import ApplicationState       from 'store/application-state';
import Projections            from 'store/projections';
import ProjectsRegistry       from 'store/projects';
import ApplicationService     from 'services/application';
import { get_legend_params }  from 'utils/get_legend_params';
import GeoLayerMixin          from 'core/layers/mixins/geo';

const Layer                   = require('core/layers/layer');
const { VectorLayer }         = require('core/layers/vectorlayer');

/**
 * Stringify a query URL param (eg. `&WIDTH=700`)
 * 
 * @param name
 * @param value
 * 
 * @returns { string | null } a string if value is set or null
 */
function __(name, value) {
  return (value || 0 === value) ? `${name}${value}` : null;
}

/**
 * @TODO merge "RasterLayer" class into "ImageLayer"
 * 
 * ORIGINAL SOURCE: src/app/core/layers/map/maplayer.js@v3.10.1
 * ORIGINAL SOURCE: src/app/core/layers/map/wmslayer.js@v3.10.1
 * ORIGINAL SOURCE: src/app/core/layers/map/wmstlayer.js@v3.10.1
 * ORIGINAL SOURCE: src/app/core/layers/map/xyzlayer.js@v3.10.1
 * ORIGINAL SOURCE: src/app/core/layers/map/arcgismapserverlayer.js@v3.10.1
 */
class RasterLayer extends G3WObject {

  constructor(config = {}, extraParams = {}, method = 'GET') {
    super();

    this.config                 = config;
    this.id                     = config.id;
    this.iframe_internal        = config.iframe_internal || false;
    this.extent                 = config.extent;
    this.projection             = config.projection;
    this.layer                  = null;
    this.layers                 = config.layers || []; // store all enabled layers
    this.allLayers              = []; // store all layers
    this.showSpinnerWhenLoading = true;

    if ('XYZ' !== this.config.type) {
      this.LAYERTYPE = {
        LAYER:      'layer',
        MULTILAYER: 'multilayer'
      };
      this.getInfoFormat = () => 'application/vnd.ogc.gml';
      this.getGetFeatureInfoUrl = (coordinate, resolution, epsg, params) => this.getOLLayer().getSource().getGetFeatureInfoUrl(coordinate,resolution,epsg,params);
      this.getQueryUrl = () => {
        if (this.layers[0].infourl && '' !== this.layers[0].infourl) {
          return this.layers[0].infourl;
        }
        return this.config.url;
      };
    }

    this.extraParams = extraParams;

    this._method     = method;
  }

  getId() {
    return this.id;
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

  getLayerConfigs() {
    return this.layers;
  }

  addLayer(layer) {
    if (!this.allLayers.find(l => layer === l)) { this.allLayers.push(layer); }
    if (!this.layers.find(l => layer === l))    { this.layers.push(layer); }
    if ('XYZ' === this.config.type)             { this.layer = layer; }
  }

  removeLayer(layer) {
    this.layers = this.layers.filter(l => layer !== l);
  }

  isVisible() {
    return this.layers.filter(l => l.isVisible()).length > 0;
  }

  /**
   * @param {boolean} withLayers
   * 
   * @returns { RasterLayer._makeOlLayer }
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
    if ('ARCGISMAPSERVER' === this.config.type) {
      olLayer = new ol.layer.Tile({
        visible: true,
        source:  new ol.source.TileArcGISRest({
          url:          this.config.url,
          projection:   this.config.projection,
        }),
      });
    }

    // WMTS LAYER
    else if ('WMTS' === this.config.type) {
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
      const resolutions = 'mapproxy' === layerObj.cache_provider && ol.tilegrid.createXYZ({ extent: layerObj.cache_grid_extent }).getResolutions();
  
      olLayer = resolutions
        ? new ol.layer.Tile({
          source: new ol.source.WMTS({
            url:         layerObj.url,
            layer:       layerObj.cache_layer,
            matrixSet:   layerObj.cache_grid,
            format:      layerObj.cache_format || 'png',
            projection:  layerObj.layers[0].getProjection(),
            tileGrid:    new ol.tilegrid.WMTS({
                           resolutions,
                           origin:    ol.extent.getTopLeft(layerObj.cache_grid_extent),
                           matrixIds: resolutions.map((_, i) => i),
                         }),
            style:       layerObj.style || '',
            transparent: false,
          })
        })
        : RasterLayer._makeOlLayer({
          layerObj,
          extraParams: this.extraParams || {},
          tiled:       true
        }); 
    }

    // XYZ LAYER
    else if ('XYZ' === this.config.type) {
      const projection = this.config.url && this.projection ? this.projection : this.layer.getProjection();

      olLayer = new ol.layer.Tile({
        visible:    true,
        projection,
        source:     new ol.source.XYZ({
          url:              this.config.url,
          maxZoom:          20,
          minZoom:          undefined,
          projection,
          crossOrigin:      undefined,
          tileLoadFunction: (this.iframe_internal) ? (tile, url) => {
            fetch('POST' === method ? (url || '').split('?')[0] : url, {
              method,
              headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
              body:    'POST' === method ? url.split('?')[1] : undefined,
            })
            .then(async response => tile.getImage().src = window.URL.createObjectURL(await response.blob()))
            .catch(e => { console.error('Invalid tile', ol.TileState.ERROR, e); tile.setState(ol.TileState.ERROR); });
          } : undefined,
          /** @since 3.10.0 - Map Proxy cache_provider **/
          tileGrid: ('degrees' === projection.getUnits() || 'mapproxy' === this.config.cache_provider) ? new ol.tilegrid.TileGrid({
            // Need to remove the first resolution because in this version of ol createXYZ doesn't accept maxResolution options.
            // The extent of EPSG:4326 is not squared [-180, -90, 180, 90] as EPSG:3857 so the resolution is calculated
            // by Math.max(width(extent)/tileSize,Height(extent)/tileSize)
            // we need to calculate to Math.min instead, so we have to remove the first resolution
            resolutions: ol.tilegrid.createXYZ({ extent: projection.getExtent(), maxZoom: 20 }).getResolutions().slice(1),
            extent:      projection.getExtent(),
          }) : undefined,
        })
      });

    }

    // WMS LAYER
    else {
      olLayer = RasterLayer._makeOlLayer({
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
  update(mapState = {}, extraParams = {}) {
    let { force, ...params } = extraParams;

    // check which layers have to be disabled
    if (!force) {
      const { resolution, mapUnits } = mapState;
      this.allLayers.forEach(l => { l.setDisabled(resolution, mapUnits); return l.isDisabled(); });
    }

    if ('XYZ' === this.config.type) {
      this._olLayer.setVisible(this.layer.isVisible());
      return;
    }
    
    const layers = this.layers.filter(l => l.isVisible()) || [];

    // skip when ..
    if (layers.length <= 0) {
      this._olLayer.setVisible(false);
      return;
    }

    const STYLES     = [];
    const OPACITIES  = [];
    let LEGEND_ON    = undefined;
    let LEGEND_OFF   = undefined;

    layers.forEach(l => {
      const { LEGEND_ON: on, LEGEND_OFF: off } = get_legend_params(l);
      STYLES.push(l.getStyle());
      OPACITIES.push(parseInt((l.getOpacity() / 100) * 255));
      if (on)  { LEGEND_ON  = undefined === LEGEND_ON  ? on  : `${LEGEND_ON};${on}` }
      if (off) { LEGEND_OFF = undefined === LEGEND_OFF ? off : `${LEGEND_OFF};${off}` }
    })

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

  setupCustomMapParamsToLegendUrl(params = {}) {
    if ('XYZ' !== this.config.type) {
      [].concat(this.layer || this.layers).forEach(l => l.setMapParamstoLegendUrl(params));
    }
  }

}

/**
 * ORIGINAL SOURCE: src/app/g3w-ol/layers/rasters.js@v3.10.0
 * 
 * @since 3.11.0
 */
RasterLayer._makeOlLayer = function(opts = {}, method = 'GET') {
  return new (opts.tiled ? ol.layer.Tile : ol.layer.Image)({
    id:            opts.layerObj.id,
    name:          opts.layerObj.name,
    opacity:       undefined !== opts.layerObj.opacity ? opts.layerObj.opacity : 1.0,
    visible:       opts.layerObj.visible,
    extent:        opts.layerObj.extent,
    maxResolution: opts.layerObj.maxResolution,
    source:        new (opts.tiled ? ol.source.TileWMS : ol.source.ImageWMS)({
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
          .filter(([key, val]) => ('FORMAT' !== key ? true : undefined !== val))
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

/**
 * @param config.id
 * @param config.title
 * @param config.name
 * @param config.origname
 * @param config.multilayerid
 * @param config.servertype
 * @param config.source
 * @param config.crs
 * @param config.projection
 * @param config.bbox
 * @param config.capabilities
 * @param config.cache_url
 * @param { string } config.cache_provider since 3.10.0 (eg. "mapproxy")
 * @param config.baselayer
 * @param config.geometrytype
 * @param config.editops
 * @param config.expanded
 * @param config.fields
 * @param config.wmsUrl
 * @param config.infoformat
 * @param config.infourl
 * @param config.maxscale
 * @param config.minscale
 * @param config.visible
 * @param config.scalebasedvisibility
 * @param config.wfscapabilities
 * @param config.ows_method
 * @param config.wms_use_layer_ids
 * @param config.styles
 */
class ImageLayer extends GeoLayerMixin(Layer) {
  
  constructor(config = {}, options = {}) {

    super(config, options);

    this.setters = {
      change(){},
    };

    this.config.baselayer = config.baselayer || false;
    this.type             = Layer.LayerTypes.IMAGE;
    this.legendUrl        = null;
    this.customParams     = {};

    this.setup(config, options);

    /**
     * ORIGINAL SOURCE: src/app/core/layers/baselayer.js@v3.10.0
     * 
     * @since 3.11.0
     */
    if (this._makeOlLayer && this.isWMS()) {
      this._mapLayer = new RasterLayer({
        url:   this.getWmsUrl(),
        id:    this.state.id,
        tiled: this.state.tiled,
      });
      this._mapLayer.addLayer(this);
    } else if (this._makeOlLayer) {
      this._mapLayer = this;
    }
  }

  /**
   *
   * Used by the following plugins: "plugin"
   * @TODO Move it on  https://github.com/g3w-suite/g3w-client-plugin-editing
   *
   *
   * @param force
   * @param vectorurl
   * @param project_type
   * @param project
   * @return {Promise<any|null>}
   */
  async getLayerForEditing({
    force = false,
    vectorurl,
    project_type,
    project
  } = {}) {

    if (!force && !this.isEditable()) {
      return null;
    }

    // set editing layer
    try {
      const layerForEditing  = await new VectorLayer(this.config, {
        vectorurl,
        project_type,
        project: project || ProjectsRegistry.getCurrentProject(),
      }).layerForEditing;
      this.setEditingLayer(layerForEditing);
      return layerForEditing;
    } catch(e) {
      console.warn(e);
      return Promise.reject(e);
    }

  }

  isBaseLayer() {
    return this.config.baselayer;
  }

  isWMS() {
    return ImageLayer.WMSServerTypes.includes(this.config.servertype);
  }

  isLayerProjectionASMapProjection() {
    return this.config.crs.epsg === this.config.map_crs;
  }

  getCrs() {
    return this.config.crs.epsg;
  }

  isExternalWMS() {
    return !!(this.config.source && this.config.source.external && this.config.source.url);
  }

  isArcgisMapserver() {
    return this.isExternalWMS() && Layer.SourceTypes.ARCGISMAPSERVER === this.config.source.type;
  }

  _getBaseLayerName() {
    return this.isWmsUseLayerIds()
      ? this.getId()
      : this.getName();
  }

  /**
   * @since 3.9.0
   */
  _hasExternalWMSOrLegend(type = 'map') {
    const { source } = this.config;

    return (
        source && (
        ('map' !== type || (this.isExternalWMS() && this.isLayerProjectionASMapProjection())) &&
        ('legend' === type || source.external)
      )
    );
  }

  getWMSLayerName({ type = 'map' } = {}) {
    const { source }   = this.config || ({ source: {} });
    const source_layer = source.layers || source.layer;

    /** @FIXME add description */
    if (source_layer && this._hasExternalWMSOrLegend(type)) {
      return source_layer;
    }

    return this._getBaseLayerName();
  }

  /**
   * @param opts
   * @param { 'map' | 'legend' } opts.type 
   */
  getWmsUrl({ type = 'map' } = {}) {
    const { source } = this.config || ({ source: {} });

    /** @FIXME add description */
    if (source.url && this._hasExternalWMSOrLegend(type) && ['wms', 'wmst'].includes(source.type)) {
      return source.url;
    }

    return this.config.wmsUrl;
  }

  getWFSLayerName() {
    return (
      (this.config.infolayer && '' !== this.config.infolayer)
        ? this.config.infolayer
        : this.getName()
    ).replace(/\s/g, '_').replaceAll( ':', '-' );
  }

  useProxy() {
    return this.isExternalWMS() && this.isLayerProjectionASMapProjection() && this.getInfoFormats();
  }

  getWMSInfoLayerName() {
    return this.useProxy()
      ? this.getSource().layers
      : this._getBaseLayerName();
  }

  getPrintLayerName() {
    return this.isWmsUseLayerIds()
      ? this.getId()
      : this.getName();
  }

  getStringBBox() {
    const { minx, miny, maxx, maxy } = this.config.bbox;
    return `${minx},${miny},${maxx},${maxy}`;
  }

  isWfsActive() {
    return Array.isArray(this.config.ows) && this.config.ows.some(t => 'WFS' === t);
  }

  /**
   * Get wms url of the layer
   */
  getFullWmsUrl() {
    const { wms_url } = ProjectsRegistry.getCurrentProject().getState().metadata;

    /** @FIXME add description */
    if (wms_url && !this.isExternalWMS()) {
      return wms_url;
    }

    return this.getWmsUrl();
  }

  /**
   * Get WMS url (used by Catalog Layer Menu) 
   */
  getCatalogWmsUrl() {
    const { wms_url } = ProjectsRegistry.getCurrentProject().getMetadata();

    /** @FIXME add description */
    if (wms_url && !this.isExternalWMS()) {
      return wms_url;
    }

    return `${this.getWmsUrl()}?service=WMS&version=1.3.0&request=GetCapabilities`;
  }

  /**
   * Get WFS url (used by Catalog Layer Menu)  
   */
  getCatalogWfsUrl(){
    return `${this.getWfsUrl()}?service=WFS&version=1.1.0&request=GetCapabilities`;
  }

  /**
   * Get WFS 3 url (used by Catalog Layer Menu)
   * @since 3.10.0
   * @return { String } url
   */
  getCatalogWfs3Url() {
    return `${this.getWfsUrl()}wfs3/`;
  }

  getWfsUrl() {
    const { wms_url } = ProjectsRegistry.getCurrentProject().getMetadata();

    /** @FIXME add description */
    if (wms_url) {
      return wms_url;
    }

    return this.config.wmsUrl;
  }

  /**
   * Get query url based on type, external or same projection of map
   * 
   * @returns {string}
   */
  getQueryUrl() {
    const url       = super.getQueryUrl();
    const is_qgis = (
      Layer.ServerTypes.QGIS === this.getServerType()
      && this.isExternalWMS()
      && this.isLayerProjectionASMapProjection()
    );

    /** @FIXME add description */
    if (is_qgis && this.getInfoFormats()) {
      return this.getSource().url;
    }

    /** @FIXME add description */
    if (is_qgis) {
      return `${url}SOURCE=${this.config.source.type}`;
    }

    return url;
  }

  getIconUrlFromLegend() {
    return this.getLegendUrl({ layertitle: false });
  }

  /**
   * Retrieve legend url (ARCGISMAPSERVER or WMS)
   * 
   * ORIGINAL SOURCE: src/app/core/layers/legend/legendservice.js@3.8.5
   * 
   * @param { boolean }                                    opts.categories whether layer has categories
   * @param { boolean }                                    opts.all        whether to show all categories (disables filter by map's BBOX).
   * @param { 'application/json' | 'image/png' | string }  opts.format     MIME Type used to set format of legend:
   *                                                                          - `application/json`: if request from layers categories (icon and label),
   *                                                                          - `image/png`: if request from legend tab
   * 
   * @see https://docs.qgis.org/3.28/en/docs/server_manual/services/wms.html#getlegendgraphics
   */
  getLegendUrl(params = {}, opts = {categories:false,  all:false,format:'image/png',}) {

    let base_url, url_params;

    let {
      width,
      height,
      color       = "white",
      fontsize    = 10,
      transparent = true,
      boxspace,
      layerspace,
      layertitle  = true,
      layertitlespace,
      symbolspace,
      iconlabelspace,
      symbolwidth,
      symbolheight,
      itemfontfamily,
      layerfontfamily,
      layerfontbold,
      itemfontbold,
      layerfontitalic,
      itemfontitalic,
      rulelabel,
      crs,
      bbox,
      sld_version = '1.1.0',
    } = {
      ...params,
      ...this.customParams
    };

    /**
     * ARCGIS Server
     * 
     * ORIGINAL SOURCE: src/app/core/layers/legend/arcgismapserverlegend.js@3.8.5
     */
    if (this.isArcgisMapserver()) {
      base_url   = this.getConfig().source.url.replace('/rest/', '/') + '/WMSServer';
      url_params = [
        'request=GetLegendGraphic',
        'version=1.3.0',
        'format=image/png',
        `LAYER=${this.getConfig().source.layer}`,
      ];
    }

    /**
     * WMS Server
     * 
     * ORIGINAL SOURCE: src/app/core/layers/legend/wmslegend.js@3.8.5
     */
    else {
      const ctx_legend = (
        opts.categories && (['image/png', undefined].includes(opts.format) || ProjectsRegistry.getCurrentProject().getContextBaseLegend())
          ? get_legend_params(this)
          : undefined // disabled when `FORMAT=application/json` (otherwise it creates some strange behaviour on WMS `getMap` when switching between layer styles)
      );
      base_url   = this.getWmsUrl({ type: 'legend' });
      url_params = [
        'SERVICE=WMS',
        'VERSION=1.3.0',
        'REQUEST=GetLegendGraphic',
        __('SLD_VERSION=',     sld_version),
        __('WIDTH=',           width),
        __('HEIGHT=',          height),
        __('FORMAT=',          (undefined === opts.format ? 'image/png' : opts.format)),
        __('TRANSPARENT=',     transparent),
        __('ITEMFONTCOLOR=',   color),
        __('LAYERFONTCOLOR=',  color),
        __('LAYERTITLE=',      layertitle),
        __('ITEMFONTSIZE=',    fontsize),
        __('CRS=',             crs),
        __('BBOX=',            ([false, undefined].includes(opts.all) && bbox && bbox.join(','))),
        __('BOXSPACE=',        boxspace),
        __('LAYERSPACE=',      layerspace),
        __('LAYERTITLESPACE=', layertitlespace),
        __('SYMBOLSPACE=',     symbolspace),
        __('ICONLABELSPACE=',  iconlabelspace),
        __('SYMBOLWIDTH=',     (opts.categories && 'application/json' === opts.format ? 16 : symbolwidth)),
        __('SYMBOLHEIGHT=',    (opts.categories && 'application/json' === opts.format ? 16 : symbolheight)),
        __('LAYERFONTFAMILY=', layerfontfamily),
        __('ITEMFONTFAMILY=',  itemfontfamily),
        __('LAYERFONTBOLD=',   layerfontbold),
        __('ITEMFONTBOLD=',    itemfontbold),
        __('LAYERFONTITALIC=', layerfontitalic),
        __('ITEMFONTITALIC=',  itemfontitalic),
        __('RULELABEL=',       rulelabel),
        __('LEGEND_ON=',       ctx_legend && ctx_legend.LEGEND_ON),
        __('LEGEND_OFF=',      ctx_legend && ctx_legend.LEGEND_OFF),
        __('STYLES=',          (opts.categories && 'application/json' === opts.format ? encodeURIComponent(this.getCurrentStyle().name) : undefined)),
        __('LAYER=',           this.getWMSLayerName({ type: 'legend' }))
      ]; 
    }

    // discard nullish parameters (without a value)
    url_params = url_params.filter(p => p)

    this.legendUrl = `${base_url}${(base_url.indexOf('?') > -1 ? '&' : '?')}${url_params.join('&')}`;

    return this.legendUrl;
  }

  setMapParamstoLegendUrl({ bbox, crs }) {
    this.customParams = { ...this.customParams, bbox, crs };
  }

  getWfsCapabilities() {
    return this.config.wfscapabilities || 1 === this.config.capabilities;
  }

  getMapLayer(options = {}, extraParams) {

    /**
     * ORIGINAL SOURCE: src/app/core/layers/baselayer.js@v3.10.0
     * 
     * @since 3.11.0
     */
    if (this._mapLayer) {
      return this._mapLayer;
    }

    options.iframe_internal   = ApplicationService.isIframe() && !this.isExternalWMS();
    const method              = this.isExternalWMS() ? 'GET' : this.getOwsMethod();
    const extent              = (this.config.bbox ? [this.config.bbox.minx, this.config.bbox.miny, this.config.bbox.maxx, this.config.bbox.maxy] : null);
    const source              = this.config.source;
    /** @since  3.10.0 Cache info **/
    const cache_provider      = this.config.cache_provider;
    const cache_service_type  = this.config.cache_service_type || 'tms'; //default tile
    const cache_layer         = this.config.cache_layer;
    const cache_extent        = this.config.cache_extent;
    const cache_grid          = this.config.cache_grid;
    const cache_grid_extent   = this.config.cache_grid_extent;
    //get layer url
    const url                 = this.isCached() ? this.getCacheUrl() : (options.url || this.getWmsUrl());

    if (this.isCached() && 'tms' === cache_service_type) {
      return new RasterLayer({ ...options, extent, url, cache_provider, type: 'XYZ' }, {}, method);
    }

    if (this.isExternalWMS() && source && Layer.SourceTypes.ARCGISMAPSERVER === source.type) {
      return new RasterLayer({ ...options, ...source }, extraParams)
    }

    if (this.isCached() && 'wmts' === cache_service_type) {
      return new RasterLayer({
        ...options,
        url,
        cache_provider,
        cache_layer,
        cache_extent,
        cache_grid,
        cache_grid_extent,
        type: 'WMTS',
      }, extraParams, method);
    }

    if (this.isExternalWMS() && source && Layer.SourceTypes.WMST === source.type) {
      return new RasterLayer({...options, url, cache_provider, type: 'WMTS', }, extraParams, method);
    }

    return new RasterLayer({ ...options, url }, extraParams, method);
  }

  /**
   * @override Layer~getFormat
   * 
   * @since 3.9.1
   */
  getFormat() {
    if (this.isExternalWMS() && this.getSource()) {
      return this.getSource().format;
    }
    return super.getFormat();
  }

  /**
   * @override ImageLayer~getOwsMethod
   * 
   * @see https://github.com/g3w-suite/g3w-client/issues/616
   * 
   * forces to `GET` when wms layer is external or query url isn't a qgis server endpoint (ie. doesn't start with `/ows/`).
   * 
   * @since 3.10.0
   */
  getOwsMethod() {
    return this.isExternalWMS() || !/^\/ows/.test((new URL(this.getQueryUrl(), window.initConfig.baseurl)).pathname)
      ? 'GET'
      : this.config.ows_method;
  }

  /**
   * ORIGINAL SOURCE: src/app/core/layers/baselayer.js@v3.10.0
   * 
   * @since 3.11.0
   */
  update(mapState, extraParams) {
    if (this.isWMS()) {
      this._mapLayer.update(mapState, extraParams)
    }
  }

  /**
   * ORIGINAL SOURCE: src/app/core/layers/baselayer.js@v3.10.0
   * 
   * @since 3.11.0
   */
  setVisible(bool) {
    if (this._mapLayer) {
      this.getOLLayer().setVisible(bool)
    }
    return super.setVisible(bool);
  }

  /**
   * ORIGINAL SOURCE: src/app/core/layers/baselayer.js@v3.10.0
   * 
   * @since 3.11.0
   */
  getSource() {
    if (this._mapLayer) {
      return this.getOLLayer().getSource();
    }
    return super.getSource();
  }

  /**
   * ORIGINAL SOURCE: src/app/core/layers/baselayer.js@v3.10.0
   * 
   * @since 3.11.0
   */
  getProjectionFromCrs(crs = {}) {
    crs.epsg = crs.epsg ? crs.epsg : 'EPSG:3857';
    return Projections.get(crs);
  }

  /**
   * ORIGINAL SOURCE: src/app/core/layers/baselayer.js@v3.10.0
   * 
   * @since 3.11.0
   */
  getOLLayer() {
    if (!this._olLayer && this._makeOlLayer) {
      this._olLayer = this._makeOlLayer();
      // register loading event
      this._olLayer.getSource().on('imageloadstart', () => this.emit("loadstart"));
      this._olLayer.getSource().on('imageloadend',   () => this.emit("loadend"));
      if (this._mapLayer.config.attributions) {
        this._olLayer.getSource().setAttributions(this._mapLayer.config.attributions);
      }
      this._olLayer.setVisible(this._mapLayer.state.visible)
    }
    return this._olLayer;
  }

}

ImageLayer.WMSServerTypes = [
  Layer.ServerTypes.QGIS,
  Layer.ServerTypes.Mapserver,
  Layer.ServerTypes.Geoserver,
  Layer.ServerTypes.OGC,
];

module.exports = {
  ImageLayer,
  WMSLayer: RasterLayer
};
