import ProjectsRegistry       from 'store/projects';
import ApplicationService     from 'services/application';
import { get_legend_params }  from 'utils/get_legend_params';
import GeoLayerMixin          from 'core/layers/mixins/geo';

const Layer                   = require('core/layers/layer');
const VectorLayer             = require('core/layers/vectorlayer');
const WMSLayer                = require('core/layers/map/wmslayer');
const XYZLayer                = require('core/layers/map/xyzlayer');
const Projections             = require('g3w-ol/projection/projections');

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
  
  constructor(config={}, options={}) {

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
      this._mapLayer = new WMSLayer({
        url:   this.getWmsUrl(),
        id:    this.state.id,
        tiled: this.state.tiled,
      });
      this._mapLayer.addLayer(this);
    } else if(this._makeOlLayer) {
      this._mapLayer = this;
    }
  }

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
      return Promise.reject(e);
    }

  }

  isBaseLayer() {
    return this.config.baselayer;
  }

  isWMS() {
    return ImageLayer.WMSServerTypes.indexOf(this.config.servertype) > -1;
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
    return this.isExternalWMS() && this.config.source.type === Layer.SourceTypes.ARCGISMAPSERVER;
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
    const name = ((this.config.infolayer && this.config.infolayer !== '') ? this.config.infolayer : this.getName());
    return name.replace(/\s/g, '_').replaceAll( ':', '-' );
  }

  useProxy(){
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
    return Array.isArray(this.config.ows) && this.config.ows.some(type => 'WFS' === type);
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
  getCatalogWfs3Url(){
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
      Layer.ServerTypes.QGIS === this.getServerType() &&
      this.isExternalWMS() &&
      this.isLayerProjectionASMapProjection()
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
          : undefined // disabled when `FORMAT=application/json` (otherwise it create some strange behaviour on WMS `getMap` when switching between layer styles)   
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
      return new XYZLayer({ ...options, extent, url, cache_provider }, method);
    }

    if (this.isExternalWMS() && source && Layer.SourceTypes.ARCGISMAPSERVER === source.type) {
      return new WMSLayer({ ...options, ...source }, extraParams)
    }

    if (this.isCached() && 'wmts' === cache_service_type) {
      return new WMSLayer({
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
      return new WMSLayer({...options, url, cache_provider, type: 'WMTS', }, extraParams, method);
    }

    return new WMSLayer({ ...options, url }, extraParams, method);
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

module.exports = ImageLayer;
