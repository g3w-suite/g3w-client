const {base, inherit, mixin } = require('core/utils/utils');
const Layer = require('core/layers/layer');
const VectorLayer = require('./vectorlayer');
const WMSLayer = require('./map/wmslayer');
const WMSTLayer = require('./map/wmstlayer');
const ARCGISMAPSERVERLayer = require('./map/arcgismapserverlayer');
const XYZLayer = require('./map/xyzlayer');
const LegendService = require('./legend/legendservice');
const GeoLayerMixin = require('./geolayermixin');

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
  this.type = Layer.LayerTypes.IMAGE;
  this.legendUrl = null;
  this.customParams = {};
  this.setup(config, options);
}

inherit(ImageLayer, Layer);

mixin(ImageLayer, GeoLayerMixin);

const proto = ImageLayer.prototype;

proto.getLayerForEditing = async function({force=false, vectorurl, project_type, project}={}) {
  if (this.isEditable() || force) {
    const project = project || require('core/project/projectsregistry').getCurrentProject();
    const editableLayer = new VectorLayer(this.config, {
      vectorurl,
      project_type,
      project
    });
    // set editing layer
    try {
      const editingLayer = await editableLayer.layerForEditing;
      this.setEditingLayer(editingLayer);
      return editingLayer
    } catch(err) {
      return Promise.reject(err);
    }
  } else return null
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
  return this.isWmsUseLayerIds() ? this.getId() : this.getName();
};

proto.getWMSLayerName = function({type='map'}={}) {
  const legendMapBoolean = type === 'map' ? this.isExternalWMS() && this.isLayerProjectionASMapProjection() : true;
  let layerName = this._getBaseLayerName();
  if (legendMapBoolean && this.config.source && (type === 'legend' ||this.config.source.external) && (this.config.source.layers || this.config.source.layer)) {
    layerName = this.config.source.layers || this.config.source.layer;
  }
  return layerName;
};

proto.getWFSLayerName = function(){
  return this.getQueryLayerName().replace(/[/\s]/g, '_')
};

proto.useProxy = function(){
  return this.isExternalWMS() && this.isLayerProjectionASMapProjection() && this.getInfoFormats()
};

proto.getWMSInfoLayerName = function() {
  if ( this.isExternalWMS() && this.isLayerProjectionASMapProjection() && this.getInfoFormats()) {
    return this.getSource().layers;
  } else return this._getBaseLayerName();
};

proto.getPrintLayerName = function() {
  return this.isWmsUseLayerIds() ? this.getId() : this.getName();
};

proto.getStringBBox = function() {
  const bbox = this.config.bbox;
  return `${bbox.minx},${bbox.miny},${bbox.maxx},${bbox.maxy}`;
};

proto.getFullWmsUrl = function() {
  const ProjectsRegistry = require('core/project/projectsregistry');
  const metadata_wms_url = ProjectsRegistry.getCurrentProject().getState().metadata.wms_url;
  return this.isExternalWMS() || !metadata_wms_url ? this.getWmsUrl() : metadata_wms_url ;
};

//used to Catalog layer menu
proto.getCatalogWmsUrl = function(){
  const ProjectsRegistry = require('core/project/projectsregistry');
  const metadata_wms_url = ProjectsRegistry.getCurrentProject().getState().metadata.wms_url;
  return this.isExternalWMS() || !metadata_wms_url ? `${this.getWmsUrl()}?service=WMS&version=1.3.0&request=GetCapabilities` : metadata_wms_url ;
};

// values: map, legend
proto.getWmsUrl = function({type='map'}={}) {
  const legendMapBoolean = type === 'map' ? this.isExternalWMS() && this.isLayerProjectionASMapProjection() : true;
  const wmsUrl = (legendMapBoolean &&
    this.config.source &&
    (type === 'legend' || this.config.source.external) &&
    (this.config.source.type === 'wms' || this.config.source.type === 'wmst') &&
    this.config.source.url) ?
    this.config.source.url :
    this.config.wmsUrl;
  return wmsUrl
};

/**
 * Get query url based on type, external or same projection of map
 * @returns {string}
 */
proto.getQueryUrl = function() {
  let url = base(this, 'getQueryUrl');
  if (this.getServerType() === Layer.ServerTypes.QGIS && this.isExternalWMS() && this.isLayerProjectionASMapProjection()) {
    if (this.getInfoFormats()) url = this.getSource().url;
    else url =`${url}SOURCE=${this.config.source.type}`;
  }
  return url;
};

proto.getIconUrlFromLegend = function() {
  return this.getLegendUrl({
    layertitle: false
  })
};

proto.getLegendUrl = function(params={}, options={}) {
  this.legendUrl = LegendService.get({
    layer: this,
    params: {
      ...params,
      ...this.customParams
    },
    options
  });
  return this.legendUrl;
};

proto.setMapParamstoLegendUrl = function({bbox, crs}){
  this.customParams = {
    ...this.customParams,
    bbox,
    crs
  }
};

proto.getWfsCapabilities = function() {
  return this.config.wfscapabilities || this.config.capabilities === 1 ;
};

proto.getMapLayer = function(options={}, extraParams) {
  const ApplicationService = require('core/applicationservice');
  const iframe_internal = ApplicationService.isIframe() && !this.isExternalWMS();
  options.iframe_internal = iframe_internal;
  let mapLayer;
  const method = this.isExternalWMS() ? 'GET' : this.getOwsMethod();
  if (this.isCached()) {
    options.extent = this.config.bbox ? [this.config.bbox.minx, this.config.bbox.miny, this.config.bbox.maxx, this.config.bbox.maxy] : null;
    mapLayer = new XYZLayer(options, method);
  } else {
    if (this.isExternalWMS() && this.config.source && this.config.source.type === Layer.SourceTypes.ARCGISMAPSERVER) {
      options = {
        ...options,
        ...this.config.source,
      };
      mapLayer = new ARCGISMAPSERVERLayer(options, extraParams)
    } else {
      options.url = options.url || this.getWmsUrl();
      /** check in case WMST Layer
       *
       */
      if (this.isExternalWMS() && this.config.source && this.config.source.type === Layer.SourceTypes.WMST)
        mapLayer = new WMSTLayer(options, extraParams, method);
      else mapLayer = new WMSLayer(options, extraParams, method);
    }
  }
  return mapLayer;
};


ImageLayer.WMSServerTypes = [
  Layer.ServerTypes.QGIS,
  Layer.ServerTypes.Mapserver,
  Layer.ServerTypes.Geoserver,
  Layer.ServerTypes.OGC
];

module.exports = ImageLayer;
