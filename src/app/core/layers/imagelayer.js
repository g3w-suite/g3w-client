import ProjectsRegistry                   from 'store/projects';
import ApplicationService                 from 'services/application';

const { base, inherit, mixin }            = require('core/utils/utils');
const Layer                               = require('core/layers/layer');
const VectorLayer                         = require('core/layers/vectorlayer');
const WMSLayer                            = require('core/layers/map/wmslayer');
const WMSTLayer                           = require('core/layers/map/wmstlayer');
const ARCGISMAPSERVERLayer                = require('core/layers/map/arcgismapserverlayer');
const XYZLayer                            = require('core/layers/map/xyzlayer');
const { get_LEGEND_ON_LEGEND_OFF_Params } = require('core/utils/geo');
const GeoLayerMixin                       = require('core/layers/geolayermixin');

/**
 * Stringify a query URL param (eg. `&WIDTH=700`)
 */

/**
 * Utility function that return a string if value is set or null
 * @param name
 * @param value
 * @returns {string|null}
 * @private
 */
function __(name, value) {
  return value ? `${name}${value}` : null;
}

function ImageLayer(config={}, options={}) {
  /*{
    id,
    title,
    name,
    origname,
    multilayerid,
    servertype,
    source,
    crs,
    projection,
    bbox,
    capabilities,
    cache_url,
    baselayer,
    geometrytype,
    editops,
    expanded,
    fields,
    wmsUrl,
    infoformat,
    infourl,
    maxscale,
    minscale,
    visible,
    scalebasedvisibility,
    wfscapabilities
    ows_method
    wms_use_layer_ids,
    styles
  }*/

  this.setters = {
    change(){},
  };

  base(this, config, options);

  this.config.baselayer = config.baselayer || false;
  this.type             = Layer.LayerTypes.IMAGE;
  this.legendUrl        = null;
  this.customParams     = {};

  this.setup(config, options);
}

inherit(ImageLayer, Layer);

mixin(ImageLayer, GeoLayerMixin);

const proto = ImageLayer.prototype;

proto.getLayerForEditing = async function({
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

};

proto.isBaseLayer = function() {
  return this.config.baselayer;
};

proto.isWMS = function() {
  return ImageLayer.WMSServerTypes.indexOf(this.config.servertype) > -1;
};

proto.isLayerProjectionASMapProjection = function() {
  return this.config.crs.epsg === this.config.map_crs;
};

proto.getCrs = function() {
  return this.config.crs.epsg;
};

proto.isExternalWMS = function() {
  return !!(this.config.source && this.config.source.external && this.config.source.url);
};

proto.isArcgisMapserver = function() {
  return this.isExternalWMS() && this.config.source.type === Layer.SourceTypes.ARCGISMAPSERVER;
};

proto._getBaseLayerName = function() {
  return this.isWmsUseLayerIds()
    ? this.getId()
    : this.getName();
};

/**
 * @since 3.9.0
 */
proto._hasExternalWMSOrLegend = function(type = 'map') {
  const { source } = this.config;

  return (
      source && (
      ('map' !== type || (this.isExternalWMS() && this.isLayerProjectionASMapProjection())) &&
      ('legend' === type || source.external)
    )
  );
};

proto.getWMSLayerName = function({ type = 'map' } = {}) {
  const { source }   = this.config || ({ source: {} });
  const source_layer = source.layers || source.layer;

  /** @FIXME add description */
  if (source_layer && this._hasExternalWMSOrLegend(type)) {
    return source_layer;
  }

  return this._getBaseLayerName();
};

/**
 * @param { 'map' | 'legend' } opts.type 
 */
proto.getWmsUrl = function({ type = 'map' } = {}) {
  const { source } = this.config || ({ source: {} });

  /** @FIXME add description */
  if (source.url && this._hasExternalWMSOrLegend(type) && ['wms', 'wmst'].includes(source.type)) {
    return source.url;
  }

  return this.config.wmsUrl;
};

proto.getWFSLayerName = function(){
  return this.getQueryLayerName().replace(/[/\s]/g, '_')
};

proto.useProxy = function(){
  return this.isExternalWMS() && this.isLayerProjectionASMapProjection() && this.getInfoFormats();
};

proto.getWMSInfoLayerName = function() {
  return this.useProxy()
    ? this.getSource().layers
    : this._getBaseLayerName();
};

proto.getPrintLayerName = function() {
  return this.isWmsUseLayerIds()
    ? this.getId()
    : this.getName();
};

proto.getStringBBox = function() {
  const { minx, miny, maxx, maxy } = this.config.bbox;
  return `${minx},${miny},${maxx},${maxy}`;
};

proto.isWfsActive = function() {
  return Array.isArray(this.config.ows) && this.config.ows.some(type => 'WFS' === type);
};

/**
 * Get wms url of the layer
 */
proto.getFullWmsUrl = function() {
  const { wms_url } = ProjectsRegistry.getCurrentProject().getState().metadata;

  /** @FIXME add description */
  if (wms_url && !this.isExternalWMS()) {
    return wms_url;
  }

  return this.getWmsUrl();
};

/**
 * Get WMS url (used by Catalog Layer Menu) 
 */
proto.getCatalogWmsUrl = function() {
  const { wms_url } = ProjectsRegistry.getCurrentProject().getMetadata().wms_url;

  /** @FIXME add description */
  if (wms_url && !this.isExternalWMS()) {
    return wms_url;
  }

  return `${this.getWmsUrl()}?service=WMS&version=1.3.0&request=GetCapabilities`;
};

/**
 * Get WFS url (used by Catalog Layer Menu)  
 */
proto.getCatalogWfsUrl = function(){
  return `${this.getWfsUrl()}?service=WFS&version=1.1.0&request=GetCapabilities`;
};


proto.getWfsUrl = function() {
  const { wms_url } = ProjectsRegistry.getCurrentProject().getMetadata();

  /** @FIXME add description */
  if (wms_url) {
    return wms_url;
  }

  return this.config.wmsUrl;
};


/**
 * Get query url based on type, external or same projection of map
 * 
 * @returns {string}
 */
proto.getQueryUrl = function() {
  const url       = base(this, 'getQueryUrl');
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
};

proto.getIconUrlFromLegend = function() {
  return this.getLegendUrl({ layertitle: false });
};

/**
 * Retrieve legend url (ARCGISMAPSERVER or WMS)
 * 
 * ORIGINAL SOURCE: src/app/core/layers/legend/legendservice.js@3.8.5
 * 
 * @param {boolean}                                    opts.categories whether layer has categories
 * @param {boolean}                                    opts.all        whether to show all categories (disables filter by map's BBOX).
 * @param {'application/json' | 'image/png' | string}  opts.format     MIME Type used to set format of legend:
 *                                                                          - `application/json`: if request from layers categories (icon and label),
 *                                                                          - `image/png`: if request from legend tab
 * 
 * @see https://docs.qgis.org/3.28/en/docs/server_manual/services/wms.html#getlegendgraphics
 */
proto.getLegendUrl = function(params = {}, opts = {}) {

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


  const {

    /**
     * If layer has categories or not.
     *
     * @type {Boolean}
     */
    categories=false,

    /**
     * All categories. No filter by BBOX of map.
     *
     * @type {Boolean}
     */
    all=false,

    /**
     * Mime Type used to set format of legend.
     *
     * `application/json` = if request from layers categories (icon and label)
     * `image/png`        = if request from legend tab
     *
     * @type {String}
     */
    format='image/png',

  } = opts;



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
      categories && (['image/png', undefined].includes(format) || ProjectsRegistry.getCurrentProject().getContextBaseLegend())
        ? get_LEGEND_ON_LEGEND_OFF_Params(this)
        : undefined // disabled when `FORMAT=application/json` (otherwise it create some strange behaviour on WMS `getMap` when switching between layer styles)   
    );
    base_url   = this.getWmsUrl({ type: 'legend' });
    url_params = [
      'SERVICE=WMS',
      'VERSION=1.3.0',
      'REQUEST=GetLegendGraphic',
      `SLD_VERSION=${sld_version}`,
      __('WIDTH=',           width),
      __('HEIGHT=',          height),
      `FORMAT=${(undefined === format ? 'image/png' : format)}`,
      `TRANSPARENT=${transparent}`,
      `ITEMFONTCOLOR=${color}`,
      `LAYERFONTCOLOR=${color}`,
      `LAYERTITLE=${layertitle}`,
      `ITEMFONTSIZE=${fontsize}`,
      __('CRS=',             crs),
      __('BBOX=',            (false === all && bbox && bbox.join(','))), // all mean no BBOX otherwise need to be filter categories by bbox
      __('BOXSPACE=',        boxspace),
      __('LAYERSPACE=',      layerspace),
      __('LAYERTITLESPACE=', layertitlespace),
      __('SYMBOLSPACE=',     symbolspace),
      __('ICONLABELSPACE=',  iconlabelspace),
      __('SYMBOLWIDTH=',     (categories && 'application/json' === format ? 16 : symbolwidth)),
      __('SYMBOLHEIGHT=',    (categories && 'application/json' === format ? 16 : symbolheight)),
      __('LAYERFONTFAMILY=', layerfontfamily),
      __('ITEMFONTFAMILY=',  itemfontfamily),
      __('LAYERFONTBOLD=',   layerfontbold),
      __('ITEMFONTBOLD=',    itemfontbold),
      __('LAYERFONTITALIC=', layerfontitalic),
      __('ITEMFONTITALIC=',  itemfontitalic),
      __('RULELABEL=',       rulelabel),
      __('LEGEND_ON=',       ctx_legend && ctx_legend.LEGEND_ON),
      __('LEGEND_OFF=',      ctx_legend && ctx_legend.LEGEND_OFF),
      __('STYLES=',          (categories && 'application/json' === format ? encodeURIComponent(this.getCurrentStyle().name) : undefined)),
      `LAYER=${this.getWMSLayerName({ type: 'legend' })}`
    ].filter(p => p); // need to filter only with value
  }

  this.legendUrl = `${base_url}${(base_url.indexOf('?') > -1 ? '&' : '?')}${url_params.join('&')}`;

  return this.legendUrl;
};

proto.setMapParamstoLegendUrl = function({ bbox, crs }) {
  this.customParams = { ...this.customParams, bbox, crs };
};

proto.getWfsCapabilities = function() {
  return this.config.wfscapabilities || 1 === this.config.capabilities;
};

proto.getMapLayer = function(options = {}, extraParams) {
  options.iframe_internal = ApplicationService.isIframe() && !this.isExternalWMS();
  const method            = this.isExternalWMS() ? 'GET' : this.getOwsMethod();
  const extent            = (this.config.bbox ? [this.config.bbox.minx, this.config.bbox.miny, this.config.bbox.maxx, this.config.bbox.maxy] : null);
  const url               = options.url || this.getWmsUrl();
  const source            = this.config.source;

  if (this.isCached()) {
    return new XYZLayer({ ...options, extent }, method);
  }

  if (this.isExternalWMS() && source && Layer.SourceTypes.ARCGISMAPSERVER === source.type) {
    return new ARCGISMAPSERVERLayer({ ...options, ...source }, extraParams)
  }

  if (this.isExternalWMS() && source && Layer.SourceTypes.WMST === source.type) {
    return new WMSTLayer({...options, url }, extraParams, method);
  }

  return new WMSLayer({ ...options, url }, extraParams, method);
};


ImageLayer.WMSServerTypes = [
  Layer.ServerTypes.QGIS,
  Layer.ServerTypes.Mapserver,
  Layer.ServerTypes.Geoserver,
  Layer.ServerTypes.OGC,
];

module.exports = ImageLayer;
